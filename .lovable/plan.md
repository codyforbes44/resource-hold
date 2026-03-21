

## Agent Council + LangChain Orchestration

### Current State

- **Agent Council**: Multi-agent deliberation framework with 5 specialist agents (Code, Research, Memory, Task, Creative)
- **LangSmith**: REST-based observability tracing with full chain/agent/tool hierarchy
- **TIMP**: Proprietary knowledge base document indexed via RAG (3 chunks in `knowledge_documents`). Surfaced automatically via the `search_knowledge` tool when users ask about it. No external TIMP service — no HTTP client needed.
- **Knowledge Base RAG**: Handles all document retrieval including TIMP documentation

### Architecture

```text
User Message
     │
     ▼
┌─────────────────────────────────┐
│        Agent Council Router     │  ← Determines which agents to consult
│   (Complexity + skill analysis) │
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
     │  LangSmith Trace  │  ← Full chain traced
     └──────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `supabase/functions/chat/index.ts` | Main chat handler with tool execution, LangSmith tracing, council routing |
| `supabase/functions/chat/agent-council.ts` | Agent Council framework: routing, specialist agents, merger |

### TIMP as Knowledge Base

TIMP documentation is stored as a knowledge base document (`.txt` file, 3 chunks, status: ready). When users ask about TIMP, the `search_knowledge` tool retrieves relevant chunks via vector similarity search. No external TIMP API service exists or is needed.
