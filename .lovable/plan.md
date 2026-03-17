

## Plan: Add TTS Readback Button for AI Responses

Add a speaker icon button to every assistant message that reads the response aloud using the ElevenLabs TTS edge function (already have the API key configured).

### 1. Create TTS Edge Function (`supabase/functions/elevenlabs-tts/index.ts`)
- Accept `{ text, voiceId }` in the request body
- Call ElevenLabs TTS API (`/v1/text-to-speech/{voiceId}`) with `eleven_turbo_v2_5` model for low latency
- Return raw audio bytes as `audio/mpeg`
- Use a default voice (e.g. George - `JBFqnCBsd6RMkjVDRZzb`) if no voiceId provided
- Add CORS headers, set `verify_jwt = false` in config.toml

### 2. Update Chat UI (`src/pages/Chat.tsx`)
- Import `Volume2` (and `Loader2`) icons from lucide-react
- Add state: `playingIdx` to track which message is currently being read aloud, and an `audioRef` to hold the current Audio object
- Add a `speakMessage(content, idx)` function that:
  - Strips markdown formatting from content for cleaner speech
  - Calls the TTS edge function via `fetch()` with `.blob()` (not `supabase.functions.invoke`)
  - Creates an `Audio` object, plays it, and sets `playingIdx`
  - On audio end/error, clears `playingIdx`
  - If already playing the same message, stops playback
- Add a speaker button next to the existing Copy/Regenerate buttons for assistant messages (line ~1072-1080), styled consistently with the other action buttons

### Technical Details
- Uses `fetch()` with `.blob()` for binary audio (not JSON parsing)
- Strips markdown before sending to TTS for natural speech
- Single audio instance - clicking another message stops the current one
- No database changes needed

