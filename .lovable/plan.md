

## Plan: Set Zephel Fast as Default Model for Guest Visitors

**What**: Change the default model initialization so unauthenticated visitors start with `zephel/zephel-fast` instead of the first model in `ALL_MODEL_GROUPS` (currently a Google model).

**Change** (single file: `src/pages/Chat.tsx`):

1. Update the `useState` initializer for `model` (line 177) to check auth status and default guests to `"zephel/zephel-fast"`:
   - Since `user` from `useAuth` is available at component level, set initial state to `"zephel/zephel-fast"` for guests
   - Keep the existing `useEffect` that loads `default_model` from user settings for authenticated users, which will override this default

2. Specifically, change line 177 from:
   ```typescript
   const [model, setModel] = useState(ALL_MODEL_GROUPS[0].models[0].value);
   ```
   to a conditional that uses `"zephel/zephel-fast"` when `!user`, falling back to the current default otherwise. Since `user` may not be resolved yet on first render, we'll also add a small effect: when `user` is confirmed null (guest), set model to `"zephel/zephel-fast"` if it hasn't been changed.

This is a one-line change with minimal risk.

