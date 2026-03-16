

## Plan: Add Zephel Custom LLM Provider

### Overview
Add the Zephel API as a third LLM provider alongside Google and OpenAI. The Zephel endpoint uses standard OpenAI-compatible format (messages + stream), so integration is straightforward.

### Step 0: Store the API key
Use `add_secret` to securely store `ZEPHEL_API_KEY` (the `zph_...` bearer token).

### Step 1: Backend -- `supabase/functions/chat/index.ts`

- Add `ZEPHEL_ENDPOINT = "https://nvfszndwhgtjlxtclowb.supabase.co/functions/v1/external-chat"`
- Update `getApiConfig()` to handle `zephel/*` prefix models:
  - `zephel/zephel` → model name `zephel`, uses `ZEPHEL_API_KEY`
  - `zephel/zephel-pro` → model name `zephel-pro`
  - `zephel/zephel-fast` → model name `zephel-fast`
- Update `validateModel()` to include the three Zephel models in the allowed list
- Zephel auth uses `Bearer zph_KEY` format (same as standard Bearer auth, no changes needed)

### Step 2: Frontend -- `src/pages/Chat.tsx` and `src/pages/Settings.tsx`

Add Zephel models to the `MODELS` arrays:
- `{ value: "zephel/zephel", label: "Zephel" }`
- `{ value: "zephel/zephel-pro", label: "Zephel Pro" }`
- `{ value: "zephel/zephel-fast", label: "Zephel Fast" }`

### What stays the same
- Request/response format (OpenAI-compatible)
- SSE streaming logic
- Tool calling flow (tools will be sent if enabled; if Zephel doesn't support them, it will just ignore or respond without tool calls)

