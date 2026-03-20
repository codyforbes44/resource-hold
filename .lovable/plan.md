

## Claude API Integration — Capabilities & Plan

### What Claude API Offers

Claude (by Anthropic) provides several capabilities relevant to your gClaw platform:

1. **Chat Completions** — High-quality text generation with up to 200K token context window, larger than most competitors. Excellent for long document analysis and extended conversations.

2. **Tool/Function Calling** — Native support, fully compatible with your existing skills architecture (web search, knowledge base, memory, etc.).

3. **Vision** — Analyze images, screenshots, diagrams, and documents sent as part of the conversation. Users could paste images into chat.

4. **Extended Thinking** — Claude can show its reasoning process step-by-step before answering, useful for complex analysis tasks.

5. **PDF & Document Understanding** — Native ability to process uploaded documents directly in the message context.

6. **Streaming** — SSE streaming compatible with your existing frontend parser.

### Recommended Integration Plan

Add Claude as a fourth model provider alongside Google, OpenAI, and Zephel.

#### 1. Update Chat Edge Function (`supabase/functions/chat/index.ts`)
- Add `ANTHROPIC_ENDPOINT` constant (`https://api.anthropic.com/v1/messages`)
- Extend `getApiConfig()` to route `anthropic/` prefixed models
- Add an adapter layer since Anthropic uses a different API format than OpenAI-compatible endpoints:
  - Convert OpenAI-style `messages` to Anthropic format (system prompt is a top-level param, not a message)
  - Convert Anthropic's SSE response format (`content_block_delta`) back to OpenAI-style `delta.content` for the frontend
  - Map tool calls between formats
- Add Claude models to `validateModel()` allowlist

#### 2. Update Model Selector (`src/components/settings/PreferencesTab.tsx` & `src/components/chat/SkillsPanel.tsx`)
- Add an "Anthropic" group to `MODEL_GROUPS` with models:
  - `anthropic/claude-sonnet-4` — Best balance of speed and quality
  - `anthropic/claude-opus-4` — Highest capability
  - `anthropic/claude-haiku-3.5` — Fastest and cheapest
- Update model compatibility rules if any skills are unsupported

#### 3. Add Model Access Defaults (Database Migration)
- Insert default access rows for the new Claude models in `model_access_defaults`

### Technical Considerations
- Anthropic's API is **not** OpenAI-compatible — requires a translation layer in the edge function for both request and response formats
- Anthropic uses `x-api-key` header instead of `Authorization: Bearer`
- Streaming events use `content_block_delta` type instead of `choices[0].delta.content`
- Tool calling format differs slightly but is mappable to your existing structure
- All existing skills (web search, knowledge base, memory, browser, image gen, deep research) would work with Claude through the translation layer

