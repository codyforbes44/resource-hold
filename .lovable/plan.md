

## Image Upload in Chat

### What we're building
Add the ability to attach images to chat messages. Users can upload photos (e.g., screenshots of issues) that get sent alongside their text message. The AI model will see the image and can analyze/respond to it.

### How it works

**1. ChatInput — Add image attachment button and preview**
- Add a paperclip/image button next to the textarea
- Hidden `<input type="file" accept="image/*">` triggered on click
- State for attached images (array of `{ file: File, preview: string }`)
- Show thumbnail previews above the textarea with remove buttons
- Max 4 images, max 5MB each
- Update `onSend` prop to pass images along with text

**2. Upload images to storage on send**
- Upload each attached image to the existing `chat_images` bucket (already public)
- Path: `{user_id}/{conversation_id}/{timestamp}-{filename}`
- Get the public URL after upload
- For guests: convert to base64 data URLs (no storage access)

**3. Update message format to support images**
- Extend `Msg` type in `useConversations.ts` to include optional `images?: string[]` (array of URLs)
- When sending to the chat edge function, format messages with images using the multimodal content format: `content: [{ type: "text", text: "..." }, { type: "image_url", image_url: { url: "..." } }]`

**4. Update chat edge function**
- Already uses OpenAI-compatible format; multimodal content arrays are natively supported by Gemini models via the Lovable AI gateway
- Pass through the content array as-is to the model endpoint
- No major changes needed — just ensure content arrays aren't stringified incorrectly

**5. Display images in ChatMessages**
- For user messages containing images, render thumbnails above the text
- Clicking a thumbnail opens a larger preview (dialog/modal)
- Images stored as markdown `![](url)` in message content, or as separate field

**6. Persist image URLs in messages table**
- Store image URLs inline in the message content as markdown images, or add an `images` jsonb column
- Simplest approach: prepend `![image](url)\n` to the message content before saving — works with existing markdown renderer

### Files to modify
- `src/components/chat/ChatInput.tsx` — attachment button, preview strip, file handling
- `src/pages/Chat.tsx` — pass image upload handler, wire up storage upload
- `src/hooks/useChatStreaming.ts` — format messages with image content for API
- `src/components/chat/ChatMessages.tsx` — render images in user messages
- `supabase/functions/chat/index.ts` — ensure multimodal content passthrough

### Technical details
- Uses existing `chat_images` public storage bucket
- Gemini models support multimodal input via OpenAI-compatible `image_url` content parts
- Images are uploaded to storage first, then public URLs are sent to the model
- The `content` field in the API request becomes an array instead of a string when images are present

