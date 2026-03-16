import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const ZEPHEL_ENDPOINT = "https://nvfszndwhgtjlxtclowb.supabase.co/functions/v1/external-chat";
const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_MESSAGES = 50;

// ── API Router ──

function getApiConfig(model: string): { url: string; apiKey: string; modelName: string } {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const zephelKey = Deno.env.get("ZEPHEL_API_KEY");

  if (model.startsWith("zephel/")) {
    if (!zephelKey) throw new Error("ZEPHEL_API_KEY is not configured");
    return { url: ZEPHEL_ENDPOINT, apiKey: zephelKey, modelName: model.replace("zephel/", "") };
  }
  if (model.startsWith("openai/")) {
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");
    return { url: OPENAI_ENDPOINT, apiKey: openaiKey, modelName: model.replace("openai/", "") };
  }
  // Default to Gemini for google/* and any other model
  if (!geminiKey) throw new Error("GEMINI_API_KEY is not configured");
  return { url: GEMINI_ENDPOINT, apiKey: geminiKey, modelName: model.replace("google/", "") };
}

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
  deep_research: {
    type: "function",
    function: {
      name: "deep_research",
      description: "Perform comprehensive research by searching both the web and the knowledge base simultaneously. Use this for thorough, multi-source answers.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "The research query" } },
        required: ["query"],
      },
    },
  },
  memory: {
    type: "function",
    function: {
      name: "store_memory",
      description: "Save a user preference, fact, or context to remember across sessions. Use proactively when users share personal details, preferences, or important context.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Short identifier for this memory (e.g. 'preferred_language', 'name', 'project_stack')" },
          value: { type: "string", description: "The value to remember" },
          category: { type: "string", description: "Category: 'preference', 'fact', 'context', or 'general'" },
        },
        required: ["key", "value"],
      },
    },
  },
  memory_recall: {
    type: "function",
    function: {
      name: "recall_memory",
      description: "Retrieve stored memories about the user to personalize responses. Use at the start of conversations or when context would help.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Optional category filter: 'preference', 'fact', 'context', or 'general'. Omit to retrieve all." },
        },
      },
    },
  },
  browser: {
    type: "function",
    function: {
      name: "browse_page",
      description: "Browse and extract the full content of a specific web page URL. Returns the page content as markdown.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL of the page to browse" },
        },
        required: ["url"],
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

async function executeImageGeneration(prompt: string): Promise<string> {
  // Image generation uses Gemini's image model directly
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return "Image generation failed: GEMINI_API_KEY is not configured.";
  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${geminiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-3.1-flash-image-preview",
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

async function executeKnowledgeSearch(query: string, userId: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) return "Knowledge search failed: GEMINI_API_KEY is not configured.";

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Generate embedding using Gemini directly
    const embResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${geminiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
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

    if (embedding.length < 768) embedding = [...embedding, ...new Array(768 - embedding.length).fill(0)];
    else if (embedding.length > 768) embedding = embedding.slice(0, 768);

    const maxAbs = Math.max(...embedding.map((v: number) => Math.abs(v)), 1);
    embedding = embedding.map((v: number) => v / maxAbs);

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

async function executeDeepResearch(query: string, userId: string): Promise<string> {
  const [webResults, kbResults] = await Promise.all([
    executeWebSearch(query),
    executeKnowledgeSearch(query, userId),
  ]);

  return `## Web Results\n\n${webResults}\n\n---\n\n## Knowledge Base Results\n\n${kbResults}`;
}

async function executeStoreMemory(key: string, value: string, category: string, userId: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await adminClient
      .from("user_memory")
      .upsert({ user_id: userId, key, value, category: category || "general" }, { onConflict: "user_id,key" });
    if (error) return `Failed to store memory: ${error.message}`;
    return `Memory stored: "${key}" = "${value}" (${category || "general"})`;
  } catch (e) {
    return `Memory store error: ${e instanceof Error ? e.message : "Unknown"}`;
  }
}

async function executeRecallMemory(category: string | undefined, userId: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    let query = adminClient.from("user_memory").select("key, value, category, updated_at").eq("user_id", userId);
    if (category) query = query.eq("category", category);
    const { data, error } = await query.order("updated_at", { ascending: false }).limit(50);
    if (error) return `Failed to recall memories: ${error.message}`;
    if (!data || data.length === 0) return "No memories stored yet for this user.";
    return data.map((m: any) => `[${m.category}] ${m.key}: ${m.value}`).join("\n");
  } catch (e) {
    return `Memory recall error: ${e instanceof Error ? e.message : "Unknown"}`;
  }
}

async function executeBrowsePage(url: string): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return "Browser control is not configured. FIRECRAWL_API_KEY is missing.";
  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: formattedUrl, formats: ["markdown"], onlyMainContent: true }),
    });
    const data = await response.json();
    if (!response.ok) return `Browse failed: ${data.error || response.status}`;
    const markdown = data.data?.markdown || data.markdown || "";
    if (!markdown) return "Page returned no content.";
    return markdown.slice(0, 5000);
  } catch (e) {
    return `Browse error: ${e instanceof Error ? e.message : "Unknown"}`;
  }
}

async function executeTool(name: string, args: Record<string, any>, userId: string): Promise<string> {
  switch (name) {
    case "web_search": return await executeWebSearch(args.query);
    case "generate_image": return await executeImageGeneration(args.prompt);
    case "search_knowledge": return await executeKnowledgeSearch(args.query, userId);
    case "deep_research": return await executeDeepResearch(args.query, userId);
    case "store_memory": return await executeStoreMemory(args.key, args.value, args.category, userId);
    case "recall_memory": return await executeRecallMemory(args.category, userId);
    case "browse_page": return await executeBrowsePage(args.url);
    default: return `Unknown tool: ${name}`;
  }
}

// ── Validation & sanitization ──

function validateAndSanitize(messages: any[]): any[] {
  if (!Array.isArray(messages)) throw new Error("Messages must be an array");
  if (messages.length === 0) throw new Error("Messages array cannot be empty");

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
    "zephel/zephel",
    "zephel/zephel-pro",
    "zephel/zephel-fast",
  ];
  return ALLOWED_MODELS.includes(model) ? model : "google/gemini-3-flash-preview";
}

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

    // ── Model access enforcement ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const accessClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: modelDefault } = await accessClient
      .from("model_access_defaults")
      .select("enabled, visitor_enabled")
      .eq("model", selectedModel)
      .single();

    if (modelDefault) {
      if (userId) {
        // Check user-specific override first
        const { data: override } = await accessClient
          .from("user_model_overrides")
          .select("enabled")
          .eq("user_id", userId)
          .eq("model", selectedModel)
          .single();

        const allowed = override ? override.enabled : modelDefault.enabled;
        if (!allowed) {
          return errorResponse(403, "This model is not available for your account. Contact an administrator.");
        }
      } else {
        // Visitor
        if (!modelDefault.visitor_enabled) {
          return errorResponse(403, "This model requires authentication. Please sign in.");
        }
      }
    }
    const enabledSkills: string[] = Array.isArray(body.skills) ? body.skills : [];
    const { url: apiUrl, apiKey, modelName } = getApiConfig(selectedModel);

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
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelName, messages: fullMessages, stream: true }),
      });

      if (!response.ok) {
        const status = response.status;
        const t = await response.text();
        console.error("API error:", status, t);
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
    const initialResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName, messages: fullMessages, tools, tool_choice: "auto" }),
    });

    if (!initialResponse.ok) {
      const status = initialResponse.status;
      const t = await initialResponse.text();
      console.error("API error:", status, t);
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
        : fnName === "deep_research" ? "🔬 Researching across web & knowledge base..."
        : `⚡ Running ${fnName}...`;
      toolStatusChunks.push(
        `data: ${JSON.stringify({ choices: [{ delta: { content: `*${toolLabel}*\n\n` } }] })}\n\n`
      );

      const result = await executeTool(fnName, fnArgs, userId || "");

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
    const finalResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName, messages: toolMessages, stream: true }),
    });

    if (!finalResponse.ok) {
      const t = await finalResponse.text();
      console.error("Final API response error:", finalResponse.status, t);
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
