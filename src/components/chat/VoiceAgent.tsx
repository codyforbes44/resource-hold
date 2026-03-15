import { useState, useCallback, useEffect, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Phone, PhoneOff, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import logoSrc from "@/assets/logo-gclaw.png";

type TranscriptEntry = {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: Date;
};

const VoiceAgent = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const animFrameRef = useRef<number>(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const prevVolumeRef = useRef(80);
  const entryIdRef = useRef(0);

  const conversation = useConversation({
    onConnect: () => toast.success("Voice agent connected"),
    onDisconnect: () => {
      toast.info("Voice agent disconnected");
      cancelAnimationFrame(animFrameRef.current);
      setInputLevel(0);
      setOutputLevel(0);
    },
    onError: (error) => {
      console.error("Voice agent error:", error);
      toast.error("Voice agent connection error");
    },
    onMessage: (message: any) => {
      if (message.type === "user_transcript") {
        const text = message.user_transcription_event?.user_transcript;
        if (text) {
          setTranscript((prev) => [
            ...prev,
            { id: String(++entryIdRef.current), role: "user", text, timestamp: new Date() },
          ]);
        }
      } else if (message.type === "agent_response") {
        const text = message.agent_response_event?.agent_response;
        if (text) {
          setTranscript((prev) => [
            ...prev,
            { id: String(++entryIdRef.current), role: "agent", text, timestamp: new Date() },
          ]);
        }
      } else if (message.type === "agent_response_correction") {
        const corrected = message.agent_response_correction_event?.corrected_agent_response;
        if (corrected) {
          setTranscript((prev) => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].role === "agent") {
                updated[i] = { ...updated[i], text: corrected };
                break;
              }
            }
            return updated;
          });
        }
      }
    },
  });

  // Audio level polling
  useEffect(() => {
    if (conversation.status !== "connected") return;

    const poll = () => {
      setInputLevel(conversation.getInputVolume?.() ?? 0);
      setOutputLevel(conversation.getOutputVolume?.() ?? 0);
      animFrameRef.current = requestAnimationFrame(poll);
    };
    animFrameRef.current = requestAnimationFrame(poll);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [conversation.status]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Volume control
  const handleVolumeChange = useCallback(
    (val: number[]) => {
      const v = val[0];
      setVolume(v);
      setIsMuted(v === 0);
      if (conversation.status === "connected") {
        conversation.setVolume?.({ volume: v / 100 });
      }
    },
    [conversation]
  );

  const toggleMute = useCallback(() => {
    if (isMuted) {
      const restore = prevVolumeRef.current || 80;
      setVolume(restore);
      setIsMuted(false);
      if (conversation.status === "connected") {
        conversation.setVolume?.({ volume: restore / 100 });
      }
    } else {
      prevVolumeRef.current = volume;
      setVolume(0);
      setIsMuted(true);
      if (conversation.status === "connected") {
        conversation.setVolume?.({ volume: 0 });
      }
    }
  }, [isMuted, volume, conversation]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke("elevenlabs-token");
      if (error || !data?.token) throw new Error("Failed to get conversation token");

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });

      conversation.setVolume?.({ volume: volume / 100 });
      setTranscript([]);
    } catch (error: any) {
      console.error("Failed to start voice conversation:", error);
      if (error.name === "NotAllowedError") {
        toast.error("Microphone access is required. Please allow microphone permission.");
      } else {
        toast.error(error.message || "Failed to connect to voice agent");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, volume]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  // Visualization ring sizes based on audio levels
  const inputScale = 1 + inputLevel * 0.5;
  const outputScale = 1 + outputLevel * 0.6;
  const isActive = conversation.status === "connected";

  return (
    <div className="flex flex-1 flex-col items-center gap-4 p-6">
      {/* Visualization Orb */}
      <div className="relative flex items-center justify-center py-8">
        {/* Outer ring — output (agent speaking) */}
        <div
          className="absolute rounded-full border-2 transition-transform duration-75"
          style={{
            width: 180,
            height: 180,
            borderColor: isActive
              ? `hsl(var(--primary) / ${0.15 + outputLevel * 0.6})`
              : "hsl(var(--border))",
            transform: `scale(${isActive ? outputScale : 1})`,
          }}
        />
        {/* Middle ring — input (user speaking) */}
        <div
          className="absolute rounded-full border-2 transition-transform duration-75"
          style={{
            width: 140,
            height: 140,
            borderColor: isActive
              ? `hsl(var(--accent-foreground) / ${0.15 + inputLevel * 0.5})`
              : "hsl(var(--border))",
            transform: `scale(${isActive ? inputScale : 1})`,
          }}
        />
        {/* Core orb */}
        <div
          className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${
            isActive
              ? conversation.isSpeaking
                ? "bg-primary/20 shadow-lg shadow-primary/20"
                : "bg-muted"
              : "bg-muted/50"
          }`}
        >
          <img
            src={logoSrc}
            alt="gClaw"
            className={`h-12 w-12 transition-opacity duration-300 ${
              isActive ? "opacity-100" : "opacity-40"
            }`}
          />
        </div>
      </div>

      {/* Status */}
      <p className="text-sm font-medium text-muted-foreground">
        {conversation.status === "disconnected" && !isConnecting && "Ready to connect"}
        {isConnecting && "Connecting..."}
        {isActive && conversation.isSpeaking && "Agent is speaking…"}
        {isActive && !conversation.isSpeaking && "Listening…"}
      </p>

      {/* Connect / Disconnect */}
      {!isActive ? (
        <Button
          onClick={startConversation}
          disabled={isConnecting}
          size="lg"
          className="gap-2 rounded-full px-8"
        >
          <Phone className="h-4 w-4" />
          {isConnecting ? "Connecting…" : "Start Voice Chat"}
        </Button>
      ) : (
        <div className="flex items-center gap-4">
          {/* Volume */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground">
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-24"
            />
          </div>
          <Button variant="destructive" onClick={stopConversation} className="gap-2 rounded-full">
            <PhoneOff className="h-4 w-4" /> End
          </Button>
        </div>
      )}

      {/* Live Transcript */}
      {transcript.length > 0 && (
        <ScrollArea className="mt-2 w-full max-w-lg flex-1 rounded-lg border border-border bg-card p-4">
          <div className="space-y-3">
            {transcript.map((entry) => (
              <div
                key={entry.id}
                className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    entry.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {entry.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default VoiceAgent;
