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

// ── Helpers ──

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

function extractTextFromContent(content: string, mimeType: string): string {
  if (mimeType?.startsWith("text/")) return content;
  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
          content: "You are an embedding generator. Given text, output exactly 768 floating point numbers between -1 and 1 separated by commas, representing a semantic embedding of the input text. Output ONLY the numbers, nothing else.",
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
    throw new Error(`Embedding generation failed (${response.status}): ${errText}`);
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

async function processAndIndex(
  adminClient: any,
  documentId: string,
  userId: string,
  textContent: string,
  lovableKey: string,
): Promise<number> {
  const cleanText = textContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  if (!cleanText || cleanText.length < 10) {
    throw new Error("Document contains no extractable text");
  }

  const chunks = chunkText(cleanText, CHUNK_SIZE, CHUNK_OVERLAP);
  console.log(`Document ${documentId}: ${chunks.length} chunks from ${cleanText.length} chars`);

  // Delete existing chunks for re-processing
  await adminClient.from("knowledge_chunks").delete().eq("document_id", documentId);

  let successCount = 0;
  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await generateEmbedding(chunks[i], lovableKey);
      await adminClient.from("knowledge_chunks").insert({
        document_id: documentId,
        user_id: userId,
        content: chunks[i],
        chunk_index: i,
        embedding: `[${embedding.join(",")}]`,
      });
      successCount++;
    } catch (embErr) {
      console.error(`Chunk ${i} embedding failed:`, embErr);
    }

    if (i > 0 && i % 5 === 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return successCount;
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");

    // Support multiple auth methods
    let userId: string;
    const authHeader = req.headers.get("Authorization");
    const bodyClone = await req.clone().json();
    
    // Method 1: Internal call with service_role_key in body (for cron/batch)
    if (bodyClone.service_role_key === serviceRoleKey && bodyClone.user_id_override) {
      userId = bodyClone.user_id_override;
      console.log("Internal service role auth, user_id_override:", userId);
    }
    // Method 2: Auth header with service role token
    else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token === serviceRoleKey && bodyClone.user_id_override) {
        userId = bodyClone.user_id_override;
        console.log("Service role auth, user_id_override:", userId);
      } else {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authError } = await userClient.auth.getUser();
        if (authError || !user) throw new Error("Unauthorized");
        userId = user.id;
      }
    } else {
      throw new Error("Missing authorization");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { action } = body;

    // ── DELETE ──
    if (action === "delete") {
      const { document_id } = body;
      if (!document_id) throw new Error("document_id required");

      const { data: doc } = await adminClient
        .from("knowledge_documents")
        .select("file_path, source_url")
        .eq("id", document_id)
        .eq("user_id", userId)
        .single();

      if (!doc) throw new Error("Document not found");

      // Only remove from storage if it's a file upload (not a URL)
      if (doc.file_path && !doc.source_url) {
        await adminClient.storage.from("knowledge_documents").remove([doc.file_path]);
      }

      await adminClient.from("knowledge_chunks").delete().eq("document_id", document_id);
      await adminClient.from("knowledge_documents").delete().eq("id", document_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INGEST URL ──
    if (action === "ingest_url") {
      const { url } = body;
      if (!url) throw new Error("url required");

      // Scrape via Firecrawl
      const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (!firecrawlKey) throw new Error("Firecrawl connector not configured. Please connect Firecrawl in Settings.");

      const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });

      if (!scrapeResp.ok) {
        const errData = await scrapeResp.json().catch(() => ({}));
        throw new Error(`Firecrawl scrape failed (${scrapeResp.status}): ${errData.error || "Unknown error"}`);
      }

      const scrapeData = await scrapeResp.json();
      const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
      if (!markdown || markdown.length < 20) {
        throw new Error("No meaningful content found at that URL");
      }

      const title = scrapeData.data?.metadata?.title || new URL(url).hostname;
      const filePath = `${userId}/url-${Date.now()}.md`;

      // Store scraped content in storage for consistency
      const blob = new Blob([markdown], { type: "text/markdown" });
      await adminClient.storage.from("knowledge_documents").upload(filePath, blob);

      // Create document record
      const { data: doc, error: insertError } = await adminClient
        .from("knowledge_documents")
        .insert({
          user_id: userId,
          filename: title,
          file_path: filePath,
          file_size: markdown.length,
          mime_type: "text/markdown",
          status: "processing",
          source_url: url,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      try {
        const successCount = await processAndIndex(adminClient, doc.id, userId, markdown, lovableKey);

        await adminClient
          .from("knowledge_documents")
          .update({ status: "ready", chunk_count: successCount })
          .eq("id", doc.id);

        return new Response(
          JSON.stringify({ success: true, document_id: doc.id, chunk_count: successCount }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (processError) {
        console.error("URL processing error:", processError);
        await adminClient
          .from("knowledge_documents")
          .update({
            status: "error",
            error_message: processError instanceof Error ? processError.message : "Processing failed",
          })
          .eq("id", doc.id);
        throw processError;
      }
    }

    // ── PROCESS (file upload) ──
    if (action === "process") {
      const { document_id } = body;
      if (!document_id) throw new Error("document_id required");

      const { data: doc, error: docError } = await adminClient
        .from("knowledge_documents")
        .select("*")
        .eq("id", document_id)
        .eq("user_id", userId)
        .single();

      if (docError || !doc) throw new Error("Document not found");

      await adminClient
        .from("knowledge_documents")
        .update({ status: "processing" })
        .eq("id", document_id);

      try {
        const { data: fileData, error: downloadError } = await adminClient.storage
          .from("knowledge_documents")
          .download(doc.file_path);

        if (downloadError || !fileData) throw new Error("Failed to download file");

        let textContent: string;

        // Handle PDF via Lovable AI (extract text using vision model)
        if (doc.mime_type === "application/pdf") {
          const arrayBuffer = await fileData.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

          const extractResp = await fetch(LOVABLE_AI_ENDPOINT, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Extract ALL text content from this PDF document. Output only the text, preserving paragraph structure. No commentary.",
                    },
                    {
                      type: "image_url",
                      image_url: { url: `data:application/pdf;base64,${base64}` },
                    },
                  ],
                },
              ],
            }),
          });

          if (!extractResp.ok) {
            throw new Error(`PDF text extraction failed (${extractResp.status})`);
          }

          const extractData = await extractResp.json();
          textContent = extractData.choices?.[0]?.message?.content || "";
        } else {
          textContent = await fileData.text();
          textContent = extractTextFromContent(textContent, doc.mime_type || "text/plain");
        }

        const successCount = await processAndIndex(adminClient, document_id, userId, textContent, lovableKey);

        await adminClient
          .from("knowledge_documents")
          .update({ status: "ready", chunk_count: successCount })
          .eq("id", document_id);

        return new Response(
          JSON.stringify({ success: true, chunk_count: successCount }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (processError) {
        console.error("Processing error:", processError);
        await adminClient
          .from("knowledge_documents")
          .update({
            status: "error",
            error_message: processError instanceof Error ? processError.message : "Processing failed",
          })
          .eq("id", document_id);
        throw processError;
      }
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("knowledge-upload error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
