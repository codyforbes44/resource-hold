import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_MESSAGES = 50;

// ── Tool definitions ──

const SKILL_TOOLS: Record<string, any> = {
  web_search: {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for real-time information.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "The search query" } },
        required: ["query"],
      },
    },
  },
  image_generation: {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an image from a text description.",
      parameters: {
        type: "object",
        properties: { prompt: { type: "string", description: "Detailed description of the image to generate" } },
        required: ["prompt"],
      },
    },
  },
  knowledge_base: {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "Search the knowledge base for information from uploaded documents.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "The search query for the knowledge base" } },
        required: ["query"],
      },
    },
  },
};

// ── Tool executors ──

async function executeWebSearch(query: string): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return "Web search is not configured. FIRECRAWL_API_KEY is missing.";
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 5, scrapeOptions: { formats: ["markdown"] } }),
    });
    const data = await response.json();
    if (!response.ok) return `Search failed: ${data.error || response.status}`;
    const results = data.data || [];
    if (results.length === 0) return "No results found.";
    return results
      .map((r: any, i: number) =>
        `[${i + 1}] ${r.title || "Untitled"}\nURL: ${r.url}\n${(r.markdown || r.description || "").slice(0, 800)}`
      )
      .join("\n\n---\n\n");
  } catch (e) {
    return `Search error: ${e instanceof Error ? e.message : "Unknown"}`;
  }
}

async function executeImageGeneration(prompt: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!response.ok) {
      const t = await response.text();
      return `Image generation failed (${response.status}): ${t}`;
    }
    const data = await response.json();
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const imageUrl = images[0].image_url?.url;
      if (imageUrl) return `IMAGE_DATA:${imageUrl}`;
    }
    return data.choices?.[0]?.message?.content || "Image generation produced no result.";
  } catch (e) {
    return `Image generation error: ${e instanceof Error ? e.message : "Unknown"}`;
  }
}

async function executeKnowledgeSearch(query: string, userId: string, lovableApiKey: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Generate embedding for the query using same approach as knowledge-upload
    const embResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are an embedding generator. Given text, output exactly 768 floating point numbers between -1 and 1 separated by commas, representing a semantic embedding of the input text. Output ONLY the numbers, nothing else.",
          },
          { role: "user", content: query.slice(0, 2000) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "store_embedding",
            description: "Store a 768-dimensional embedding vector",
            parameters: {
              type: "object",
              properties: {
                embedding: { type: "array", items: { type: "number" }, description: "768-dim vector" },
              },
              required: ["embedding"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "store_embedding" } },
      }),
    });

    if (!embResponse.ok) return `Knowledge search failed: embedding generation error (${embResponse.status})`;

    const embData = await embResponse.json();
    const toolCall = embData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return "Knowledge search failed: no embedding generated";

    let embedding = JSON.parse(toolCall.function.arguments).embedding;
    if (!Array.isArray(embedding)) return "Knowledge search failed: invalid embedding";

    // Pad/truncate to 768
    if (embedding.length < 768) embedding = [...embedding, ...new Array(768 - embedding.length).fill(0)];
    else if (embedding.length > 768) embedding = embedding.slice(0, 768);

    const maxAbs = Math.max(...embedding.map((v: number) => Math.abs(v)), 1);
    embedding = embedding.map((v: number) => v / maxAbs);

    // Search using the database function
    const { data: results, error: searchError } = await adminClient.rpc("search_knowledge_chunks", {
      _user_id: userId,
      _query_embedding: `[${embedding.join(",")}]`,
      _match_count: 5,
      _match_threshold: 0.2,
    });

    if (searchError) {
      console.error("Knowledge search error:", searchError);
      return `Knowledge search failed: ${searchError.message}`;
    }

    if (!results || results.length === 0) {
      return "No relevant documents found in the knowledge base for this query. The user may need to upload relevant documents first.";
    }

    return results
      .map((r: any, i: number) => `[Chunk ${i + 1}] (similarity: ${(r.similarity * 100).toFixed(1)}%)\n${r.content}`)
      .join("\n\n---\n\n");
  } catch (e) {
    console.error("Knowledge search error:", e);
    return `Knowledge search error: ${e instanceof Error ? e.message : "Unknown"}`;
  }
}

async function executeTool(name: string, args: Record<string, any>, lovableApiKey: string, userId: string): Promise<string> {
  switch (name) {
    case "web_search": return await executeWebSearch(args.query);
    case "generate_image": return await executeImageGeneration(args.prompt, lovableApiKey);
    case "search_knowledge": return await executeKnowledgeSearch(args.query, userId, lovableApiKey);
    default: return `Unknown tool: ${name}`;
  }
}

// ── Validation & sanitization ──

function validateAndSanitize(messages: any[]): any[] {
  if (!Array.isArray(messages)) throw new Error("Messages must be an array");
  if (messages.length === 0) throw new Error("Messages array cannot be empty");

  // Truncate to last N messages to prevent abuse
  const truncated = messages.slice(-MAX_HISTORY_MESSAGES);

  return truncated.map((msg) => {
    if (!msg.role || !msg.content) throw new Error("Each message must have role and content");
    if (!["user", "assistant", "system"].includes(msg.role)) {
      throw new Error(`Invalid role: ${msg.role}`);
    }
    const content = typeof msg.content === "string"
      ? msg.content.slice(0, MAX_MESSAGE_LENGTH)
      : String(msg.content).slice(0, MAX_MESSAGE_LENGTH);

    return { role: msg.role, content };
  });
}

function validateModel(model: string): string {
  const ALLOWED_MODELS = [
    "google/gemini-3-flash-preview",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash-lite",
    "google/gemini-3.1-pro-preview",
    "openai/gpt-5-mini",
    "openai/gpt-5",
    "openai/gpt-5-nano",
    "openai/gpt-5.2",
  ];
  return ALLOWED_MODELS.includes(model) ? model : "google/gemini-3-flash-preview";
}

// ── Error response helper ──

function errorResponse(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract user ID for knowledge base search
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        userId = user?.id || null;
      } catch { /* proceed without userId */ }
    }

    const messages = validateAndSanitize(body.messages);
    const selectedModel = validateModel(body.model || "google/gemini-3-flash-preview");
    const enabledSkills: string[] = Array.isArray(body.skills) ? body.skills : [];

    // Build tools array
    const tools: any[] = [];
    for (const skillId of enabledSkills) {
      if (SKILL_TOOLS[skillId]) tools.push(SKILL_TOOLS[skillId]);
    }

    const systemPrompt = `You are gClaw, an enterprise AI assistant built on the OpenClaw agent orchestration protocol. You are helpful, knowledgeable, and concise. Format responses with markdown when appropriate. Use fenced code blocks with language identifiers for code.

${tools.length > 0 ? "You have access to tools/skills. Use them when they would help answer the user's question." : ""}

When you use a tool and get results, synthesize the information into a helpful response. Cite sources when using web search results.`;

    const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];

    // ── No tools: streaming pass-through ──
    if (tools.length === 0) {
      const response = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, messages: fullMessages, stream: true }),
      });

      if (!response.ok) {
        const status = response.status;
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        return errorResponse(
          status,
          status === 429 ? "Rate limit exceeded. Please wait a moment." : status === 402 ? "Payment required" : "AI error"
        );
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ── With tools: non-streaming first ──
    const initialResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: selectedModel, messages: fullMessages, tools, tool_choice: "auto" }),
    });

    if (!initialResponse.ok) {
      const status = initialResponse.status;
      const t = await initialResponse.text();
      console.error("AI gateway error:", status, t);
      return errorResponse(
        status,
        status === 429 ? "Rate limit exceeded. Please wait a moment." : status === 402 ? "Payment required" : "AI error"
      );
    }

    const initialData = await initialResponse.json();
    const choice = initialData.choices?.[0];

    if (!choice?.message?.tool_calls || choice.message.tool_calls.length === 0) {
      const content = choice?.message?.content || "";
      const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(sseData, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Execute tool calls
    const toolCalls = choice.message.tool_calls;
    const toolMessages: any[] = [...fullMessages, choice.message];
    const toolStatusChunks: string[] = [];

    for (const tc of toolCalls) {
      const fnName = tc.function.name;
      const fnArgs = JSON.parse(tc.function.arguments || "{}");
      console.log(`Executing tool: ${fnName}`, fnArgs);

      const toolLabel =
        fnName === "web_search" ? "🔍 Searching the web..."
        : fnName === "generate_image" ? "🎨 Generating image..."
        : fnName === "search_knowledge" ? "📚 Searching knowledge base..."
        : `⚡ Running ${fnName}...`;
      toolStatusChunks.push(
        `data: ${JSON.stringify({ choices: [{ delta: { content: `*${toolLabel}*\n\n` } }] })}\n\n`
      );

      const result = await executeTool(fnName, fnArgs, LOVABLE_API_KEY, userId || "");

      if (result.startsWith("IMAGE_DATA:")) {
        const imageDataUrl = result.slice(11);
        toolStatusChunks.push(
          `data: ${JSON.stringify({ choices: [{ delta: { content: `![Generated Image](${imageDataUrl})\n\n` } }] })}\n\n`
        );
        toolMessages.push({ role: "tool", tool_call_id: tc.id, content: "Image generated successfully and displayed to the user." });
      } else {
        toolMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
    }

    // Stream final response with tool results
    const finalResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: selectedModel, messages: toolMessages, stream: true }),
    });

    if (!finalResponse.ok) {
      const t = await finalResponse.text();
      console.error("Final AI response error:", finalResponse.status, t);
      return errorResponse(500, "AI error after tool execution");
    }

    const encoder = new TextEncoder();
    const statusData = toolStatusChunks.join("");

    const combinedStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(statusData));
        const reader = finalResponse.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(combinedStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return errorResponse(500, e instanceof Error ? e.message : "Unknown error");
  }
});
