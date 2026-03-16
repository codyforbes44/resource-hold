

# Remaining Tasks for Production Release

Cross-referencing the approved plan against what's implemented, these items are still outstanding:

---

### Phase B — User Experience (remaining)

**1. Mobile Responsive Overhaul**
- Convert Skills panel to `vaul` Drawer on mobile (already imported but not wired for mobile detection)
- Add `pb-[env(safe-area-inset-bottom)]` to chat input bar
- Ensure 44px minimum tap targets on message actions and sidebar items
- Voice agent: full-screen overlay on mobile
- Landing page: reduce animations at `sm` breakpoint

**2. PWA Setup**
- Install `vite-plugin-pwa`, configure in `vite.config.ts` with existing `manifest.json`
- Add service worker with `navigateFallbackDenylist: [/^\/~oauth/]`
- Add install prompt banner component (show after 2+ visits via localStorage counter)

---

### Phase C — Admin & Enterprise (remaining)

**3. Knowledge Base / RAG (Full Implementation)**
- Database: create `knowledge_documents` and `knowledge_chunks` tables (pgvector extension + embedding column)
- Storage: create `knowledge_documents` bucket with user-scoped RLS
- Edge function `knowledge-upload`: accept file upload, parse text, chunk into ~500 tokens, embed via AI gateway, store vectors
- Edge function update: wire `search_knowledge` in `chat/index.ts` to query `knowledge_chunks` with `<=>` similarity
- UI: add file upload zone + document list in Skills panel when Knowledge Base is enabled

**4. Audit Logging Wiring**
- Insert audit log entries when admin assigns/revokes roles, deletes conversations, or modifies users
- Currently the `audit_logs` table exists but no code writes to it

**5. Realtime Conversations**
- Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;`
- Subscribe to changes in Chat sidebar for live updates

---

### Phase D — Hardening (all remaining)

**6. Avatars Storage Bucket**
- Create `avatars` storage bucket via migration
- Add RLS policies: users can upload/update/delete their own files, public read
- Settings page already has upload code referencing this bucket

**7. Input Validation (Zod)**
- Auth forms: email format, password min 8 chars with strength indicator
- Chat: max message length (e.g. 10,000 chars) with character counter
- Settings: display name length limit, model value validation

**8. Chat Edge Function Hardening**
- Validate request body (max message content length, max conversation history depth — truncate to last 50 messages)
- Sanitize user input before forwarding to AI gateway
- Add basic usage tracking (log model + token estimate to `audit_logs` or new `usage_logs` table)

**9. Code Syntax Highlighting**
- Install `react-syntax-highlighter` or use `rehype-highlight` with `react-markdown`
- Add copy-to-clipboard button on code blocks
- Style code blocks with theme-aware colors

**10. Admin Edge Function Completeness**
- Verify `admin-data` handles all actions: `users`, `conversations`, `logs`, `stats`
- Add conversation message preview for admin conversation browser
- Add pagination for large datasets (currently limited to 1000 rows)

---

### Summary by Priority

| Priority | Task | Effort |
|----------|------|--------|
| High | Avatars storage bucket (blocks Settings uploads) | Small |
| High | Input validation on auth + chat | Medium |
| High | Mobile responsive overhaul | Large |
| Medium | Knowledge Base / RAG | Large |
| Medium | Code syntax highlighting | Small |
| Medium | Audit logging wiring | Small |
| Medium | Chat edge function hardening | Medium |
| Medium | Realtime conversations | Small |
| Low | PWA setup | Medium |
| Low | Admin edge function completeness | Medium |

Total remaining: ~10 work items across 4 categories. The highest-impact items are the avatars bucket (unblocks existing UI), mobile polish, and input validation.

