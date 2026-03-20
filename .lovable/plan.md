

## Comprehensive Refactor: Chat Experience & Claude Integration

### Problems Identified

1. **Chat.tsx is a 1378-line monolith** — state management, API logic, UI rendering, and utilities are all in one file, making it hard to maintain and test.

2. **Duplicated model definitions** — `MODEL_GROUPS` and `MODEL_SKILL_COMPAT` are defined separately in `Chat.tsx` and `PreferencesTab.tsx`. Any model change requires updating both.

3. **Message actions invisible on mobile** — Action buttons (copy, TTS, regenerate, delete) use `group-hover:flex` which does not work on touch devices. Users on mobile cannot access any message actions.

4. **No textarea for multi-line input** — The chat input is a single-line `<Input>`, preventing users from composing longer messages with line breaks.

5. **Auto-read toggle clutters the input bar** — The volume button sits between the input and send button, adding visual noise to every session regardless of whether TTS is used.

6. **Skills panel default-open wastes space** — On first load, the skills panel is open even when no skills are active, reducing the chat area width unnecessarily.

7. **Edge function Anthropic adapter missing image generation support** — Claude models are excluded from `image_generation` in `MODEL_SKILL_COMPAT` but there is no technical reason; the tool-calling adapter already handles it.

---

### Plan

#### 1. Extract shared model configuration

Create `src/lib/models.ts` containing:
- `ALL_MODEL_GROUPS` array (single source of truth)
- `MODEL_SKILL_COMPAT` map
- `SKILL_LABELS` map
- Helper: `getIncompatibleSkills(model, activeSkills)`
- Helper: `filterModelGroups(allowedModels, activeSkills)`

Update `Chat.tsx` and `PreferencesTab.tsx` to import from this shared module. Add Claude Sonnet/Opus to image generation compatibility since they support tool calling to the image gen tool.

#### 2. Refactor Chat.tsx into composable modules

Split into focused files:
- **`src/lib/chat-storage.ts`** — localStorage helpers (already isolated at top of file, just extract)
- **`src/hooks/useChatState.ts`** — Core chat state hook: conversations, messages, CRUD, streaming logic, `send()`, `regenerateMessage()`, `processStream()`
- **`src/components/chat/ChatSidebar.tsx`** — Sidebar with conversation list, search, nav links
- **`src/components/chat/ChatMessages.tsx`** — Message list rendering, empty state, suggested prompts
- **`src/components/chat/ChatInput.tsx`** — Input area with textarea, send button, auto-read toggle, character count
- **`src/components/chat/MessageActions.tsx`** — Copy, TTS, regenerate, delete actions per message

`Chat.tsx` becomes a ~150-line layout shell that composes these components.

#### 3. Fix mobile message actions

Replace `group-hover:flex` with a tap-to-reveal pattern:
- On mobile, tapping a message toggles its action bar visible (tap again or tap another message to dismiss)
- On desktop, keep the hover behavior
- Use the `useIsMobile()` hook to switch between behaviors

#### 4. Upgrade input to auto-resizing textarea

Replace `<Input>` with `<textarea>` that:
- Starts at 1 row height
- Auto-grows up to 6 rows as content is typed
- Submits on Enter (Shift+Enter for new line)
- Maintains the existing character count and placeholder logic
- Properly handles `safe-area-inset-bottom` on iOS

#### 5. Relocate auto-read toggle

Move the auto-read toggle from the input bar into the top bar alongside the model selector, or into a small popover/menu. This declutters the primary input area while keeping the feature accessible.

#### 6. Skills panel defaults to closed

Change `skillsPanelOpen` initial state to `false`. Users who want skills can open it. This maximizes chat area on all screen sizes.

#### 7. Edge function cleanup

- Add `image_generation` to Claude Sonnet 4 and Opus 4 in `MODEL_SKILL_COMPAT` (they can call the tool, which uses Gemini for actual generation)
- Add error handling for malformed `tool_calls` arguments in the Anthropic adapter (guard against non-JSON)

---

### Technical Details

**File changes:**
- Create: `src/lib/models.ts`, `src/lib/chat-storage.ts`, `src/hooks/useChatState.ts`, `src/components/chat/ChatSidebar.tsx`, `src/components/chat/ChatMessages.tsx`, `src/components/chat/ChatInput.tsx`, `src/components/chat/MessageActions.tsx`
- Edit: `src/pages/Chat.tsx` (rewrite as layout shell), `src/components/settings/PreferencesTab.tsx` (import shared models), `src/components/chat/SkillsPanel.tsx` (no changes needed)

**No database changes required.**

**No edge function redeployment needed** unless we update the Anthropic tool error handling (minor).

