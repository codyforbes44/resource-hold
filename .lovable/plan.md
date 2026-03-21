

## Comprehensive Platform Integration Plan

### Context
Three uploaded assets need integration: **11 AI personalities** (from CSV), **92 knowledge base documents** (already in DB), and the **zephel-ccol-main.zip** source archive. Combined with existing issues in the codebase (567-line Chat.tsx monolith, no personality system, image generation just fixed), this plan covers a systematic refactor.

---

### Phase 1: Personalities System (Database + Backend + UI)

**1a. Create `personalities` table (migration)**
```sql
CREATE TABLE public.personalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  system_prompt_modifier text NOT NULL DEFAULT '',
  icon text DEFAULT 'sparkles',
  color text DEFAULT 'hsl(var(--primary))',
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.personalities ENABLE ROW LEVEL SECURITY;
-- Everyone can read
CREATE POLICY "Anyone can read personalities" ON public.personalities FOR SELECT TO public USING (true);
-- Admins can manage
CREATE POLICY "Admins manage personalities" ON public.personalities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
```

**1b. Seed the 11 personalities from CSV**
Insert the personalities data (Default, Coder, Analyst, Creative Writer, Security, Strategist, etc.) via a migration with their full system prompt modifiers.

**1c. Update chat edge function (`supabase/functions/chat/index.ts`)**
- Accept optional `personality_id` in request body
- Fetch the personality's `system_prompt_modifier` from DB
- Prepend it to the tier-specific system prompt
- This way personalities layer on top of model tiers (e.g., "Coder" personality + "gClaw Thinking" tier)

**1d. Add personality selector to Chat UI**
- Create `src/components/chat/PersonalitySelector.tsx` -- a dropdown/popover in the top bar next to the model selector
- Fetch personalities from DB on mount
- Store selected personality in conversation metadata (add `personality_id` column to `conversations` table)
- Show personality icon + name, with description tooltip

**1e. Admin personality management**
- Add "Personalities" tab to Admin dashboard
- CRUD operations: create, edit, delete, reorder personalities
- Add `manage_personality` actions to `admin-data` edge function

### Phase 2: Chat.tsx Decomposition

Break the 567-line monolith into focused hooks:

**2a. `src/hooks/useConversations.ts`**
- All conversation CRUD (create, delete, rename, load, migrate from localStorage)
- Realtime subscription
- ~120 lines extracted

**2b. `src/hooks/useChatStreaming.ts`**
- `processStream`, `buildHeaders`, `updateStreamingMessage`, `send`, `regenerateMessage`
- AbortController management
- ~120 lines extracted

**2c. `src/hooks/useTTS.ts`**
- `speakMessage`, `stripMarkdown`, `copyMessage`, auto-read logic
- Audio ref management
- ~60 lines extracted

**2d. Slim down `Chat.tsx`**
- Becomes a ~150-line orchestrator composing the three hooks
- Cleaner prop threading to child components

### Phase 3: Knowledge Base Improvements

**3a. Add `category` column to `knowledge_documents`**
```sql
ALTER TABLE public.knowledge_documents ADD COLUMN category text DEFAULT 'general';
```
- The CSV shows 16 categories (ai-models, research-papers, mlops-deployment, etc.)
- Update existing documents with their categories via migration

**3b. Update Admin KB tab with category filter**
- Add category dropdown filter alongside status filter
- Show category badges on document cards
- Allow setting category on URL ingestion and file upload

**3c. Update admin-data edge function**
- Add category to KB document responses
- Add `update_kb_doc_category` action

### Phase 4: Edge Function Hardening

**4a. Clean up Zephel references**
- Remove `PROVIDER_CONFIG.zephel` from Admin.tsx
- Remove any dead Zephel-related code paths

**4b. Image generation reliability**
- The storage-based fix is in place; verify the `IMAGE_URL:` prefix handling works end-to-end
- Add error boundary around image rendering in MarkdownRenderer

**4c. SSE stream robustness**
- In `processStream` on the frontend, add a safety limit to prevent infinite re-buffering of unparseable lines (max 3 retries per line before discarding)

### Phase 5: Conversations Table Update

**5a. Migration: add `personality_id` to conversations**
```sql
ALTER TABLE public.conversations ADD COLUMN personality_id uuid REFERENCES public.personalities(id) ON DELETE SET NULL;
```

---

### Files to Create
- `src/hooks/useConversations.ts`
- `src/hooks/useChatStreaming.ts`
- `src/hooks/useTTS.ts`
- `src/components/chat/PersonalitySelector.tsx`
- `src/components/admin/PersonalitiesTab.tsx`
- 3 migrations (personalities table + seed, category column, conversation personality_id)

### Files to Modify
- `supabase/functions/chat/index.ts` -- accept personality_id, fetch prompt modifier
- `supabase/functions/admin-data/index.ts` -- personality CRUD actions, category management
- `src/pages/Chat.tsx` -- decompose into hooks, add personality selector
- `src/pages/Admin.tsx` -- add Personalities tab, remove Zephel references
- `src/components/admin/KnowledgeBaseTab.tsx` -- add category filter
- `src/components/chat/MarkdownRenderer.tsx` -- image error boundary

### Execution Order
1. Migrations (personalities table + seed, category column, conversation personality_id)
2. Edge function updates (chat + admin-data)
3. Chat.tsx decomposition (hooks extraction)
4. UI components (PersonalitySelector, PersonalitiesTab, KB category filter)
5. Cleanup (Zephel refs, SSE hardening)

