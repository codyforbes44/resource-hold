import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Tool definitions for OpenClaw skills
const SKILL_TOOLS: Record<string, any> = {
  web_search: {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web for real-time information. Use when the user asks about current events, recent data, documentation, or anything that requires up-to-date information.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query",
          },
        },
        required: ["query"],
      },
    },
  },
  image_generation: {
    type: "function",
    function: {
      name: "generate_image",
      description:
        "Generate an image from a text description. Use when the user asks to create, draw, or generate an image or picture.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Detailed description of the image to generate",
          },
        },
        required: ["prompt"],
      },
    },
  },
  knowledge_base: {
    type: "function",
    function: {
      name: "search_knowledge",
      description:
        "Search the knowledge base for information from uploaded documents and scraped pages. Use when the user asks about information that might be in their documents.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query for the knowledge base",
          },
        },
        required: ["query"],
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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 5,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const data = await response.json();
    if (!response.ok) return `Search failed: ${data.error || response.status}`;

    const results = data.data || [];
    if (results.length === 0) return "No results found.";

    return results
      .map(
        (r: any, i: number) =>
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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
        return `IMAGE_DATA:${imageUrl}`;
      }
    }
    return data.choices?.[0]?.message?.content || "Image generation produced no result.";
  } catch (e) {
    return `Image generation error: ${e instanceof Error ? e.message : "Unknown"}`;
  }
}

async function executeKnowledgeSearch(query: string): Promise<string> {
  // Placeholder for RAG - in a real implementation this would query a vector store
  return `Knowledge base search for "${query}": No documents have been indexed yet. Upload documents to the knowledge base to enable this feature.`;
}

async function executeTool(
  name: string,
  args: Record<string, any>,
  lovableApiKey: string
): Promise<string> {
  switch (name) {
    case "web_search":
      return await executeWebSearch(args.query);
    case "generate_image":
      return await executeImageGeneration(args.prompt, lovableApiKey);
    case "search_knowledge":
      return await executeKnowledgeSearch(args.query);
    default:
      return `Unknown tool: ${name}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model, skills } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const selectedModel = model || "google/gemini-3-flash-preview";
    const enabledSkills: string[] = skills || [];

    // Build tools array based on enabled skills
    const tools: any[] = [];
    for (const skillId of enabledSkills) {
      if (SKILL_TOOLS[skillId]) {
        tools.push(SKILL_TOOLS[skillId]);
      }
    }

    const systemPrompt = `You are gClaw, an enterprise AI assistant built on the OpenClaw agent orchestration protocol. You are helpful, knowledgeable, and concise. Format responses with markdown when appropriate.

${tools.length > 0 ? "You have access to tools/skills. Use them when they would help answer the user's question. For web search, use it when the user asks about current events, recent information, or when you need to verify facts. For image generation, use it when the user asks to create or generate images. For knowledge base, use it when the user references their documents." : ""}

When you use a tool and get results, synthesize the information into a helpful response. Cite sources when using web search results.`;

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // If no tools, do a simple streaming pass-through
    if (tools.length === 0) {
      const response = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: fullMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        return new Response(
          JSON.stringify({ error: status === 429 ? "Rate limit" : status === 402 ? "Payment required" : "AI error" }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // With tools: non-streaming call first to check for tool calls
    const initialResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: fullMessages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (!initialResponse.ok) {
      const status = initialResponse.status;
      const t = await initialResponse.text();
      console.error("AI gateway error:", status, t);
      return new Response(
        JSON.stringify({ error: status === 429 ? "Rate limit" : status === 402 ? "Payment required" : "AI error" }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const initialData = await initialResponse.json();
    const choice = initialData.choices?.[0];

    if (!choice?.message?.tool_calls || choice.message.tool_calls.length === 0) {
      // No tool calls - return the content as a fake SSE stream
      const content = choice?.message?.content || "";
      const sseData = `data: ${JSON.stringify({
        choices: [{ delta: { content } }],
      })}\n\ndata: [DONE]\n\n`;
      return new Response(sseData, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Execute tool calls
    const toolCalls = choice.message.tool_calls;
    const toolMessages: any[] = [...fullMessages, choice.message];

    // Send a status SSE event for the tool being used
    const toolStatusChunks: string[] = [];

    for (const tc of toolCalls) {
      const fnName = tc.function.name;
      const fnArgs = JSON.parse(tc.function.arguments || "{}");
      
      console.log(`Executing tool: ${fnName}`, fnArgs);
      
      // Add status indicator
      const toolLabel = fnName === "web_search" ? "🔍 Searching the web..." 
        : fnName === "generate_image" ? "🎨 Generating image..." 
        : fnName === "search_knowledge" ? "📚 Searching knowledge base..."
        : `⚡ Running ${fnName}...`;
      toolStatusChunks.push(
        `data: ${JSON.stringify({ choices: [{ delta: { content: `*${toolLabel}*\n\n` } }] })}\n\n`
      );

      const result = await executeTool(fnName, fnArgs, LOVABLE_API_KEY);

      // Check for image data
      if (result.startsWith("IMAGE_DATA:")) {
        const imageDataUrl = result.slice(11);
        // Return the image inline
        const imageMarkdown = `![Generated Image](${imageDataUrl})`;
        toolStatusChunks.push(
          `data: ${JSON.stringify({ choices: [{ delta: { content: imageMarkdown + "\n\n" } }] })}\n\n`
        );
        // Don't add to tool messages - we already rendered the image
        toolMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: "Image generated successfully and displayed to the user.",
        });
      } else {
        toolMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
    }

    // Now stream the final response with tool results
    const finalResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: toolMessages,
        stream: true,
      }),
    });

    if (!finalResponse.ok) {
      const t = await finalResponse.text();
      console.error("Final AI response error:", finalResponse.status, t);
      return new Response(
        JSON.stringify({ error: "AI error after tool execution" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Combine tool status chunks with the streaming response
    const encoder = new TextEncoder();
    const statusData = toolStatusChunks.join("");

    const combinedStream = new ReadableStream({
      async start(controller) {
        // First send tool status
        controller.enqueue(encoder.encode(statusData));

        // Then pipe the final response
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
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
