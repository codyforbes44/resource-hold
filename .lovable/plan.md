

## Completed: Consolidate to 4 Branded Model Tiers

### What Was Done

1. **`src/lib/models.ts`** — Replaced 15 provider models (Google, OpenAI, Zephel, Anthropic) with 4 branded tiers:
   - `gclaw/default` → gClaw (Balanced) → `google/gemini-3-flash-preview`
   - `gclaw/flash` → gClaw Flash (Fast) → `google/gemini-2.5-flash`
   - `gclaw/nano` → gClaw Nano (Lightweight) → `google/gemini-2.5-flash-lite`
   - `gclaw/thinking` → gClaw Thinking (Deep reasoning) → `google/gemini-2.5-pro`
   - Removed `MODEL_SKILL_COMPAT`, `getIncompatibleSkills`, `getFilteredModelGroups` — all tiers support all 7 skills universally.

2. **`supabase/functions/chat/index.ts`** — Complete rewrite:
   - All requests routed through Lovable AI gateway (no more direct Gemini/OpenAI/Anthropic/Zephel API calls)
   - `resolveModel()` maps tier → backend model
   - Per-tier system prompts (balanced, concise, ultra-brief, analytical)
   - Removed Anthropic adapter, Zephel routing, multi-provider logic

3. **`src/pages/Chat.tsx`** — Simplified model selector:
   - Flat 4-item dropdown (no groups, no compat warnings)
   - Removed auto-switch-model-on-skill-toggle effect
   - Guest default: `gclaw/nano`, authenticated default: `gclaw/default`

4. **`src/components/settings/PreferencesTab.tsx`** — Updated to use `GCLAW_MODELS` with descriptions

5. **Database** — `model_access_defaults` updated:
   - Deleted all 15 old provider model rows
   - Inserted 4 new tier rows (`gclaw/thinking` requires auth)
