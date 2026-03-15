

# Refactor ElevenLabs Voice Agent — Best-in-Class

## Current Issues
- Agent ID is hardcoded as empty, requiring manual input each time
- No audio visualization (just a static pulse animation)
- No live transcript display
- No volume controls
- Generic UI with no branding
- Edge function hardcodes agentId from request body instead of using the dedicated agent

## Plan

### 1. Refactor Edge Function (`supabase/functions/elevenlabs-token/index.ts`)
- Hardcode the dedicated agent ID `agent_2801kkr2taane2vbncfc7cmjexqf` server-side
- Remove agentId from request body — the token endpoint always uses the dedicated agent
- Cleaner, more secure

### 2. Rebuild VoiceAgent Component (`src/components/chat/VoiceAgent.tsx`)
Full rewrite with these features:

- **One-tap connect**: No agent ID input needed. Single button to start, uses authenticated token via edge function
- **Real-time audio visualization**: Use `getInputVolume()` and `getOutputVolume()` from the SDK with `requestAnimationFrame` to render animated concentric rings that pulse based on audio levels
- **Live transcript**: Use `onMessage` callback to capture `user_transcript` and `agent_response` events, display scrolling transcript below the visualization
- **Volume slider**: `conversation.setVolume()` with a Slider component
- **Connection states**: Distinct UI for disconnected → connecting → connected → speaking states
- **Microphone permission UX**: Pre-check mic permission with clear error messaging before attempting connection
- **Branded design**: gClaw logo in the visualization orb, brand colors for the rings

### 3. Update Chat.tsx Integration
- Remove the agent ID / checkbox UI concerns — voice button just toggles the panel
- Keep the existing toggle behavior

### File Changes
| File | Action |
|------|--------|
| `supabase/functions/elevenlabs-token/index.ts` | Hardcode agent ID, simplify |
| `src/components/chat/VoiceAgent.tsx` | Full rewrite with visualization, transcript, volume |
| `src/pages/Chat.tsx` | Minor — no changes needed, integration stays the same |

