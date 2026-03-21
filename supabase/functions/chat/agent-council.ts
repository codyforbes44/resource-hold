/**
 * Agent Council — Multi-agent deliberation framework
 * 
 * Routes complex queries to specialist agents, runs them in parallel,
 * then merges their outputs into a single coherent response.
 * 
 * Uses LangChain-compatible patterns (agent → tool → merge) via direct
 * REST API calls with full LangSmith tracing.
 */

const LOVABLE_AI_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── Agent Definitions ──

interface AgentSpec {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  /** Which skill IDs trigger this agent */
  skillTriggers: string[];
  /** Keywords that suggest this agent is relevant */
  keywords: RegExp[];
}

const AGENTS: AgentSpec[] = [
  {
    id: "code",
    name: "CodeAgent",
    description: "Programming, debugging, architecture, code review",
    systemPrompt: `You are the Code Specialist in an AI council. Provide focused, technical analysis on programming, debugging, architecture, and code-related questions. Be precise and include code examples where helpful. Output ONLY your specialist perspective — another agent will merge all outputs.`,
    skillTriggers: ["code_interpreter"],
    keywords: [/\b(code|function|class|bug|error|debug|api|endpoint|database|sql|python|javascript|typescript|react|deploy|docker|git)\b/i],
  },
  {
    id: "research",
    name: "ResearchAgent",
    description: "Web search, deep research, knowledge base retrieval",
    systemPrompt: `You are the Research Specialist in an AI council. Provide focused analysis based on available research data, web results, and knowledge base content. Cite sources. Be thorough but concise. Output ONLY your specialist perspective.`,
    skillTriggers: ["web_search", "deep_research", "knowledge_base"],
    keywords: [/\b(research|find|search|look up|what is|who is|when did|latest|news|article|paper|study|source)\b/i],
  },
  {
    id: "memory",
    name: "MemoryAgent",
    description: "User context recall, preference tracking, session history",
    systemPrompt: `You are the Memory Specialist in an AI council. Your role is to recall relevant user context, preferences, and stored memories from the user_memory table. Highlight any stored information that is relevant to the current query. Output ONLY your specialist perspective.`,
    skillTriggers: ["memory"],
    keywords: [/\b(remember|recall|last time|previously|my preference|you told me|history|context)\b/i],
  },
  {
    id: "task",
    name: "TaskAgent",
    description: "Taskade operations, project management, task tracking",
    systemPrompt: `You are the Task Management Specialist in an AI council. Handle Taskade operations: creating tasks, listing tasks, managing projects, and coordinating with agents. Output ONLY your specialist perspective.`,
    skillTriggers: ["taskade"],
    keywords: [/\b(task|todo|project|assign|deadline|taskade|workflow|kanban|sprint)\b/i],
  },
  {
    id: "creative",
    name: "CreativeAgent",
    description: "Image generation, writing, brainstorming, content creation",
    systemPrompt: `You are the Creative Specialist in an AI council. Handle creative tasks: content writing, brainstorming, image descriptions, storytelling, and ideation. Be imaginative and original. Output ONLY your specialist perspective.`,
    skillTriggers: ["image_generation"],
    keywords: [/\b(create|design|write|story|image|picture|brainstorm|idea|creative|art|generate|compose|draft)\b/i],
  },
];

// ── Complexity Detection ──

interface RouteDecision {
  useCouncil: boolean;
  agents: AgentSpec[];
  reason: string;
}

export function routeQuery(
  userMessage: string,
  enabledSkills: string[],
): RouteDecision {
  // Simple messages skip the council
  const simplePatterns = [
    /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|bye|goodbye|good morning|good night)\b/i,
    /^.{0,15}$/,  // Very short messages
  ];

  if (simplePatterns.some((p) => p.test(userMessage.trim()))) {
    return { useCouncil: false, agents: [], reason: "simple-message" };
  }

  // Determine relevant agents
  const relevantAgents: AgentSpec[] = [];

  for (const agent of AGENTS) {
    // Check skill triggers
    const hasSkillTrigger = agent.skillTriggers.some((s) => enabledSkills.includes(s));
    // Check keyword match
    const hasKeywordMatch = agent.keywords.some((k) => k.test(userMessage));

    if (hasSkillTrigger || hasKeywordMatch) {
      relevantAgents.push(agent);
    }
  }

  // Need at least 2 agents for council deliberation to be worthwhile
  if (relevantAgents.length < 2) {
    return { useCouncil: false, agents: relevantAgents, reason: "single-domain" };
  }

  // Cap at 3 agents to control latency
  const selected = relevantAgents.slice(0, 3);

  return {
    useCouncil: true,
    agents: selected,
    reason: `multi-domain: ${selected.map((a) => a.id).join(",")}`,
  };
}

// ── Agent Execution ──

interface AgentResult {
  agentId: string;
  agentName: string;
  output: string;
  latencyMs: number;
  error?: string;
}

async function callAgent(
  agent: AgentSpec,
  userMessage: string,
  conversationContext: string,
  apiKey: string,
  model: string,
): Promise<AgentResult> {
  const start = Date.now();

  try {
    const resp = await fetch(LOVABLE_AI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: agent.systemPrompt },
          { role: "user", content: `${conversationContext}\n\nCurrent question: ${userMessage}` },
        ],
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return {
        agentId: agent.id,
        agentName: agent.name,
        output: "",
        latencyMs: Date.now() - start,
        error: `HTTP ${resp.status}: ${t.slice(0, 100)}`,
      };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";

    return {
      agentId: agent.id,
      agentName: agent.name,
      output: content,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      agentId: agent.id,
      agentName: agent.name,
      output: "",
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : "Unknown",
    };
  }
}

// ── Council Merger ──

async function mergeResults(
  agentResults: AgentResult[],
  originalMessage: string,
  systemPrompt: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const validResults = agentResults.filter((r) => r.output && !r.error);

  if (validResults.length === 0) {
    return ""; // Fall back to direct response
  }

  if (validResults.length === 1) {
    // Single agent — no merge needed
    return validResults[0].output;
  }

  const specialistOutputs = validResults
    .map((r) => `### ${r.agentName} Analysis\n${r.output}`)
    .join("\n\n---\n\n");

  const mergePrompt = `You are the Council Merger. Multiple specialist agents have analyzed the user's question from different perspectives. Synthesize their outputs into a single, coherent, well-structured response.

Rules:
- Combine insights from all specialists without redundancy
- Maintain a natural, unified voice (don't mention "agents" or "specialists")
- Prioritize accuracy and completeness
- Use proper markdown formatting
- If specialists disagree, present both viewpoints fairly

## Specialist Outputs

${specialistOutputs}

## Original User Question

${originalMessage}`;

  try {
    const resp = await fetch(LOVABLE_AI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mergePrompt },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) return validResults.map((r) => r.output).join("\n\n---\n\n");

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || validResults.map((r) => r.output).join("\n\n");
  } catch {
    // Fallback: concatenate results
    return validResults.map((r) => `**${r.agentName}:**\n${r.output}`).join("\n\n---\n\n");
  }
}

// ── Public API ──

export interface CouncilResult {
  content: string;
  agentsUsed: string[];
  totalLatencyMs: number;
  agentResults: AgentResult[];
  merged: boolean;
}

/**
 * Run the Agent Council.
 * Fans out to specialist agents in parallel, then merges their outputs.
 */
export async function runCouncil(
  agents: AgentSpec[],
  userMessage: string,
  conversationContext: string,
  systemPrompt: string,
  apiKey: string,
  model: string,
): Promise<CouncilResult> {
  const start = Date.now();

  // Run all agents in parallel
  const results = await Promise.all(
    agents.map((agent) =>
      callAgent(agent, userMessage, conversationContext, apiKey, model)
    ),
  );

  // Log agent performance
  for (const r of results) {
    if (r.error) {
      console.warn(`Agent ${r.agentName} failed (${r.latencyMs}ms):`, r.error);
    } else {
      console.log(`Agent ${r.agentName} completed in ${r.latencyMs}ms`);
    }
  }

  // Merge results
  const merged = await mergeResults(results, userMessage, systemPrompt, apiKey, model);

  return {
    content: merged,
    agentsUsed: results.filter((r) => !r.error).map((r) => r.agentId),
    totalLatencyMs: Date.now() - start,
    agentResults: results,
    merged: results.filter((r) => !r.error).length > 1,
  };
}
