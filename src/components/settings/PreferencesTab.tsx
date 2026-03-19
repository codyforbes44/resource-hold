import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import { Play, Square, Loader2 } from "lucide-react";

const MODEL_GROUPS = [
  {
    label: "Google",
    models: [
      { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
  {
    label: "OpenAI",
    models: [
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
      { value: "openai/gpt-5", label: "GPT-5" },
    ],
  },
  {
    label: "Zephel",
    models: [
      { value: "zephel/zephel", label: "Zephel" },
      { value: "zephel/zephel-pro", label: "Zephel Pro" },
      { value: "zephel/zephel-fast", label: "Zephel Fast" },
    ],
  },
];

const TTS_VOICES = [
  { value: "JBFqnCBsd6RMkjVDRZzb", label: "George (Default)" },
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Sarah" },
  { value: "FGY2WhTYpPnrIDTdsKH5", label: "Laura" },
  { value: "IKne3meq5aSn9XLyUdCD", label: "Charlie" },
  { value: "CwhRBWXzGAHq8TQ4Fs17", label: "Roger" },
  { value: "N2lVS1w4EtoT3dr4eOWO", label: "Callum" },
  { value: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam" },
  { value: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice" },
  { value: "XrExE9yKIg1WjnnlVkGX", label: "Matilda" },
  { value: "onwK4e9ZLuTAKqWW03F9", label: "Daniel" },
  { value: "pFZP5JQG7iQjIQuC4Bku", label: "Lily" },
  { value: "cgSgspJ2msm6clMCkdW9", label: "Jessica" },
  { value: "cjVigY5qzO86Huf0OWal", label: "Eric" },
  { value: "nPczCjzI2devNBz1zQrb", label: "Brian" },
];

interface PreferencesTabProps {
  userId: string;
  defaultModel: string;
  setDefaultModel: (v: string) => void;
  ttsVoiceId: string;
  setTtsVoiceId: (v: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

const PreferencesTab = ({
  userId,
  defaultModel,
  setDefaultModel,
  ttsVoiceId,
  setTtsVoiceId,
  notificationsEnabled,
  setNotificationsEnabled,
  loading,
  setLoading,
}: PreferencesTabProps) => {
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: userId,
          default_model: defaultModel,
          notifications_enabled: notificationsEnabled,
          tts_voice_id: ttsVoiceId,
        }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Preferences saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewVoice = async () => {
    if (previewingVoice === ttsVoiceId) {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
      setPreviewingVoice(null);
      return;
    }
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setLoadingPreview(true);
    setPreviewingVoice(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: "Hello! This is a preview of how I sound. How do you like my voice?",
            voiceId: ttsVoiceId,
          }),
        }
      );
      if (!res.ok) throw new Error("Preview failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      setPreviewingVoice(ttsVoiceId);
      audio.onended = () => {
        setPreviewingVoice(null);
        previewAudioRef.current = null;
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPreviewingVoice(null);
        previewAudioRef.current = null;
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      toast.error("Failed to preview voice");
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Default AI Model</Label>
          <Select value={defaultModel} onValueChange={setDefaultModel}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_GROUPS.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.models.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>TTS Voice</Label>
          <p className="text-xs text-muted-foreground">Voice used for reading AI responses aloud</p>
          <div className="flex gap-2">
            <Select value={ttsVoiceId} onValueChange={setTtsVoiceId}>
              <SelectTrigger className="min-h-[44px] flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TTS_VOICES.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-[44px] min-w-[44px] shrink-0"
              disabled={loadingPreview}
              title="Preview voice"
              onClick={handlePreviewVoice}
            >
              {loadingPreview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : previewingVoice === ttsVoiceId ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-4 min-h-[60px]">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Toggle between light and dark mode</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-4 min-h-[60px]">
          <div>
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">Enable desktop notifications</p>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={setNotificationsEnabled}
          />
        </div>

        <Button onClick={handleSavePreferences} disabled={loading} className="w-full sm:w-auto">
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export default PreferencesTab;
