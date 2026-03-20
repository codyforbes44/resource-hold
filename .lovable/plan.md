

## Completed: Comprehensive Refactor + Claude Integration

### What Was Done

1. **Shared model config** (`src/lib/models.ts`) — Single source of truth for ALL_MODEL_GROUPS, MODEL_SKILL_COMPAT, SKILL_LABELS, with helpers `getIncompatibleSkills()` and `getFilteredModelGroups()`. Claude Sonnet 4 and Opus 4 now support `image_generation`.

2. **Chat.tsx refactored** from 1378 → ~310 lines via extraction:
   - `src/lib/chat-storage.ts` — localStorage helpers
   - `src/lib/models.ts` — model config
   - `src/components/chat/ChatSidebar.tsx` — sidebar with search, nav, conversation list
   - `src/components/chat/ChatMessages.tsx` — message list, empty state, suggested prompts
   - `src/components/chat/ChatInput.tsx` — auto-resizing textarea (grows up to 6 rows), Enter to send, Shift+Enter for newline
   - `src/components/chat/MessageActions.tsx` — copy, TTS, regenerate, delete per message

3. **Mobile UX fixes**:
   - Message actions: tap-to-reveal on mobile (replaces broken `group-hover`)
   - Auto-resizing textarea replaces single-line input
   - Skills panel defaults to closed
   - Active skills indicator moved inside input area

4. **Edge function hardened**:
   - Malformed `tool_calls` arguments gracefully handled with try/catch
   - Anthropic adapter `tool_use` block parsing guards against non-JSON input

5. **PreferencesTab** now imports from shared `ALL_MODEL_GROUPS` — no duplication.
