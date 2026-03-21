

## AGI Research Plan: Knowledge Base + Project Tracker

### Part 1: Ingest Plan as Knowledge Base Document

Use `lov-exec` to write the full AGI research plan as a `.txt` file and upload it to the `knowledge_documents` storage bucket, then insert a record and trigger chunking/embedding via the `knowledge-upload` edge function. Same process used for the TIMP document.

### Part 2: Build Research Tracker Page

Create a new `/research` page (admin-gated) with a visual phase tracker for the 4-phase AGI plan.

**Database: `research_milestones` table**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| phase | integer | 1-4 |
| phase_title | text | e.g. "Foundational Research" |
| milestone_title | text | e.g. "Define AGI Criteria" |
| description | text | Deliverable description |
| status | text | `not_started`, `in_progress`, `completed`, `blocked` |
| notes | text | Free-form progress notes |
| sort_order | integer | Ordering within phase |
| created_at, updated_at | timestamptz | Defaults |

RLS: Admin-only read/write via `has_role()`.

**New files:**
- `src/pages/Research.tsx` — Phase-based tracker with expandable milestones, status badges, progress bars per phase
- Route added to `App.tsx` as admin-gated `/research`
- Nav link added to `AppShell.tsx`

**UI design:**
- 4 phase cards in a vertical layout, each showing a progress bar (% milestones completed)
- Expandable accordion per phase listing milestones with status badges
- Inline status dropdown to update milestone status
- Notes textarea for each milestone
- Color-coded: not_started (gray), in_progress (blue), completed (green), blocked (red)

**Seed data:** Pre-populate all 20 milestones from the 4-phase plan via SQL insert.

### Files Changed

| File | Action |
|------|--------|
| Knowledge base | Ingest AGI plan `.txt` via edge function |
| Migration | Create `research_milestones` table + RLS + seed data |
| `src/pages/Research.tsx` | New tracker page |
| `src/App.tsx` | Add `/research` route |
| `src/components/AppShell.tsx` | Add nav link |

