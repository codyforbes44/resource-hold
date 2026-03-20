

## Batch Ingest URLs into Knowledge Base

### What
Extract all 101 URLs from the provided list and ingest them into the knowledge base using the existing `knowledge-upload` edge function's `ingest_url` action.

### Approach
Run a server-side script that calls the `knowledge-upload` edge function directly for each URL, using the service role key to bypass auth (since this is an admin action). The script will:

1. Parse all URLs from the list
2. Call the edge function sequentially with delays between requests (to avoid rate limiting on Firecrawl)
3. Log success/failure for each URL
4. Output a summary report

### Technical Details

- **Edge function**: `knowledge-upload` with `action: "ingest_url"` — already implemented
- **Dependency**: Firecrawl connector (already connected) for scraping each URL
- **Auth**: Script will use `SUPABASE_SERVICE_ROLE_KEY` to authenticate, and will need a valid `user_id` to associate documents with
- **Rate limiting**: ~2-3 second delay between URLs to respect Firecrawl limits
- **Total URLs**: ~101 URLs across 15 categories

### Important Consideration
Before running, you'll need to confirm which user account these knowledge base documents should be associated with (the script needs a `user_id`). The URLs will be scraped, chunked, and embedded — this will take significant time (~5-10 minutes for 101 URLs) and consume Firecrawl credits.

### Output
A summary report listing each URL with its status (success/error) and chunk count, saved to `/mnt/documents/`.

