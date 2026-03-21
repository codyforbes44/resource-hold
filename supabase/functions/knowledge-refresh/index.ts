import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

  let embedding = JSON.parse(toolCall.function.arguments).embedding;
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

async function refreshUrlDocument(adminClient: any, doc: any, firecrawlKey: string, lovableKey: string) {
  console.log(`Refreshing URL document: ${doc.source_url}`);

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

  const filePath = `${doc.user_id}/url-${Date.now()}.md`;
  const blob = new Blob([markdown], { type: "text/markdown" });
  await adminClient.storage.from("knowledge_documents").upload(filePath, blob);

  await adminClient.from("knowledge_chunks").delete().eq("document_id", doc.id);

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

    if (i > 0 && i % 5 === 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  await adminClient
    .from("knowledge_documents")
    .update({
      status: "ready",
      chunk_count: chunkSuccess,
      file_path: filePath,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", doc.id);

  return chunkSuccess;
}

async function processQueuedFileDocument(
  supabaseUrl: string,
  serviceRoleKey: string,
  documentId: string,
  userId: string,
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/knowledge-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "process",
      document_id: documentId,
      user_id_override: userId,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Queued file processing failed (${response.status}): ${errText}`);
  }

  return await response.json().catch(() => ({ success: true }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const [fileDocsRes, urlDocsRes] = await Promise.all([
      adminClient
        .from("knowledge_documents")
        .select("id, user_id, filename, status")
        .is("source_url", null)
        .in("status", ["pending", "error"])
        .order("updated_at", { ascending: true }),
      adminClient
        .from("knowledge_documents")
        .select("id, user_id, source_url, filename")
        .not("source_url", "is", null)
        .order("updated_at", { ascending: true }),
    ]);

    if (fileDocsRes.error) throw fileDocsRes.error;
    if (urlDocsRes.error) throw urlDocsRes.error;

    const fileDocs = fileDocsRes.data || [];
    const urlDocs = urlDocsRes.data || [];

    if (fileDocs.length === 0 && urlDocs.length === 0) {
      console.log("No knowledge documents to refresh");
      return new Response(JSON.stringify({ success: true, processed_files: 0, refreshed_urls: 0, errors: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Knowledge refresh queued: ${fileDocs.length} file docs, ${urlDocs.length} URL docs`);

    let processedFiles = 0;
    let refreshedUrls = 0;
    let errorCount = 0;

    for (const doc of fileDocs) {
      try {
        console.log(`Processing queued file document: ${doc.filename} (${doc.id})`);

        await adminClient
          .from("knowledge_documents")
          .update({ status: "processing", error_message: null, updated_at: new Date().toISOString() })
          .eq("id", doc.id);

        const result = await processQueuedFileDocument(supabaseUrl, serviceRoleKey, doc.id, doc.user_id);
        processedFiles++;
        console.log(`✓ Processed file ${doc.filename}`, result);
      } catch (docErr) {
        errorCount++;
        console.error(`✗ Failed file ${doc.filename}:`, docErr);
        await adminClient
          .from("knowledge_documents")
          .update({
            status: "error",
            error_message: docErr instanceof Error ? docErr.message : "File processing failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", doc.id);
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    for (const doc of urlDocs) {
      try {
        const chunkCount = await refreshUrlDocument(adminClient, doc, firecrawlKey, lovableKey);
        refreshedUrls++;
        console.log(`✓ Refreshed ${doc.source_url} (${chunkCount} chunks)`);
      } catch (docErr) {
        errorCount++;
        console.error(`✗ Failed ${doc.source_url}:`, docErr);
        await adminClient
          .from("knowledge_documents")
          .update({
            status: "error",
            error_message: docErr instanceof Error ? docErr.message : "Refresh failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", doc.id);
      }

      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log(`Refresh complete: ${processedFiles} file docs, ${refreshedUrls} URLs, ${errorCount} errors`);
    return new Response(
      JSON.stringify({ success: true, processed_files: processedFiles, refreshed_urls: refreshedUrls, errors: errorCount }),
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