
Production completion plan for gClaw

What I found
- The current production build is blocked by the PWA precache step: the main JS bundle is ~2.56 MB and `hero-bg.png` is ~2.43 MB, both above Workbox’s default 2 MiB limit.
- The bundle is inflated because `App.tsx` eagerly imports all routes, so the landing page pulls in chat, voice, markdown highlighting, admin charts, and other heavy code.
- The landing page still contains placeholder or risky production content: `#` footer links, a GitHub CTA without a real destination, and a “Trusted by leading enterprise platforms” section that reads like proof without verification.
- The landing content does not fully showcase shipped platform capabilities: multi-model chat, voice, RAG/knowledge base, admin/RBAC, settings, mobile drawer UX, PWA, and governance are underrepresented.
- The chat app has a critical integration gap: chat requests use the publishable key as `Authorization` instead of the signed-in user’s access token, which weakens authenticated tool flows and breaks user-scoped knowledge retrieval reliability.
- The Knowledge Base works for simple text uploads, but it still needs production polish: broader file support, document lifecycle UX, source citations, retry handling, and better retrieval presentation.
- Admin and settings exist, but they still feel like first-pass internal tools rather than polished production surfaces.

Implementation plan

1. Stabilize the production build first
- Convert route imports in `src/App.tsx` to `React.lazy` + `Suspense` so landing, auth, chat, admin, and settings are split into separate chunks.
- Lazy-load the heaviest feature components inside routes where appropriate:
  - `VoiceAgent`
  - `MarkdownRenderer` / syntax highlighter
  - chart-heavy admin visualizations
  - knowledge base management panel
- Refactor the PWA config in `vite.config.ts` so the service worker only precaches safe-sized core assets.
- Remove oversized PNGs from the precache manifest and use runtime caching instead.
- Reduce the main landing asset weight by replacing or optimizing the hero background strategy while preserving the cyberpunk full-bleed aesthetic from brand memory.
- Add manual chunking only if route splitting is not enough.

2. Refactor the landing page into a true product showcase
- Keep the dark 4-color visual identity, terminal branding, blinking cursor, parallax hero, and floating particles.
- Rework the landing architecture from “marketing brochure” into “product + platform story”:
  - Hero with stronger product positioning and live-product CTAs
  - Capability overview focused on actual shipped modules
  - Interactive “Platform Experience” section for Chat, Voice, Skills, Knowledge Base, Admin, and Security
  - Architecture section aligned to the 4-layer stack memory
  - Security/governance section for RBAC, audit logs, protected routes, and enterprise controls
  - Deployment/runtime section for hardware agnosticism and edge/runtime story
  - Final CTA section that routes visitors to sign in, launch chat, or explore settings/admin as appropriate
- Replace placeholder trust/partner content and placeholder links with verified content or neutral “ecosystem/integrations” messaging.
- Remove or rewrite any claim that is not demonstrably true in the current product state.
- Rebalance sections like roadmap/comparison so the page emphasizes current capability over speculative future state.

3. Harden the app-level architecture and shared data flow
- Create shared client helpers for authenticated backend function calls so chat, admin, and knowledge operations consistently use the user session token.
- Move repeated model lists, capability metadata, and feature copy into central constants/config files.
- Normalize loading, error, empty, and success states across chat, settings, admin, and knowledge flows.
- Refactor repeated fetch logic into reusable hooks or service modules for maintainability.

4. Finish the Knowledge Base / RAG flow to production quality
- Fix chat-to-backend auth so the knowledge search tool always knows the current user.
- Improve `knowledge-upload` and chat retrieval behavior:
  - better chunking and cleanup
  - retry-safe processing states
  - clearer error handling
  - dedupe or replace behavior for re-uploads
  - citations/source references in assistant responses
- Expand supported document formats beyond the current text-centric path where feasible, while keeping the existing text formats reliable.
- Improve the Knowledge Base UI:
  - drag-and-drop upload
  - status badges and progress states
  - retry failed documents
  - document metadata and chunk counts
  - better mobile drawer layout
- Ensure retrieved knowledge is visibly grounded in uploaded content rather than feeling like generic model output.

5. Bring chat UX to best-in-class production polish
- Keep the current mobile drawer, conversation search, rename, message actions, and typing indicator, then refine them.
- Improve message rendering and assistant output with stronger code-block UX, citations, and rich content support.
- Tighten conversation lifecycle behavior:
  - smarter title generation
  - cleaner regenerate/delete flows
  - better scroll behavior and state restoration
- Audit each listed skill so labels match shipped capability. If something is not truly executable end-to-end, either finish it or rename it to avoid overclaiming.

6. Upgrade settings and admin from functional to production-grade
- Settings:
  - stronger profile save feedback
  - better avatar upload states
  - clearer preference persistence
  - more polished account/security messaging
- Admin:
  - server-side pagination/search/filtering
  - richer conversation records with previews
  - clearer user-role management
  - better system metrics presentation
  - fully polished audit log browsing
- Keep all privileged operations enforced server-side through the backend function and roles table pattern already in place.

7. Final production hardening and release polish
- Verify copy, links, metadata, manifest, install flows, and route behavior.
- Tighten accessibility: focus states, button targets, headings, landmark structure, keyboard behavior, reduced-motion behavior, and mobile spacing.
- Make mobile performance deliberate: fewer particles, lighter animation, and faster first render on small screens.
- Ensure all app claims, feature names, and landing CTAs map to real, working flows.

Technical details
- Files most likely to be refactored:
  - `src/App.tsx`
  - `vite.config.ts`
  - `src/pages/Index.tsx`
  - `src/constants/landing.ts`
  - `src/components/landing/*`
  - `src/pages/Chat.tsx`
  - `src/components/chat/KnowledgeBasePanel.tsx`
  - `src/components/chat/SkillsPanel.tsx`
  - `src/components/chat/VoiceAgent.tsx`
  - `src/pages/Admin.tsx`
  - `src/pages/Settings.tsx`
  - `supabase/functions/chat/index.ts`
  - `supabase/functions/knowledge-upload/index.ts`
  - `supabase/functions/admin-data/index.ts`
- Key backend-safe changes:
  - no role data on profiles/users
  - keep server-side admin checks in backend functions
  - preserve existing RLS model
  - do not touch generated backend client/types files manually
- Key build fix direction:
  - route-level lazy loading
  - stop precaching oversized hero/media assets
  - keep PWA functionality without forcing giant assets into the offline shell

Release acceptance criteria
- Production build passes without Workbox size failures.
- Landing page loads fast, looks premium, and accurately represents the full platform.
- Authenticated chat uses the real session token for backend function calls.
- Knowledge Base upload/search works end-to-end with reliable user scoping.
- Mobile chat, skills drawer, voice view, and install prompt behave cleanly.
- Admin and settings feel polished, not placeholder.
- No placeholder links, misleading trust signals, or unverified claims remain.
