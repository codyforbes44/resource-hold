import { useState, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";

const VoiceAgent = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [useToken, setUseToken] = useState(false);

  const conversation = useConversation({
    onConnect: () => toast.success("Connected to voice agent"),
    onDisconnect: () => toast.info("Disconnected from voice agent"),
    onError: (error) => {
      console.error("Voice agent error:", error);
      toast.error("Voice agent connection error");
    },
  });

  const startConversation = useCallback(async () => {
    if (!agentId.trim()) {
      toast.error("Please enter your ElevenLabs Agent ID");
      return;
    }
    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      if (useToken) {
        // Get token from edge function (authenticated)
        const { data, error } = await supabase.functions.invoke("elevenlabs-token", {
          body: { agentId: agentId.trim() },
        });
        if (error || !data?.token) throw new Error("Failed to get conversation token");
        await conversation.startSession({
          conversationToken: data.token,
          connectionType: "webrtc",
        });
      } else {
        // Public agent — connect directly
        await conversation.startSession({
          agentId: agentId.trim(),
          connectionType: "webrtc",
        });
      }
    } catch (error: any) {
      console.error("Failed to start voice conversation:", error);
      toast.error(error.message || "Failed to connect to voice agent");
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, agentId, useToken]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="text-center space-y-2">
        <h2 className="font-display text-2xl font-bold">Voice Agent</h2>
        <p className="text-sm text-muted-foreground">
          Connect to your ElevenLabs conversational agent
        </p>
      </div>

      {conversation.status === "disconnected" && (
        <div className="w-full max-w-sm space-y-4">
          <Input
            placeholder="ElevenLabs Agent ID"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="use-token"
              checked={useToken}
              onChange={(e) => setUseToken(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="use-token" className="text-xs text-muted-foreground">
              Use authenticated token (for private agents)
            </label>
          </div>
          <Button
            onClick={startConversation}
            disabled={isConnecting || !agentId.trim()}
            className="w-full gap-2"
          >
            <Phone className="h-4 w-4" />
            {isConnecting ? "Connecting..." : "Start Conversation"}
          </Button>
        </div>
      )}

      {conversation.status === "connected" && (
        <div className="flex flex-col items-center gap-6">
          <div
            className={`flex h-32 w-32 items-center justify-center rounded-full transition-all duration-300 ${
              conversation.isSpeaking
                ? "bg-primary/20 ring-4 ring-primary/40 animate-pulse"
                : "bg-muted"
            }`}
          >
            {conversation.isSpeaking ? (
              <Mic className="h-12 w-12 text-primary" />
            ) : (
              <MicOff className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {conversation.isSpeaking ? "Agent is speaking..." : "Listening..."}
          </p>
          <Button variant="destructive" onClick={stopConversation} className="gap-2">
            <PhoneOff className="h-4 w-4" /> End Conversation
          </Button>
        </div>
      )}
    </div>
  );
};

export default VoiceAgent;
