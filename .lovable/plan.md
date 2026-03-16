

## Plan: Grey Out Incompatible Models Based on Active Skills

### Concept
Define a compatibility map between skills and models. When a user enables a skill, models that don't support that skill well get visually greyed out and become unselectable in the model dropdown.

### Skill-Model Compatibility Map
A constant mapping which skills each model supports well:

- **Web Search**: All models support it (tool calling is handled server-side)
- **Image Generation**: Only Gemini image-capable models (e.g., `gemini-3-flash-preview`, `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3.1-pro-preview`) — exclude `flash-lite`, all OpenAI, all Zephel
- **Knowledge Base (RAG)**: All models that support tool calling well — exclude `flash-lite`, `gpt-5-nano`, `zephel-fast`
- **Code Interpreter**: All models (built-in, no tool call needed)

### Changes

**`src/pages/Chat.tsx`** (single file change):

1. Add a `MODEL_SKILL_COMPAT` constant mapping each model to an array of supported skill IDs
2. Compute `incompatibleModels` from currently enabled skills — a model is incompatible if ANY enabled skill is not in its supported list
3. In the `MODEL_GROUPS` derivation, keep all allowed models but add an `isDisabled` flag
4. In the `<SelectItem>` render, apply `disabled` prop and grey-out styling (`opacity-40 cursor-not-allowed`) for incompatible models
5. If the currently selected model becomes incompatible, auto-switch to the first compatible model with a toast notification

### UI Behavior
- Greyed-out models remain visible with reduced opacity and a subtle tooltip/title explaining why
- Selecting a greyed model is blocked (`disabled` on SelectItem)
- Auto-switch only triggers when the current model becomes incompatible after toggling a skill

