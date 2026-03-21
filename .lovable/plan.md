

## Agent Council + LangChain + TIMP Orchestration

### Current State

- **Single-agent architecture**: One LLM call with optional tool use, no multi-agent deliberation
- **LangSmith**: REST-based observability tracing (fire-and-forget), not LangChain SDK
- **TIMP**: Documentation exists in the knowledge base as reference text, but no live integration with a TIMP service instance
- **No Agent Council pattern**: All requests go through one model with one system prompt

### What Needs to Change

The "Agent Council" pattern requires multiple specialized agents that deliberate before producing a final response. LangChain provides the orchestration framework, and TIMP provides temporal session memory and semantic search across historical interactions.

### Architecture

```text
User Message
     │
     ▼
┌─────────────────────────────────┐
│        Agent Council Router     │  ← Determines which agents to consult
│   (LangChain AgentExecutor)     │
└──────────┬──────────────────────┘
           │
     ┌─────┼─────┬─────────┐
     ▼     ▼     ▼         ▼
  ┌─────┐ ┌────┐ ┌──────┐ ┌──────────┐
  │Coder│ │Res.│ │Memory│ │Taskade   │
  │Agent│ │Agt.│ │Agent │ │Agent     │
  └──┬──┘ └─┬──┘ └──┬───┘ └────┬─────┘
     │      │       │           │
     └──────┴───┬───┴───────────┘
                ▼
     ┌──────────────────┐
     │  Council Merger   │  ← Synthesizes agent outputs
     │  (Final LLM call) │
     └────────┬─────────┘
              │
              ▼
     ┌──────────────────┐
     │  TIMP Session     │  ← Stores interaction for future retrieval
     │  (Post-response)  │
     └──────────────────┘
              │
              ▼
     ┌──────────────────┐
     │  LangSmith Trace  │  ← Full chain traced
     └──────────────────┘
```

### Implementation Plan

#### Phase 1: TIMP Client Integration (Edge Function)

**File: `supabase/functions/chat/timp-client.ts`** (new)

- `TIMPClient` class with configurable base URL (`TIMP_BASE_URL` secret)
- Methods: `createSession()`, `searchSessions()`, `getSession()`, `getStats()`
- Authentication via `TIMP_API_KEY` secret
- Fire-and-forget session storage after each interaction (non-blocking)
- Semantic search before agent deliberation to pull relevant historical context

**Required secrets**: `TIMP_BASE_URL`, `TIMP_API_KEY`
- Graceful no-op if not configured (like current LangSmith pattern)

#### Phase 2: Agent Council Framework (Edge Function)

**File: `supabase/functions/chat/agent-council.ts`** (new)

Lightweight council pattern (no heavy LangChain SDK — Deno edge functions can't run full LangChain):

- **`CouncilRouter`** — Analyzes the user message to determine which specialist agents to invoke
  - Simple messages (greetings, quick facts) → skip council, direct response
  - Complex messages → fan out to 2-3 relevant agents in parallel
- **Specialist Agents** (each is a separate LLM call with a focused system prompt):
  - `CodeAgent` — programming, debugging, architecture
  - `ResearchAgent` — web search, deep research, knowledge base
  - `MemoryAgent` — recall/store user context, TIMP historical search
  - `TaskAgent` — Taskade operations, project management
  - `CreativeAgent` — image generation, writing, brainstorming
- **`CouncilMerger`** — Takes specialist outputs and synthesizes a final coherent response via one LLM call
- Each agent call is a separate LangSmith child run for full observability

#### Phase 3: Update Main Chat Handler

**File: `supabase/functions/chat/index.ts`** (modify)

- Import `AgentCouncil` and `TIMPClient`
- Before processing: query TIMP for relevant historical sessions (adds context to system prompt)
- Replace single-LLM flow with council orchestration when complexity threshold is met
- After response: store session in TIMP (fire-and-forget)
- All council steps traced as LangSmith child runs under the parent chain

**Decision logic for council activation:**
```text
if (enabledSkills.length === 0 && messageIsSimple) → direct stream (current behavior)
if (enabledSkills.length > 0 || messageIsComplex) → Agent Council
```

#### Phase 4: LangChain-Style Tracing Enhancement

**File: `supabase/functions/chat/index.ts`** (modify existing LangSmith code)

- Add `run_type: "chain"` metadata with council agent names
- Tag each specialist agent run with its role
- Include TIMP search latency and results count in trace metadata
- Add token usage tracking from response headers where available

#### Phase 5: Frontend — Council Indicator

**File: `src/components/chat/ChatMessages.tsx`** (minor update)

- When streaming