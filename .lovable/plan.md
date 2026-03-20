

## Consolidate Models into 4 Branded Tiers: gClaw, gClaw Flash, gClaw Nano, gClaw Thinking

### Current Problem

The model selector exposes 15 raw provider models across 4 groups (Google, OpenAI, Zephel, Anthropic). This is confusing for users, leaks implementation details, and creates inconsistent skill support — some models only get 2 of 7 skills.

### Proposed Architecture

Replace all raw models with 4 branded tiers. Each tier maps to optimal backend models and supports ALL 7 skills universally.

```text
┌─────────────────┬──────────────────────────────────┬──────────────────────┐
│ Tier            │ Primary Backend Model            │ Personality          │
├─────────────────┼──────────────────────────────────┼──────────────────────┤
│ gClaw           │ google/gemini-3-flash-preview    │ Balanced all-rounder │
│ gClaw Flash     │ google/gemini-2.5-flash          │ Fast, efficient      │
│ gClaw Nano      │ google/gemini-2.5-flash-lite     │ Lightweight, instant │
│ gClaw Thinking  │ google/gemini-2.5-pro            │ Deep reasoning       │
└─────────────────┴──────────────────────────────────┴──────────────────────┘
```

All 4 tiers get ALL 7 skills (web search, code interpreter, image generation, knowledge base, deep research, memory, browser). When a lightweight model (Nano/Flash) can't handle a skill natively, the edge function uses the skill's dedicated executor (e.g., image gen always uses Gemini image model regardless of tier).

### Changes

#### 1. `src/lib/models.ts` — Rewrite model config

Replace `ALL_MODEL_GROUPS` (15 models, 4 groups) with a flat `GCLAW_MODELS` array of 4 tiers. Each has `value` (sent to edge function), `label`, `description`, and `icon` hint. Remove `MODEL_SKILL_COMPAT` — all tiers support all skills. Remove `getIncompatibleSkills` and `getFilteredModelGroups`.

Add a `MODEL_BACKEND_MAP` export mapping tier values to actual provider model strings (used only by the edge function, but defined centrally for reference).

#### 2. `supabase/functions/chat/index.ts` — Add tier routing

Add a `resolveModel()` function that maps tier values to actual provider models:
- `gclaw/default` → `google/gemini-3-flash-preview`
- `gclaw/flash` → `google/gemini-2.5-flash`
- `gclaw/nano` → `google/gemini-2.5-flash-lite`
- `gclaw/thinking` → `google/gemini-2.5-pro`

Update `validateModel()` to accept the 4 tier values. Update `getApiConfig()` to work with resolved models. All tiers route through the Lovable AI gateway / Gemini — no need for OpenAI/Anthropic/Zephel keys for core operation.

#### 3. `src/pages/Chat.tsx` — Simplify model selector

Replace the grouped `SelectGroup` dropdown with a flat list of 4 options. Remove all skill-compatibility warning UI (AlertTriangle badges, disabled states, tooltips) since all tiers support all skills. Remove the auto-switch-model-on-skill-toggle effect.

Default model: `gclaw/default` for authenticated users, `gclaw/nano` for guests.

#### 4. `src/components/settings/PreferencesTab.tsx` — Update preferences

Replace grouped model select with the 4 tiers. Add descriptions for each tier so users understand the tradeoff.

#### 5. `src/components/chat/SkillsPanel.tsx` — No compatibility warnings needed

Skills panel stays as-is since all models now support all skills.

#### 6. Database migration — Update `model_access_defaults`

Insert the 4 new tier keys and remove the 15 old ones:
- `gclaw/default` — enabled: true, visitor: true
- `gclaw/flash` — enabled: true, visitor: true
- `gclaw/nano` — enabled: true, visitor: true
- `gclaw/thinking` — enabled: true, visitor: false (premium)

#### 7. Edge function system prompt per tier

Each tier gets a tailored system prompt personality:
- **gClaw**: Balanced, helpful, conversational
- **gClaw Flash**: Concise, direct, minimal prose
- **gClaw Nano**: Ultra-brief, efficient answers
- **gClaw Thinking**: Thorough, analytical, shows reasoning steps

### Files to change
- `src/lib/models.ts` — rewrite
- `src/pages/Chat.tsx` — simplify selector, remove compat logic
- `src/components/settings/PreferencesTab.tsx` — update selector
- `supabase/functions/chat/index.ts` — add tier routing, per-tier prompts
- Database migration — swap model_access_defaults rows

### No breaking changes to
- Skills system (all skills work with all tiers)
- Chat storage / conversations (model field stores tier value)
- TTS, voice agent, knowledge base, memory

