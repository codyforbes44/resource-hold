

## Add LangSmith Observability Tracing to Chat Edge Function

### What
Instrument the `chat` edge function with LangSmith tracing to monitor all LLM calls, tool executions, token usage, latency, and errors. Uses the `LANGCHAIN_API_KEY` secret already configured.

### How
LangSmith's REST API allows lightweight tracing without importing the full LangChain SDK (which is heavy and Node-oriented). We'll use direct HTTP calls to the LangSmith API to create trace runs.

### Changes

#### 1. Update `supabase/functions/chat/index.ts`
Add a lightweight tracing utility (~60 lines) at the top of the file:

- **`createRun()`** -- POST to `https://api.smith.langchain.com/runs` to start a trace run (type: `llm`, `tool`, or `chain`)
- **`patchRun()`** -- PATCH to update a run with outputs, token counts, error, and end_time
- **`traceWrapper()`** -- helper that wraps an async function, creating a run before and patching it after

Instrument these call sites:
- **Main chain run** -- wraps the entire request (parent run, type `chain`)
- **LLM calls** -- both the no-tools streaming call and the tool-use non-streaming call + final streaming call (child runs, type `llm`, capturing model, token counts from response headers)
- **Tool executions** -- each `executeTool()` call (child runs, type `tool`, capturing input args and output)

Tracing is **fire-and-forget** -- errors in tracing are caught and logged but never block the chat response. If `LANGCHAIN_API_KEY` is not set, tracing is silently skipped.

#### 2. Environment
- `LANGCHAIN_API_KEY` -- already configured as a runtime secret
- LangSmith project name defaults to `"gclaw-chat"` (configurable via `LANGSMITH_PROJECT` env var if needed later)

### No other files changed
This is purely a backend observability addition. No frontend, no database, no new edge functions.

