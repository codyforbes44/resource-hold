

## Add TIMP Documentation to Knowledge Base

### What
Create a TIMP documentation text file and ingest it into the knowledge base so the chat AI can reference it via RAG.

### How
1. Write the full TIMP content to a temporary `.txt` file
2. Upload it to the `knowledge_documents` storage bucket via the edge function
3. The existing `knowledge-upload` edge function will chunk and embed it automatically

### Implementation
- Use `lov-exec` to write the content to `/tmp/timp-documentation.txt`
- Call the `knowledge-upload` edge function with the file data to process and index it
- Since this requires an authenticated user context, we'll instead insert the document record and file directly via SQL + storage, then trigger processing

**Approach:** Insert the document directly into the database and storage bucket using the admin/service path:
1. Write TIMP content to `/tmp/timp-documentation.txt`
2. Upload to `knowledge_documents` storage bucket via edge function curl
3. Insert record into `knowledge_documents` table
4. Call `knowledge-upload` edge function with `action: "process"` to chunk and embed

### Files
- No source code changes needed — this is a data ingestion task only

