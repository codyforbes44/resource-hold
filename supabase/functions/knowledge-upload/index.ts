import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const EMBEDDING_MODEL = "gemini-2.5-flash-lite";
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

function extractTextFromContent(content: string, mimeType: string): string {
  if (mimeType?.startsWith("text/")) return content;
  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function generateEmbedding(text: string, geminiKey: string): Promise<number[]> {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${geminiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an embedding generator. Given text, output exactly 768 floating point numbers between -1 and 1 separated by commas, representing a semantic embedding of the input text. Output ONLY the numbers, nothing else. No brackets, no explanation.`,
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
  if (!toolCall) {
    throw new Error("No embedding tool call returned");
  }

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action } = body;

    // DELETE action
    if (action === "delete") {
      const { document_id } = body;
      if (!document_id) throw new Error("document_id required");

      const { data: doc } = await adminClient
        .from("knowledge_documents")
        .select("file_path")
        .eq("id", document_id)
        .eq("user_id", user.id)
        .single();

      if (!doc) throw new Error("Document not found");

      await adminClient.storage.from("knowledge_documents").remove([doc.file_path]);
      await adminClient.from("knowledge_documents").delete().eq("id", document_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PROCESS action
    if (action === "process") {
      const { document_id } = body;
      if (!document_id) throw new Error("document_id required");

      const { data: doc, error: docError } = await adminClient
        .from("knowledge_documents")
        .select("*")
        .eq("id", document_id)
        .eq("user_id", user.id)
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

        const textContent = await fileData.text();
        const cleanText = extractTextFromContent(textContent, doc.mime_type || "text/plain");

        if (!cleanText || cleanText.length < 10) {
          throw new Error("Document contains no extractable text");
        }

        const chunks = chunkText(cleanText, CHUNK_SIZE, CHUNK_OVERLAP);
        console.log(`Document ${document_id}: ${chunks.length} chunks from ${cleanText.length} chars`);

        let successCount = 0;
        for (let i = 0; i < chunks.length; i++) {
          try {
            const embedding = await generateEmbedding(chunks[i], geminiKey);

            await adminClient.from("knowledge_chunks").insert({
              document_id,
              user_id: user.id,
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

        await adminClient
          .from("knowledge_documents")
          .update({
            status: "ready",
            chunk_count: successCount,
          })
          .eq("id", document_id);

        return new Response(
          JSON.stringify({ success: true, chunk_count: successCount }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
