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

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk.trim());
    i += chunkSize - overlap;
  }
  return chunks;
}

async function generateEmbedding(text: string, lovableKey: string): Promise<number[]> {
  const response = await fetch(LOVABLE_AI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an embedding generator. Given text, output exactly 768 floating point numbers between -1 and 1 separated by commas, representing a semantic embedding of the input text. Output ONLY the numbers, nothing else.",
        },
        { role: "user", content: text.slice(0, 2000) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "store_embedding",
            description: "Store a 768-dimensional embedding vector",
            parameters: {
              type: "object",
              properties: {
                embedding: {
                  type: "array",
                  items: { type: "number" },
                  description: "768-dimensional embedding vector with values between -1 and 1",
                },
              },
              required: ["embedding"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "store_embedding" } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No embedding tool call returned");

  const args = JSON.parse(toolCall.function.arguments);
  let embedding = args.embedding;

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Invalid embedding format");
  }

  if (embedding.length < 768) {
    embedding = [...embedding, ...new Array(768 - embedding.length).fill(0)];
  } else if (embedding.length > 768) {
    embedding = embedding.slice(0, 768);
  }

  const maxAbs = Math.max(...embedding.map((v: number) => Math.abs(v)), 1);
  return embedding.map((v: number) => v / maxAbs);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");
    if (!firecrawlKey) throw new Error("FIRECRAWL_API_KEY not configured");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get all URL-based knowledge documents
    const { data: docs, error: docsError } = await adminClient
      .from("knowledge_documents")
      .select("id, user_id, source_url, filename")
      .not("source_url", "is", null);

    if (docsError) throw docsError;
    if (!docs || docs.length === 0) {
      console.log("No URL-based documents to refresh");
      return new Response(JSON.stringify({ success: true, refreshed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Refreshing ${docs.length} URL-based documents`);
    let successCount = 0;
    let errorCount = 0;

    for (const doc of docs) {
      try {
        console.log(`Refreshing: ${doc.source_url}`);

        // Re-scrape via Firecrawl
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: doc.source_url,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });

        if (!scrapeResp.ok) {
          const errData = await scrapeResp.json().catch(() => ({}));
          throw new Error(`Scrape failed (${scrapeResp.status}): ${errData.error || "Unknown"}`);
        }

        const scrapeData = await scrapeResp.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        if (!markdown || markdown.length < 20) {
          throw new Error("No meaningful content scraped");
        }

        // Update stored file
        const filePath = `${doc.user_id}/url-${Date.now()}.md`;
        const blob = new Blob([markdown], { type: "text/markdown" });
        await adminClient.storage.from("knowledge_documents").upload(filePath, blob);

        // Delete old chunks
        await adminClient.from("knowledge_chunks").delete().eq("document_id", doc.id);

        // Re-chunk and re-embed
        const cleanText = markdown.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const chunks = chunkText(cleanText, CHUNK_SIZE, CHUNK_OVERLAP);
        let chunkSuccess = 0;

        for (let i = 0; i < chunks.length; i++) {
          try {
            const embedding = await generateEmbedding(chunks[i], lovableKey);
            await adminClient.from("knowledge_chunks").insert({
              document_id: doc.id,
              user_id: doc.user_id,
              content: chunks[i],
              chunk_index: i,
              embedding: `[${embedding.join(",")}]`,
            });
            chunkSuccess++;
          } catch (embErr) {
            console.error(`Chunk ${i} failed for doc ${doc.id}:`, embErr);
          }
          // Rate limit
          if (i > 0 && i % 5 === 0) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        // Update document record
        await adminClient
          .from("knowledge_documents")
          .update({
            status: "ready",
            chunk_count: chunkSuccess,
            file_path: filePath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", doc.id);

        successCount++;
        console.log(`✓ Refreshed ${doc.source_url} (${chunkSuccess} chunks)`);
      } catch (docErr) {
        errorCount++;
        console.error(`✗ Failed ${doc.source_url}:`, docErr);
        await adminClient
          .from("knowledge_documents")
          .update({
            status: "error",
            error_message: docErr instanceof Error ? docErr.message : "Refresh failed",
          })
          .eq("id", doc.id);
      }

      // Delay between documents
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log(`Refresh complete: ${successCount} success, ${errorCount} errors`);
    return new Response(
      JSON.stringify({ success: true, refreshed: successCount, errors: errorCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("knowledge-refresh error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
