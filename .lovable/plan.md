

## Refactor TIMP: External Service → Knowledge Base Reference

### What's Wrong

The codebase treats TIMP as a **live external API service** with an HTTP client (`timp-client.ts`) that calls `TIMP_BASE_URL/sessions`, `TIMP_BASE_URL/search`, etc. But TIMP is actually a **proprietary knowledge base document** — a `.txt` file already ingested into the RAG system (3 chunks, status: ready). There is no live TIMP service to call.

### What Changes

1. **Delete `supabase/functions/chat/timp-client.ts`** — the entire external HTTP client is unnecessary
2. **Update `supabase/functions/chat/index.ts`** — remove all TIMP client imports, initialization, context fetching, and fire-and-forget session storage calls. The existing `search_knowledge` tool already surfaces TIMP documentation when users ask about it via RAG.
3. **Update `supabase/functions/chat/agent-council.ts`** — remove any MemoryAgent references to TIMP historical search; the MemoryAgent still handles user memory recall via the existing `user_memory` table

### What Stays the Same

- **Agent Council** — fully intact, no changes to routing/merger logic
- **LangSmith tracing** — unchanged
- **Knowledge Base RAG** — TIMP docs are already indexed and retrievable via the `search_knowledge` tool
- **MemoryAgent** — still works for user preference/context recall, just without TIMP API calls

### Files

| File | Action |
|------|--------|
| `supabase/functions/chat/timp-client.ts` | **Delete** |
| `supabase/functions/chat/index.ts` | Remove TIMP import, initialization, context fetch, and 3 `storeSessionAsync` calls |
| `.lovable/plan.md` | Update to reflect TIMP as knowledge base content, not external service |

