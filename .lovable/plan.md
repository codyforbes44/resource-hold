

## Fix Image Generation Capabilities

### Problem
The image generation skill generates images via the Lovable AI gateway but returns the entire base64 data URL inline in the SSE stream as markdown (`![Generated Image](data:image/png;base64,...)`). This causes two critical issues:

1. **SSE parsing failure**: The base64 string (often 500KB+) arrives as a single massive JSON payload in one `data:` line. When split across TCP chunks, the frontend's `JSON.parse` fails on partial data, and the fallback logic puts the broken line back into the buffer — creating an infinite loop or dropped content.
2. **Message storage bloat**: The entire base64 string gets stored in the `messages` table as part of the assistant's markdown content, bloating the database and slowing conversation loading.

### Solution
Store generated images in Supabase Storage and return a proper URL instead of inline base64.

### Changes

#### 1. Create `chat_images` storage bucket (migration)
- Create a public bucket `chat_images` so generated image URLs are directly accessible
- Add RLS policy allowing the service role to insert (edge function uses service role)
- Add public read policy so URLs work without auth tokens

#### 2. Update `supabase/functions/chat/index.ts` — `executeImageGeneration`
- After receiving the base64 image from the AI gateway, upload it to `chat_images` bucket with a unique filename (UUID + timestamp)
- Return the public URL instead of `IMAGE_DATA:base64...`
- The SSE stream will then contain a short markdown image like `![Generated Image](https://.../storage/v1/object/public/chat_images/...)` — small, parseable, and persistent

#### 3. Update `src/components/chat/MarkdownRenderer.tsx` — `img` component
- Handle both `data:` URLs (backward compat) and storage URLs
- For storage URLs, render a larger preview with a download button
- Keep the click-to-open-in-new-tab behavior

### Files
- **New migration**: create `chat_images` public storage bucket
- `supabase/functions/chat/index.ts` — update `executeImageGeneration` to upload to storage and return URL
- `src/components/chat/MarkdownRenderer.tsx` — improve image rendering with download action

