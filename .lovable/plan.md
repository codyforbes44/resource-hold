

## Knowledge Base Gap Analysis and Enhancement Plan

### Current State

The knowledge base has significant limitations that prevent it from being "best in class":

| Capability | Status | Gap |
|---|---|---|
| Text file upload (.txt, .md, .csv, .html, .json) | Working | 5MB limit, narrow format list |
| PDF / DOCX upload | Missing | Not supported at all |
| URL ingestion (scrape → index) | Missing | Browser skill scrapes but doesn't persist to KB |
| Embeddings | Fragile | Uses LLM-simulated embeddings via tool-calling hack, not a real embedding API |
| Chunk size | Fixed 500 words | No adaptive chunking for different content types |
| Re-indexing / refresh | Missing | No way to re-scrape a URL or re-process a doc |

### Proposed Changes

#### 1. Add URL Ingestion to Knowledge Base

Allow users to paste a URL in the Knowledge Base panel. The system scrapes it via Firecrawl, stores the markdown content, chunks it, and indexes embeddings — same pipeline as file uploads.

**Frontend** (`KnowledgeBasePanel.tsx`):
- Add a URL input field + "Add URL" button alongside the file