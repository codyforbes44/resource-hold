

## Plan: Switch to Direct API Keys for Primary Gateway

### What changes

Replace all `AI_GATEWAY` (Lovable AI Gateway) calls in the two edge functions with direct calls to the OpenAI and Google Gemini APIs using the `OPENAI_API_KEY` and `GEMINI_API_KEY` secrets already configured.

### 1. `supabase/functions/chat/index.ts`

- Remove `AI_GATEWAY` constant and `LOVABLE_API_KEY` dependency for primary chat
- Add a router function that picks the correct API endpoint + key based on model prefix:
  - `google/*` models → `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` with `GEMINI_API_KEY` (Google's OpenAI-compatible endpoint)
  - `openai/*` models → `https://api.openai.com/v1/chat/completions` with `OPENAI_API_KEY`
- Strip the `google/` or `openai/` prefix when calling Google's endpoint (e.g. `google/gemini-3-flash-preview` → `gemini-3-flash-preview`)
- For OpenAI models, strip `openai/` prefix (e.g. `openai/gpt-5` → `gpt-5`)
- Update all 3 fetch call sites (streaming no-tools, initial tool call, final streaming) to use the router
- Keep `LOVABLE_API_KEY` as fallback only for image generation (which uses a Lovable-specific model/modality)
- Update `executeKnowledgeSearch` embedding generation to use Gemini directly
- Update `executeImageGeneration` to use Gemini API directly with `GEMINI_API_KEY`

### 2. `supabase/functions/knowledge-upload/index.ts`

- Replace `AI_GATEWAY` + `LOVABLE_API_KEY` with direct Gemini API call using `GEMINI_API_KEY`
- Update `generateEmbedding` function to call `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` with the Gemini key

### 3. Model name mapping

| Frontend model | API endpoint | Actual model name sent |
|---|---|---|
| `google/gemini-3-flash-preview` | Gemini | `gemini-3-flash-preview` |
| `google/gemini-2.5-flash` | Gemini | `gemini-2.5-flash` |
| `google/gemini-2.5-pro` | Gemini | `gemini-2.5-pro` |
| `google/gemini-2.5-flash-lite` | Gemini | `gemini-2.5-flash-lite` |
| `google/gemini-3.1-pro-preview` | Gemini | `gemini-3.1-pro-preview` |
| `openai/gpt-5-mini` | OpenAI | `gpt-5-mini` |
| `openai/gpt-5` | OpenAI | `gpt-5` |
| `openai/gpt-5-nano` | OpenAI | `gpt-5-nano` |
| `openai/gpt-5.2` | OpenAI | `gpt-5.2` |

### Key detail

Google provides an OpenAI-compatible chat completions endpoint, so both providers use the same request/response format — no structural changes to the request body or SSE parsing needed. The only difference is the URL and auth header.

