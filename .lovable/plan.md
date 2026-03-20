

## Auto-Refresh Knowledge Base Every 72 Hours via Cron

### What
Set up a scheduled cron job that re-scrapes and re-indexes all URL-based knowledge base documents every 72 hours, keeping the knowledge base fresh.

### Changes

#### 1. Create `knowledge-refresh` edge function
A new edge function that:
- Queries all `knowledge_documents` where `source_url IS NOT NULL`
- For each document, calls the existing `knowledge-upload` function's `ingest_url` logic (re-scrape via Firecrawl, re-chunk, re-embed)
- Processes documents sequentially with rate-limiting delays
- Updates `updated_at` timestamp on success
- Logs errors per document but continues processing the rest

The function will accept a cron-style invocation (no auth required beyond the anon key used by pg_net).

#### 2. Enable `pg_cron` and `pg_net` extensions
Required for scheduling HTTP calls from the database.

#### 3. Create cron job via SQL
Schedule `net.http_post` to invoke the edge function every 72 hours:
```sql
SELECT cron.schedule(
  'refresh-knowledge-base',
  '0 0 */3 * *',  -- every 3 days at midnight
  $$ SELECT net.http_post(...) $$
);
```

#### 4. Add to `supabase/config.toml`
Register the new function with `verify_jwt = false`.

### Files
- `supabase/functions/knowledge-refresh/index.ts` — new edge function
- `supabase/config.toml` — add function entry
- Database: enable extensions + create cron schedule

