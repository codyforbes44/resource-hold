

## Schedule Knowledge Base Auto-Refresh Cron (Every 72 Hours)

### What
The `knowledge-refresh` edge function already exists and works. The missing piece is the `pg_cron` schedule to invoke it automatically every 72 hours.

### Changes

#### 1. Enable `pg_cron` and `pg_net` extensions
Run a migration to enable both extensions required for scheduled HTTP calls from the database.

#### 2. Create the cron job via SQL insert
Schedule `net.http_post` to call the `knowledge-refresh` edge function every 3 days at midnight UTC:
```sql
SELECT cron.schedule(
  'refresh-knowledge-base-72h',
  '0 0 */3 * *',
  $$ SELECT net.http_post(
    url:='https://jjlzcrqguxupzhrfngmt.supabase.co/functions/v1/knowledge-refresh',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id; $$
);
```
This will be run as a direct SQL insert (not a migration) since it contains project-specific secrets.

### Files
- Database migration: enable `pg_cron` and `pg_net` extensions
- Direct SQL: create the scheduled job

