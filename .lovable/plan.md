
Goal: extend the current chat attachment flow from image-only to general attachments so signed-in users can upload MP4 files for video-editing requests, while keeping existing image support.

1. Generalize the attachment model
- Replace the image-specific types/state (`AttachedImage`, `uploadChatImages`) with a shared attachment model like `ChatAttachment`.
- Support at least:
  - images: existing behavior
  - videos: `video/mp4`
- Keep guest image behavior as-is, but require sign-in before allowing MP4 uploads.

2. Update the chat input UI
- Change the file picker to accept images plus `.mp4`.
- Show attachment cards instead of image-only thumbnails:
  - image preview for photos
  - small video preview/player or video badge for MP4
- Add validation and messaging for unsupported file types and video-size limits.
- If a guest selects MP4, show a sign-in prompt instead of uploading.

3. Persist attachments cleanly
- Add an `attachments` JSON column to chat messages instead of encoding files into markdown.
- Store metadata like:
  - `type` (`image` | `video`)
  - `url`
  - `name`
  - `mimeType`
- Keep `content` as the user’s text prompt so text and attachments stay separate.

4. Rework upload handling
- Reuse the existing public storage bucket and authenticated folder-based upload pattern.
- Rename the upload helper to something attachment-oriented and return structured attachment metadata.
- Continue converting guest images to base64 only if needed, but block guest MP4 uploads entirely.

5. Update chat rendering
- Render user-message attachments above the text bubble:
  - images as thumbnails
  - MP4 with inline preview / open-in-new-tab / download action
- Keep assistant rendering unchanged.
- Load historical attachments from the database so uploaded videos still appear after refresh.

6. Adjust chat request formatting
- For images: continue converting them into multimodal parts for the chat function.
- For MP4: do not send raw video into the current chat model path; instead include a short attachment summary in the user request payload so the assistant knows a video was attached.
- This keeps the existing chat function compatible while preparing for a future dedicated video-editing backend flow.

7. Update the chat edge function safely
- Keep current multimodal image support.
- Ensure validation accepts the new attachment-aware request shape or attachment summaries without breaking existing chats.
- Do not attempt raw MP4 ingestion in the current model route unless a dedicated supported video-processing path is added later.

Technical details
- Files likely affected:
  - `src/components/chat/ChatInput.tsx`
  - `src/hooks/useImageUpload.ts` → generalized upload helper
  - `src/pages/Chat.tsx`
  - `src/hooks/useChatStreaming.ts`
  - `src/hooks/useConversations.ts`
  - `src/components/chat/ChatMessages.tsx`
  - `supabase/functions/chat/index.ts`
  - new SQL migration for `messages.attachments`
- Backend/storage:
  - no new auth model needed
  - existing authenticated storage policy pattern should still work
  - RLS on `messages` remains the same; only schema expands

Important scope note
- This plan adds MP4 upload, storage, persistence, and chat-side preview/reference.
- Actual AI-powered video editing/transformation should be implemented as a separate next step using a dedicated backend workflow, because the current chat endpoint is image-aware but not a full raw-video editing pipeline.
