

# Updated Competitive Plan: gClaw vs OpenClaw

## Gap Analysis (from reference images)

| OpenClaw Feature | gClaw Status | Actionable? |
|---|---|---|
| **Persistent Memory** ("Remembers you") | Missing | Yes — DB + skill |
| **Chat App Integrations** (Telegram, Discord, etc.) | Missing | Yes — Telegram connector ready |
| **Browser Control** (scrape, fill forms) | Missing | Yes — Firecrawl already connected |
| **Full System Access** (shell, files) | N/A | No — web app, not local agent |
| **Skills & Plugins** ("write its own") | Partial (5 skills, no marketplace) | Later phase |
| **Newsletter Signup** section | Missing from landing | Yes — DB + UI |
| **Featured In / Press** section | Missing from landing | Yes — UI only |
| **Community Links** (Discord, Docs, GitHub) | Missing from landing | Yes — UI only |

## Implementation Plan (4 workstreams)

### 1. Persistent Memory Skill

**Database migration:**
- Create `user_memory` table: `id`, `user_id` (uuid), `key` (text), `value` (text), `category` (text), `created_at`, `updated_at`
- RLS: users can only CRUD their own memories
- Enable `updated_at` trigger

**Backend (`supabase/functions/chat/index.ts`):**
- Add `store_memory` and `recall_memory` tool definitions to `SKILL_TOOLS`
- `store_memory(key, value, category)` — upserts into `user_memory`
- `recall_memory(query)` — searches user's memories by key/category match
- Update system prompt when memory skill is active: "You can remember user preferences. Proactively store important context."

**Frontend:**
- `SkillsPanel.tsx`: Add 6th skill — id `memory`, name "Memory", icon `Brain`, badge "Persistent", purple/pink color
- `Chat.tsx`: Add `memory` to `MODEL_SKILL_COMPAT` for all models except `flash-lite` and `gpt-5-nano`

### 2. Browser Control Skill

**Backend (`supabase/functions/chat/index.ts`):**
- Add `browse_page` tool definition: takes a `url` parameter, calls Firecrawl scrape API (already have the key), returns markdown content
- Reuse existing Firecrawl integration pattern from `firecrawl-search`

**Frontend:**
- `SkillsPanel.tsx`: Add 7th skill — id `browser`, name "Browser Control", icon `Globe`, badge "Firecrawl", blue color
- `Chat.tsx`: Add `browser` to `MODEL_SKILL_COMPAT` for all models that support tool calling

### 3. Landing Page: Newsletter + Press + Community

**Database migration:**
- Create `newsletter_subscribers` table: `id`, `email` (unique), `created_at`
- RLS: allow anonymous inserts, no reads (admin only via service role)

**New components:**
- `NewsletterSection.tsx`: Email input + subscribe button, calls a simple edge function or direct insert
- `PressSection.tsx`: "Featured In" cards with quotes (placeholder press mentions for gClaw)
- `CommunityLinks.tsx`: Discord, Docs, GitHub, gClaw Hub cards

**Update `Index.tsx`:** Add these 3 sections before Footer

### 4. Update Landing Content for New Capabilities

**`src/constants/landing.ts`:**
- Add Memory and Browser Control to `CAPABILITIES` array (badge: "Live")
- Update `HERO_STATS` skill count from "4" to "7"
- Add Memory, Browser, Telegram rows to `COMPARISON_DATA`
- Update `FEATURES` array with new entries
- Add new FAQ entries for Memory and Browser skills

**`ComparisonTable.tsx`:** No code changes needed (driven by data)

## Sequencing

1. **Memory Skill** (DB + backend + frontend) — highest differentiator
2. **Browser Control Skill** (backend + frontend) — Firecrawl already connected, quick win
3. **Landing page sections** (newsletter DB + 3 new components) — marketing polish
4. **Update constants/content** — reflect all new capabilities

## Files to Create/Edit

| File | Action |
|---|---|
| DB migration (user_memory) | Create |
| DB migration (newsletter_subscribers) | Create |
| `supabase/functions/chat/index.ts` | Edit — add memory + browser tools |
| `src/components/chat/SkillsPanel.tsx` | Edit — add Memory + Browser skills |
| `src/pages/Chat.tsx` | Edit — update MODEL_SKILL_COMPAT |
| `src/components/landing/NewsletterSection.tsx` | Create |
| `src/components/landing/PressSection.tsx` | Create |
| `src/components/landing/CommunityLinks.tsx` | Create |
| `src/pages/Index.tsx` | Edit — add new sections |
| `src/constants/landing.ts` | Edit — update capabilities, stats, comparison, FAQs |

