

# Production-Ready Release Plan — gClaw Platform

## Current State Assessment

**Complete:** Landing page (10 sections), Auth (email + Google OAuth), Chat (streaming, multi-model, skills panel), Voice Agent (ElevenLabs), Skills system (web search, image gen, knowledge base, code interpreter).

**Missing for production:** Admin dashboard, RBAC, user settings/profile, password reset flow, PWA install, mobile UX polish, conversation search, knowledge base file upload, rate limiting, and overall hardening.

---

## Implementation Plan

### 1. Database Migrations

New tables and infrastructure required:

```text
user_roles          — RBAC (admin, moderator, user) with has_role() security definer
user_settings       — theme, default model, notification prefs per user
knowledge_documents — uploaded docs metadata (user_id, filename, status, chunk_count)
knowledge_chunks    — vector embeddings for RAG (pgvector, embedding column)
audit_logs          — action, actor, target, metadata, timestamp
```

- Create `app_role` enum and `user_roles` table with RLS via `has_role()` function (per security guidelines)
- Add `knowledge_documents` storage bucket for file uploads
- Enable realtime on `conversations` table for live sidebar updates
- Add UPDATE RLS policy on `messages` table (currently missing)

### 2. Password Reset Flow

- Add "Forgot Password?" link to Auth page calling `resetPasswordForEmail` with `redirectTo: origin + '/reset-password'`
- Create `/reset-password` page that checks for `type=recovery` in URL hash and calls `updateUser({ password })`
- Add route in App.tsx

### 3. User Profile & Settings Page (`/settings`)

- Tabbed layout: **Profile** (display name, avatar upload to storage bucket) | **Preferences** (default model, theme toggle light/dark) | **Account** (change password, delete account)
- Pull from `profiles` table; save preferences to `user_settings` table
- Avatar upload via storage bucket with public read policy
- Mobile: full-screen tabs with back navigation

### 4. Admin Dashboard (`/admin`)

Protected route (only accessible to users with `admin` role via `has_role()` check).

**Sub-pages:**
- **Users** — list all profiles, assign/revoke roles, view conversation count
- **Conversations** — browse all conversations with search/filter, view message counts
- **Audit Log** — chronological feed of admin actions (role changes, deletions)
- **System** — model usage stats, active user count, skill usage breakdown

**Layout:** Sidebar navigation using shadcn Sidebar component, responsive — collapses to bottom tabs on mobile.

**Security:** All admin data fetched through a `admin-data` edge function that validates `has_role(auth.uid(), 'admin')` server-side before returning data. No client-side role checks.

### 5. Knowledge Base / RAG Skill (Full Implementation)

- Create `knowledge-upload` edge function: accepts file, parses text (PDF/docx via document parser), chunks into ~500 token segments, generates embeddings via AI gateway, stores in `knowledge_chunks`
- Update `chat` edge function's `search_knowledge` tool to query `knowledge_chunks` using vector similarity (`<=>` operator)
- Add file upload UI in Skills panel: drag-and-drop zone, upload progress, document list with delete
- Storage bucket `knowledge_documents` with user-scoped RLS

### 6. Chat UX Enhancements

- **Conversation search** — filter sidebar conversations by title with debounced input
- **Message actions** — copy, regenerate, delete individual messages
- **Conversation rename** — inline edit conversation titles in sidebar
- **Auto-title improvement** — use AI to generate a proper title after first exchange (via separate lightweight model call)
- **Code blocks** — syntax highlighting with copy button for code interpreter responses
- **Typing indicator** — animated dots while streaming
- **Empty state improvement** — suggested prompts as clickable chips

### 7. Mobile-First Responsive Overhaul

- **Chat page:** Bottom-anchored input bar with safe-area insets; swipe-right to open sidebar; touch-friendly message bubbles (min 44px tap targets)
- **Skills panel:** Convert to bottom sheet (Drawer component from vaul) on mobile instead of side panel
- **Voice agent:** Full-screen takeover on mobile with large tap targets
- **Settings/Admin:** Stack layouts, full-width cards, tab bar navigation on mobile
- **Landing page:** Verify all sections render cleanly at 320px+; reduce particle count on mobile for performance

### 8. PWA Installation

- Install `vite-plugin-pwa` and configure in `vite.config.ts` with manifest, icons, and service worker
- Add `navigateFallbackDenylist: [/^\/~oauth/]` to prevent caching OAuth redirects
- Create `/install` page with platform-specific install instructions
- Add install prompt banner on mobile after 2+ visits

### 9. Theme Toggle (Light/Dark)

- Currently hardcoded `class="dark"` on `<html>`. Add `next-themes` ThemeProvider (already in dependencies)
- Toggle button in Navbar, Settings page, and Chat top bar
- Persist preference in `user_settings` table for logged-in users, localStorage for anonymous

### 10. Security & Production Hardening

- Input validation on all forms using Zod schemas (email format, password strength, message length limits)
- Rate limiting indicator in chat (already handles 429 — add cooldown timer UI)
- CSP headers via edge function middleware
- Audit logging: wrap admin actions in `audit_logs` inserts
- Session timeout handling: detect expired sessions and redirect to auth

### 11. Edge Function Refactors

- **`chat/index.ts`**: Add request validation (max message length, max history), sanitize inputs, add usage tracking
- **`admin-data/index.ts`** (new): Server-side admin queries with role verification
- **`knowledge-upload/index.ts`** (new): File parsing + embedding pipeline
- **`knowledge-search/index.ts`** (new): Vector similarity search endpoint

### 12. Navigation & Routing Updates

```text
/              — Landing page
/auth          — Login / Signup
/reset-password — Password reset (new)
/chat          — Chat interface (protected)
/settings      — User profile & preferences (new)
/admin         — Admin dashboard (new, role-gated)
/admin/users   — User management (new)
/admin/logs    — Audit logs (new)
/install       — PWA install guide (new)
*              — 404
```

All protected routes use an `<AuthGuard>` wrapper component that checks auth state and redirects to `/auth`. Admin routes additionally check role via edge function.

---

## Implementation Order

```text
Phase A — Foundation (migrations + auth fixes)
  1. Database migrations (roles, settings, knowledge tables, audit_logs)
  2. Password reset flow
  3. AuthGuard component + route protection
  4. Theme toggle with next-themes

Phase B — User Experience
  5. User settings/profile page
  6. Chat UX enhancements (search, rename, copy, code highlighting)
  7. Mobile responsive overhaul (drawer skills, bottom input, swipe sidebar)
  8. PWA setup

Phase C — Admin & Enterprise
  9. Admin dashboard with user management
  10. Audit logging
  11. Knowledge base upload + RAG search

Phase D — Hardening
  12. Input validation across all forms
  13. Edge function security + rate limiting
  14. Final mobile QA pass
```

---

## Technical Notes

- All admin role checks use server-side `has_role()` security definer function — never client-side
- File uploads use Lovable Cloud storage buckets with user-scoped RLS policies
- Knowledge embeddings use the AI gateway (Gemini embedding model) — no additional API keys needed
- The `@tailwindcss/typography` plugin is already in devDependencies for prose styling
- `recharts` is already installed for admin dashboard charts
- `vaul` (Drawer) is already installed for mobile bottom sheets
- `react-hook-form` + `zod` are already installed for form validation

