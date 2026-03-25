import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { routeQuery, runCouncil, type CouncilResult } from "./agent-council.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_MESSAGES = 50;

// ── LangSmith Observability ──

const LANGSMITH_API = "https://api.smith.langchain.com";
const LANGSMITH_PROJECT = Deno.env.get("LANGSMITH_PROJECT") || "gclaw-chat";

function getLangChainKey(): string | null {
  return Deno.env.get("LANGCHAIN_API_KEY") || null;
}

async function lsCreateRun(params: {
  name: string;
  run_type: "chain" | "llm" | "tool";
  inputs: Record<string, any>;
  parent_run_id?: string;
  extra?: Record<string, any>;
}): Promise<string | null> {
  const apiKey = getLangChainKey();
  if (!apiKey) return null;
  const runId = crypto.randomUUID();
  try {
    await fetch(`${LANGSMITH_API}/runs`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: runId,
        name: params.name,
        run_type: params.run_type,
        inputs: params.inputs,
        start_time: new Date().toISOString(),
        session_name: LANGSMITH_PROJECT,
        parent_run_id: params.parent_run_id,
        extra: params.extra,
      }),
    });
  } catch (e) {
    console.warn("LangSmith createRun failed:", e);
  }
  return runId;
}

async function lsPatchRun(runId: string | null, patch: {
  outputs?: Record<string, any>;
  error?: string;
  extra?: Record<string, any>;
}): Promise<void> {
  if (!runId) return;
  const apiKey = getLangChainKey();
  if (!apiKey) return;
  try {
    await fetch(`${LANGSMITH_API}/runs/${runId}`, {
      method: "PATCH",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        end_time: new Date().toISOString(),
        ...patch,
      }),
    });
  } catch (e) {
    console.warn("LangSmith patchRun failed:", e);
  }
}

// ── Tier → Backend Model Routing ──

const TIER_MODEL_MAP: Record<string, string> = {
  "gclaw/default": "google/gemini-3-flash-preview",
  "gclaw/flash": "google/gemini-2.5-flash",
  "gclaw/nano": "google/gemini-2.5-flash-lite",
  "gclaw/thinking": "google/gemini-2.5-pro",
};

const FORMATTING_INSTRUCTIONS = `
Formatting rules:
- Use markdown headers (## and ###) to organize long responses into clear sections.
- Use **bold** for key terms, concepts, and important takeaways.
- Use bullet lists or numbered lists for steps, options, and enumerations.
- Use tables (GFM markdown) when comparing items, listing features, or presenting structured data.
- Use fenced code blocks with language identifiers (e.g. \`\`\`python) for all code.
- Use > blockquotes for citations, important notes, or callouts.
- Use \`inline code\` for filenames, commands, variable names, and short code references.
- Use --- horizontal rules to separate major topic shifts.
- Use task lists (- [ ] / - [x]) when listing actionable items or checklists.
- Keep paragraphs short (2-4 sentences). Avoid walls of text.`;

const TIER_SYSTEM_PROMPTS: Record<string, string> = {
  "gclaw/default": `You are gClaw, an enterprise AI assistant built on the OpenClaw agent orchestration protocol. You are helpful, knowledgeable, and conversational. Provide balanced, well-structured responses.
${FORMATTING_INSTRUCTIONS}`,
  "gclaw/flash": `You are gClaw Flash, an enterprise AI assistant optimized for speed and efficiency. Be concise and direct. Minimize prose — get straight to the answer. Use bullet points and short paragraphs.
${FORMATTING_INSTRUCTIONS}`,
  "gclaw/nano": `You are gClaw Nano, a lightweight AI assistant for instant answers. Be ultra-brief. One-paragraph answers preferred. Skip pleasantries. Use markdown sparingly — only for code blocks and bold emphasis. Maximum efficiency.`,
  "gclaw/thinking": `You are gClaw Thinking, an enterprise AI assistant specializing in deep reasoning and analysis.

IMPORTANT: Structure EVERY response in two parts:
1. First, wrap your internal reasoning inside <think>...</think> tags. Show your step-by-step thought process, considerations, edge cases, and analysis here. This section is for transparency — the user can expand it to see how you arrived at your answer.
2. Then, AFTER the closing </think> tag, provide your final polished answer to the user.

Example structure:
<think>
Let me break this down...
- First consideration: ...
- Edge case: ...
- My conclusion is...
</think>

Here is my answer...

Always include both parts. The thinking section should be thorough; the answer section should be clear and well-structured.
${FORMATTING_INSTRUCTIONS}`,
};

function resolveModel(tier: string): string {
  return TIER_MODEL_MAP[tier] || TIER_MODEL_MAP["gclaw/default"];
}

function getSystemPrompt(tier: string): string {
  return TIER_SYSTEM_PROMPTS[tier] || TIER_SYSTEM_PROMPTS["gclaw/default"];
}

function validateTier(tier: string): string {
  return TIER_MODEL_MAP[tier] ? tier : "gclaw/default";
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
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) return "Image generation failed: LOVABLE_API_KEY is not configured.";
  try {
    const response = await fetch(LOVABLE_AI_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
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
      if (imageUrl) {
        // Upload base64 image to storage instead of returning inline
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const adminClient = createClient(supabaseUrl, serviceRoleKey);

          // Extract base64 data
          const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!base64Match) return `IMAGE_URL:${imageUrl}`; // fallback if not base64

          const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
          const base64Data = base64Match[2];
          const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

          const filename = `${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await adminClient.storage
            .from("chat_images")
            .upload(filename, binaryData, {
              contentType: `image/${base64Match[1]}`,
              upsert: false,
            });

          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            return `IMAGE_URL:${imageUrl}`; // fallback to inline
          }

          const publicUrl = `${supabaseUrl}/storage/v1/object/public/chat_images/${filename}`;
          return `IMAGE_URL:${publicUrl}`;
        } catch (storageErr) {
          console.error("Storage upload failed:", storageErr);
          return `IMAGE_URL:${imageUrl}`; // fallback to inline
        }
      }
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
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return "Knowledge search failed: LOVABLE_API_KEY is not configured.";

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const embResponse = await fetch(LOVABLE_AI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        stream: false,
        max_tokens: 8000,
        messages: [
          {
            role: "system",
            content: "You are an embedding generator. Output exactly 768 floating point numbers between -1 and 1, separated by commas. No text, no explanation, no brackets — ONLY comma-separated numbers.",
          },
          { role: "user", content: query.slice(0, 2000) },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!embResponse.ok) return `Knowledge search failed: embedding generation error (${embResponse.status})`;

    const embText = await embResponse.text();
    let rawContent = "";
    try {
      if (embText.startsWith("data: ") || embText.startsWith(":")) {
        const lines = embText.split("\n").filter(l => l.startsWith("data: ") && l !== "data: [DONE]");
        for (const l of lines) {
          try {
            const c = JSON.parse(l.slice(6));
            rawContent += c.choices?.[0]?.delta?.content || c.choices?.[0]?.message?.content || "";
          } catch { /* skip */ }
        }
      } else {
        const data = JSON.parse(embText);
        rawContent = data.choices?.[0]?.message?.content || "";
      }
    } catch (parseErr) {
      console.error("Embedding response parse error:", embText.slice(0, 300));
      return "Knowledge search failed: embedding response parse error";
    }

    if (!rawContent) return "Knowledge search failed: no embedding content";

    // Parse comma-separated numbers
    const numbers = rawContent.replace(/[\[\]\n\r\s]/g, "").split(",").map(Number).filter(n => !isNaN(n));
    let embedding = numbers;
    if (embedding.length === 0) return "Knowledge search failed: invalid embedding";
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
    if (!msg.role || msg.content === undefined) throw new Error("Each message must have role and content");
    if (!["user", "assistant", "system"].includes(msg.role)) {
      throw new Error(`Invalid role: ${msg.role}`);
    }

    // Support multimodal content arrays (e.g. image_url + text parts)
    if (Array.isArray(msg.content)) {
      const sanitizedParts = msg.content.map((part: any) => {
        if (part.type === "text") {
          return { type: "text", text: String(part.text || "").slice(0, MAX_MESSAGE_LENGTH) };
        }
        if (part.type === "image_url" && part.image_url?.url) {
          return { type: "image_url", image_url: { url: String(part.image_url.url) } };
        }
        return null;
      }).filter(Boolean);
      return { role: msg.role, content: sanitizedParts };
    }

    const content = typeof msg.content === "string"
      ? msg.content.slice(0, MAX_MESSAGE_LENGTH)
      : String(msg.content).slice(0, MAX_MESSAGE_LENGTH);

    return { role: msg.role, content };
  });
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

  // Start parent LangSmith trace
  let parentRunId: string | null = null;

  try {
    const body = await req.json();

    // Extract user ID
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (authHeader && !authHeader.endsWith(anonKey)) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        userId = user?.id || null;
      } catch { /* proceed without userId */ }
    }

    const messages = validateAndSanitize(body.messages);
    const selectedTier = validateTier(body.model || "gclaw/default");
    const backendModel = resolveModel(selectedTier);

    // Create parent LangSmith trace
    parentRunId = await lsCreateRun({
      name: "chat",
      run_type: "chain",
      inputs: {
        model: selectedTier,
        backend_model: backendModel,
        message_count: messages.length,
        last_user_message: messages.filter((m: any) => m.role === "user").pop()?.content?.slice(0, 200) || "",
        skills: body.skills || [],
        personality_id: body.personality_id || null,
      },
      extra: { metadata: { user_id: userId || "anonymous" } },
    });

    // ── Model access enforcement ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const accessClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: modelDefault } = await accessClient
      .from("model_access_defaults")
      .select("enabled, visitor_enabled")
      .eq("model", selectedTier)
      .single();

    if (modelDefault) {
      if (userId) {
        const { data: override } = await accessClient
          .from("user_model_overrides")
          .select("enabled")
          .eq("user_id", userId)
          .eq("model", selectedTier)
          .single();

        const allowed = override ? override.enabled : modelDefault.enabled;
        if (!allowed) {
          return errorResponse(403, "This model is not available for your account. Contact an administrator.");
        }
      } else {
        if (!modelDefault.visitor_enabled) {
          return errorResponse(403, "This model requires authentication. Please sign in.");
        }
      }
    }

    const enabledSkills: string[] = Array.isArray(body.skills) ? body.skills : [];
    const personalityId: string | null = body.personality_id || null;
    
    // All tiers use Lovable AI gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");


    // Build tools array
    const tools: any[] = [];
    for (const skillId of enabledSkills) {
      if (SKILL_TOOLS[skillId]) tools.push(SKILL_TOOLS[skillId]);
    }
    if (enabledSkills.includes("memory") && SKILL_TOOLS["memory_recall"]) {
      tools.push(SKILL_TOOLS["memory_recall"]);
    }

    // Build memory context
    let memoryContext = "";
    if (enabledSkills.includes("memory") && userId) {
      const memories = await executeRecallMemory(undefined, userId);
      if (memories && !memories.startsWith("No memories")) {
        memoryContext = `\n\nUser memories (use these to personalize responses):\n${memories}`;
      }
    }

    // Fetch personality modifier if set
    let personalityModifier = "";
    if (personalityId) {
      try {
        const { data: personality } = await accessClient
          .from("personalities")
          .select("system_prompt_modifier")
          .eq("id", personalityId)
          .single();
        if (personality?.system_prompt_modifier) {
          personalityModifier = personality.system_prompt_modifier;
        }
      } catch { /* proceed without personality */ }
    }

    const basePrompt = getSystemPrompt(selectedTier);
    const systemPrompt = `${personalityModifier ? personalityModifier + "\n\n" : ""}${basePrompt}

${tools.length > 0 ? "You have access to tools/skills. Use them when they would help answer the user's question." : ""}
${enabledSkills.includes("memory") ? "\nYou can remember user preferences across sessions. Proactively store important user context (name, preferences, projects, etc.) using store_memory. Use recall_memory at the start to personalize." : ""}
${enabledSkills.includes("browser") ? "\nYou can browse specific web pages to extract their full content. Use browse_page when the user asks about a specific URL or when you need detailed content from a page." : ""}

When you use a tool and get results, synthesize the information into a helpful response. Cite sources when using web search results.${memoryContext}`;

    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
    const lastUserText = Array.isArray(lastUserMsg?.content)
      ? lastUserMsg.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ")
      : (lastUserMsg?.content || "");

    const finalSystemPrompt = systemPrompt;
    const fullMessages = [{ role: "system", content: finalSystemPrompt }, ...messages];

    // ── Agent Council routing ──
    const councilDecision = routeQuery(lastUserText, enabledSkills);
    console.log(`Council decision: ${councilDecision.reason} (useCouncil: ${councilDecision.useCouncil})`);

    // ── Council path: multi-agent deliberation ──
    if (councilDecision.useCouncil && tools.length === 0) {
      const councilRunId = await lsCreateRun({
        name: "agent-council",
        run_type: "chain",
        inputs: {
          agents: councilDecision.agents.map((a) => a.id),
          reason: councilDecision.reason,
          user_message: lastUserText.slice(0, 200),
        },
        parent_run_id: parentRunId || undefined,
        extra: { metadata: {} },
      });

      const conversationContext = messages
        .slice(-6)
        .map((m: any) => `${m.role}: ${m.content.slice(0, 300)}`)
        .join("\n");

      const councilResult = await runCouncil(
        councilDecision.agents,
        lastUserText,
        conversationContext,
        finalSystemPrompt,
        LOVABLE_API_KEY,
        backendModel,
      );

      // Trace each agent as a child run
      for (const ar of councilResult.agentResults) {
        const agentRunId = await lsCreateRun({
          name: `agent:${ar.agentName}`,
          run_type: "llm",
          inputs: { agent_id: ar.agentId, user_message: lastUserText.slice(0, 200) },
          parent_run_id: councilRunId || undefined,
          extra: { metadata: { latency_ms: ar.latencyMs } },
        });
        await lsPatchRun(agentRunId, {
          outputs: { output: ar.output.slice(0, 500) },
          error: ar.error,
        });
      }

      await lsPatchRun(councilRunId, {
        outputs: {
          agents_used: councilResult.agentsUsed,
          total_latency_ms: councilResult.totalLatencyMs,
          merged: councilResult.merged,
        },
      });

      if (councilResult.content) {
        // Stream the council result as SSE
        const councilStatus = `data: ${JSON.stringify({ choices: [{ delta: { content: "*🧠 Council deliberation complete*\n\n" } }] })}\n\n`;
        const contentChunk = `data: ${JSON.stringify({ choices: [{ delta: { content: councilResult.content } }] })}\n\ndata: [DONE]\n\n`;


        await lsPatchRun(parentRunId, {
          outputs: { path: "council", model: backendModel, agents: councilResult.agentsUsed },
        });

        return new Response(councilStatus + contentChunk, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
      // If council produced nothing, fall through to direct path
    }

    // ── No tools: streaming pass-through ──
    if (tools.length === 0) {
      const llmRunId = await lsCreateRun({
        name: `llm:${backendModel}`,
        run_type: "llm",
        inputs: { messages: fullMessages.map((m: any) => ({ role: m.role, content: m.content?.slice(0, 200) })) },
        parent_run_id: parentRunId || undefined,
        extra: { metadata: { model: backendModel, stream: true } },
      });

      const response = await fetch(LOVABLE_AI_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: backendModel, messages: fullMessages, stream: true }),
      });

      if (!response.ok) {
        const status = response.status;
        const t = await response.text();
        console.error("API error:", status, t);
        lsPatchRun(llmRunId, { error: `HTTP ${status}: ${t.slice(0, 200)}` });
        lsPatchRun(parentRunId, { error: `LLM error: ${status}` });
        return errorResponse(
          status,
          status === 429 ? "Rate limit exceeded. Please wait a moment." : status === 402 ? "Payment required. Please add credits." : "AI error"
        );
      }

      // Fire-and-forget: patch LLM + parent as complete (we can't easily count streamed tokens)
      lsPatchRun(llmRunId, { outputs: { streamed: true } });
      lsPatchRun(parentRunId, { outputs: { path: "no-tools-stream", model: backendModel, council_decision: councilDecision.reason } });


      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ── With tools: non-streaming first ──
    const toolLlmRunId = await lsCreateRun({
      name: `llm:${backendModel}:tool-selection`,
      run_type: "llm",
      inputs: { messages: fullMessages.map((m: any) => ({ role: m.role, content: m.content?.slice(0, 200) })), tools_count: tools.length },
      parent_run_id: parentRunId || undefined,
      extra: { metadata: { model: backendModel, stream: false } },
    });

    const initialResponse = await fetch(LOVABLE_AI_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: backendModel, messages: fullMessages, tools, tool_choice: "auto" }),
    });

    if (!initialResponse.ok) {
      const status = initialResponse.status;
      const t = await initialResponse.text();
      console.error("API error:", status, t);
      lsPatchRun(toolLlmRunId, { error: `HTTP ${status}` });
      lsPatchRun(parentRunId, { error: `Tool LLM error: ${status}` });
      return errorResponse(
        status,
        status === 429 ? "Rate limit exceeded. Please wait a moment." : status === 402 ? "Payment required. Please add credits." : "AI error"
      );
    }

    let initialData: any;
    const initialText = await initialResponse.text();
    try {
      if (initialText.startsWith("data: ") || initialText.startsWith(":")) {
        const lines = initialText.split("\n").filter(l => l.startsWith("data: ") && l !== "data: [DONE]");
        const chunks = lines.map(l => {
          try { return JSON.parse(l.slice(6)); } catch { return null; }
        }).filter(Boolean);
        if (chunks.length > 0) {
          const combinedContent = chunks
            .map((c: any) => c.choices?.[0]?.delta?.content || c.choices?.[0]?.message?.content || "")
            .join("");
          const toolCalls = chunks
            .map((c: any) => c.choices?.[0]?.delta?.tool_calls || c.choices?.[0]?.message?.tool_calls)
            .filter(Boolean)
            .flat();
          initialData = {
            choices: [{
              message: {
                content: combinedContent,
                tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
              },
            }],
          };
        } else {
          throw new Error("No parseable data in SSE response");
        }
      } else {
        initialData = JSON.parse(initialText);
      }
    } catch (parseErr) {
      console.error("Failed to parse API response:", initialText.slice(0, 200));
      const fallbackContent = initialText.replace(/^data:\s*/gm, "").replace(/\[DONE\]/g, "").trim();
      const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: fallbackContent || "Sorry, I encountered an error processing the response." } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(sseData, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const choice = initialData.choices?.[0];
    const selectedTools = choice?.message?.tool_calls?.map((tc: any) => tc.function?.name) || [];
    lsPatchRun(toolLlmRunId, { outputs: { tool_calls: selectedTools, has_content: !!choice?.message?.content } });

    if (!choice?.message?.tool_calls || choice.message.tool_calls.length === 0) {
      const content = choice?.message?.content || "";
      const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
      lsPatchRun(parentRunId, { outputs: { path: "tools-no-call", model: backendModel } });
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
      let fnArgs: Record<string, any>;
      try {
        fnArgs = JSON.parse(tc.function.arguments || "{}");
      } catch (parseErr) {
        console.error(`Malformed tool_call arguments for ${fnName}:`, tc.function.arguments);
        toolMessages.push({ role: "tool", tool_call_id: tc.id, content: `Error: malformed arguments for ${fnName}` });
        continue;
      }
      console.log(`Executing tool: ${fnName}`, fnArgs);

      const toolLabel =
        fnName === "web_search" ? "🔍 Searching the web..."
        : fnName === "generate_image" ? "🎨 Generating image..."
        : fnName === "search_knowledge" ? "📚 Searching knowledge base..."
        : fnName === "deep_research" ? "🔬 Researching across web & knowledge base..."
        : fnName === "store_memory" ? "🧠 Saving to memory..."
        : fnName === "recall_memory" ? "🧠 Recalling memories..."
        : fnName === "browse_page" ? "🌐 Browsing page..."
        : `⚡ Running ${fnName}...`;
      toolStatusChunks.push(
        `data: ${JSON.stringify({ choices: [{ delta: { content: `*${toolLabel}*\n\n` } }] })}\n\n`
      );

      // Trace tool execution
      const toolTraceId = await lsCreateRun({
        name: `tool:${fnName}`,
        run_type: "tool",
        inputs: fnArgs,
        parent_run_id: parentRunId || undefined,
      });

      const result = await executeTool(fnName, fnArgs, userId || "");

      lsPatchRun(toolTraceId, { outputs: { result: result.slice(0, 500) } });

      if (result.startsWith("IMAGE_URL:")) {
        const imageUrl = result.slice(10);
        toolStatusChunks.push(
          `data: ${JSON.stringify({ choices: [{ delta: { content: `![Generated Image](${imageUrl})\n\n` } }] })}\n\n`
        );
        toolMessages.push({ role: "tool", tool_call_id: tc.id, content: "Image generated successfully and displayed to the user." });
      } else {
        toolMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
    }

    // Trace final LLM call
    const finalLlmRunId = await lsCreateRun({
      name: `llm:${backendModel}:final`,
      run_type: "llm",
      inputs: { tool_results_count: toolCalls.length },
      parent_run_id: parentRunId || undefined,
      extra: { metadata: { model: backendModel, stream: true } },
    });

    // Stream final response with tool results
    const finalResponse = await fetch(LOVABLE_AI_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: backendModel, messages: toolMessages, stream: true }),
    });

    if (!finalResponse.ok) {
      const t = await finalResponse.text();
      console.error("Final API response error:", finalResponse.status, t);
      lsPatchRun(finalLlmRunId, { error: `HTTP ${finalResponse.status}` });
      lsPatchRun(parentRunId, { error: `Final LLM error: ${finalResponse.status}` });
      return errorResponse(500, "AI error after tool execution");
    }

    lsPatchRun(finalLlmRunId, { outputs: { streamed: true } });
    lsPatchRun(parentRunId, { outputs: { path: "tools-executed", model: backendModel, tools_used: selectedTools, council_decision: councilDecision.reason } });


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
    lsPatchRun(parentRunId, { error: e instanceof Error ? e.message : "Unknown error" });
    return errorResponse(500, e instanceof Error ? e.message : "Unknown error");
  }
});
