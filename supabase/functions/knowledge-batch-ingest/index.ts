import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const EMBEDDING_MODEL = "google/gemini-2.5-flash-lite";
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ");
    if (chunk.trim()) chunks.push(chunk.trim());
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function generateEmbedding(text: string, lovableKey: string): Promise<number[]> {
  const response = await fetch(LOVABLE_AI_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      messages: [
        { role: "system", content: "You are an embedding generator. Given text, output exactly 768 floating point numbers between -1 and 1 separated by commas. Output ONLY the numbers." },
        { role: "user", content: text.slice(0, 2000) },
      ],
      tools: [{
        type: "function",
        function: {
          name: "store_embedding",
          description: "Store a 768-dimensional embedding vector",
          parameters: { type: "object", properties: { embedding: { type: "array", items: { type: "number" } } }, required: ["embedding"] },
        },
      }],
      tool_choice: { type: "function", function: { name: "store_embedding" } },
    }),
  });
  if (!response.ok) throw new Error(`Embedding failed (${response.status})`);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No embedding tool call");
  let embedding = JSON.parse(toolCall.function.arguments).embedding;
  if (!Array.isArray(embedding)) throw new Error("Invalid embedding");
  if (embedding.length < 768) embedding = [...embedding, ...new Array(768 - embedding.length).fill(0)];
  else if (embedding.length > 768) embedding = embedding.slice(0, 768);
  const maxAbs = Math.max(...embedding.map((v: number) => Math.abs(v)), 1);
  return embedding.map((v: number) => v / maxAbs);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY")!;

  try {
    const { urls, user_id } = await req.json();
    if (!urls?.length || !user_id) throw new Error("urls[] and user_id required");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const results: { url: string; status: string; chunks?: number; error?: string }[] = [];

    for (const url of urls) {
      console.log(`\nProcessing: ${url}`);
      try {
        // Scrape
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
        });
        if (!scrapeResp.ok) throw new Error(`Scrape failed (${scrapeResp.status})`);
        const scrapeData = await scrapeResp.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        if (!markdown || markdown.length < 20) throw new Error("No content");

        const title = scrapeData.data?.metadata?.title || new URL(url).hostname;
        const filePath = `${user_id}/url-${Date.now()}.md`;

        // Store markdown
        await adminClient.storage.from("knowledge_documents").upload(filePath, new Blob([markdown], { type: "text/markdown" }));

        // Create doc record
        const { data: doc, error: insertErr } = await adminClient
          .from("knowledge_documents")
          .insert({ user_id, filename: title, file_path: filePath, file_size: markdown.length, mime_type: "text/markdown", status: "processing", source_url: url })
          .select().single();
        if (insertErr) throw insertErr;

        // Chunk and embed
        const cleanText = markdown.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const chunks = chunkText(cleanText);
        let successCount = 0;

        for (let i = 0; i < chunks.length; i++) {
          try {
            const embedding = await generateEmbedding(chunks[i], lovableKey);
            await adminClient.from("knowledge_chunks").insert({
              document_id: doc.id, user_id, content: chunks[i], chunk_index: i,
              embedding: `[${embedding.join(",")}]`,
            });
            successCount++;
          } catch (e) { console.error(`Chunk ${i} failed:`, e); }
          if (i > 0 && i % 5 === 0) await new Promise(r => setTimeout(r, 1000));
        }

        await adminClient.from("knowledge_documents").update({ status: "ready", chunk_count: successCount }).eq("id", doc.id);
        console.log(`✅ ${url}: ${successCount} chunks`);
        results.push({ url, status: "ready", chunks: successCount });
      } catch (e) {
        console.error(`❌ ${url}:`, e);
        results.push({ url, status: "error", error: e instanceof Error ? e.message : "Unknown" });
      }
      // Rate limit delay
      await new Promise(r => setTimeout(r, 2000));
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
