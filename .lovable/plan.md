

## Add File Upload to Admin Knowledge Base Tab

### What
Add a file upload capability to the admin KB tab so admins can upload documents (.txt, .md, .csv, .html, .json, .pdf) that get stored in Supabase Storage and indexed with embeddings — the same pipeline used by regular users, but accessible from the admin dashboard.

### Changes

#### 1. Update `src/components/admin/KnowledgeBaseTab.tsx`
- Add a file input (hidden) with a styled "Upload File" button next to the existing "Add URL" section
- Accept: `.txt, .md, .csv, .html, .json, .pdf` (up to 10MB)
- On file select: upload to `knowledge_documents` storage bucket, create a document record, then trigger processing — all via a new `upload_kb_file` admin action
- Show upload progress state (uploading/processing indicator)

#### 2. Update `supabase/functions/admin-data/index.ts`
Add a new `upload_kb_file` action that:
- Accepts base64-encoded file content, filename, and mime_type from the POST body
- Uploads the file to `knowledge_documents` storage bucket under the admin's user ID
- Creates a `knowledge_documents` record with status "pending"
- Calls the existing `knowledge-upload` function with `action: "process"` to trigger chunking and embedding
- Logs the action to `audit_logs`

### Files to Modify
- `src/components/admin/KnowledgeBaseTab.tsx` — add file upload UI
- `supabase/functions/admin-data/index.ts` — add `upload_kb_file` action

