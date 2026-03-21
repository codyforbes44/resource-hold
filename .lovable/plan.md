

## Comprehensive Platform Refactor: Landing, Pages, Admin Dashboard & Knowledge Base Management

### Overview
Refactor the entire platform for production-quality UX across all device types (mobile-first), add a proper public landing page (currently the app jumps straight to chat), and extend the admin dashboard with full knowledge base control capabilities.

### Current Issues
- No dedicated landing/marketing page -- visitors land directly in the chat UI
- Admin dashboard lacks knowledge base management (view docs, trigger refresh, delete, add URLs)
- Chat page is a 567-line monolith mixing concerns
- Mobile UX gaps: sidebar actions require hover (unusable on touch), tab labels overflow on small screens, no swipe gestures
- No consistent page shell/layout component -- each page duplicates header boilerplate
- Settings/Auth pages lack responsive polish for small devices

---

### Changes

#### 1. Create Public Landing Page (`src/pages/Landing.tsx`)
A marketing-quality landing page for unauthenticated visitors:
- Hero section with animated gradient mesh, headline, CTA buttons (Try Now / Sign Up)
- Feature cards highlighting skills (Web Search, Knowledge Base, Voice, etc.)
- Model tier showcase (gClaw, Flash, Nano, Thinking)
- Social proof / stats section
- Footer with links
- Mobile-first responsive grid, touch-friendly CTAs (min 44px tap targets)
- Update routing: `/` renders Landing for guests, Chat for authenticated users

#### 2. Create Shared Layout Shell (`src/components/AppShell.tsx`)
Extract the repeated header pattern (back button, logo, title, theme toggle) into a reusable layout component:
- Consistent header height, logo placement, nav actions
- Responsive padding and safe-area-inset support
- Used by Settings, Admin, and other non-chat pages

#### 3. Refactor Admin Dashboard (`src/pages/Admin.tsx`)
Add a **Knowledge Base** tab alongside existing tabs (Users, Models, Chats, Audit, System):

**Knowledge Base Admin Tab:**
- View all documents across all users (filename, source_url, status, chunk_count, user, created_at)
- Search/filter by status, user, or filename
- Delete documents (with chunk cleanup)
- Add URLs for ingestion (calls `knowledge-batch-ingest` function)
- Trigger manual refresh of all URL-based documents (calls `knowledge-refresh` function)
- View cron job status / last refresh timestamp
- Bulk actions: delete stuck "processing" docs, retry failed docs

**Admin Edge Function Updates (`supabase/functions/admin-data/index.ts`):**
- Add knowledge base data to GET response (documents, chunks stats)
- Add POST actions: `delete_kb_doc`, `add_kb_url`, `trigger_kb_refresh`, `bulk_cleanup_kb`

**Other Admin Improvements:**
- Tab layout: change from 5-col grid to scrollable horizontal tabs on mobile
- Stats cards: add KB stats (total docs, total chunks, pending/error counts)
- Better mobile card layouts with stacked actions

#### 4. Mobile-First UX Improvements (All Pages)

**Chat Page:**
- Sidebar conversation actions: replace hover-only with long-press or always-visible icon buttons on mobile
- Model selector: full-width on mobile with description visible
- Skills panel drawer: larger touch targets, better spacing

**Auth Page:**
- Add safe-area padding for notched devices
- Improve form field sizing for mobile keyboards

**Settings Page:**
- Tabs: use icon-only on small screens with tooltips
- Form inputs: proper mobile keyboard types

**Global:**
- Add `viewport-fit=cover` meta tag for notched devices
- Ensure all interactive elements have min 44x44px touch targets (audit existing)
- Add `safe-area-inset` padding to fixed/sticky elements

#### 5. Chat Page Decomposition
Break the 567-line Chat.tsx into focused hooks for maintainability:
- `useConversations` hook (CRUD, migration, realtime)
- `useChatStreaming` hook (send, regenerate, stream processing)
- `useTTS` hook (speak, auto-read)
- Keep Chat.tsx as a thin orchestrator composing these hooks

---

### Files to Create
- `src/pages/Landing.tsx` -- public marketing landing page
- `src/components/AppShell.tsx` -- shared page layout shell
- `src/hooks/useConversations.ts` -- conversation management hook
- `src/hooks/useChatStreaming.ts` -- streaming chat hook
- `src/hooks/useTTS.ts` -- TTS hook
- `src/components/admin/KnowledgeBaseTab.tsx` -- KB admin tab component

### Files to Modify
- `src/App.tsx` -- add Landing route, conditional `/` routing
- `src/pages/Chat.tsx` -- decompose into hooks, UX improvements
- `src/pages/Admin.tsx` -- add KB tab, mobile tab improvements, use AppShell
- `src/pages/Settings.tsx` -- use AppShell, mobile improvements
- `src/pages/Auth.tsx` -- mobile polish
- `src/components/chat/ChatSidebar.tsx` -- mobile action visibility
- `supabase/functions/admin-data/index.ts` -- KB management actions
- `index.html` -- viewport-fit meta tag

### Technical Notes
- No new database tables needed; all KB data already in `knowledge_documents` and `knowledge_chunks`
- KB admin actions use service-role via existing `admin-data` edge function pattern
- Landing page uses existing CSS utilities (hero-mesh, glow-brand, text-gradient-brand)

