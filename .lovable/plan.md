

## Make `/chat` the Homepage & Refactor Navigation

### What
Make the chat interface the root route (`/`), remove the separate Landing page, and update all navigation references accordingly.

### Changes

#### 1. Update `src/App.tsx` — Route changes
- Change Chat from `/chat` to `/`
- Remove the Landing route entirely
- Remove the Landing lazy import
- Keep all other routes (`/auth`, `/settings`, `/admin`, `/reset-password`)

#### 2. Delete `src/pages/Landing.tsx`
- No longer needed since chat is the homepage

#### 3. Update `src/pages/Auth.tsx`
- Change `navigate("/chat")` → `navigate("/")`

#### 4. Update `src/components/AppShell.tsx`
- Change default `backTo` prop from `"/chat"` to `"/"`

#### 5. Update `src/components/chat/ChatSidebar.tsx`
- Update any `/chat` links to `/`

#### 6. Update `src/components/chat/ChatMessages.tsx`
- `/auth` links remain as-is (correct)

#### 7. Update `src/hooks/useConversations.ts`
- No changes needed (no routing references)

#### 8. Update `public/sitemap.xml` and `public/manifest.json`
- Update start_url and sitemap entries to reflect `/` as the main page, remove `/chat`

### Files
- `src/App.tsx` — reroute `/` to Chat, drop Landing
- `src/pages/Landing.tsx` — delete
- `src/pages/Auth.tsx` — fix redirect
- `src/components/AppShell.tsx` — fix backTo default
- `src/components/chat/ChatSidebar.tsx` — fix any `/chat` refs
- `public/sitemap.xml`, `public/manifest.json` — update URLs

