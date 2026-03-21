import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

export function useTTS(ttsVoiceId: string) {
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [loadingTtsIdx, setLoadingTtsIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stripMarkdown = (md: string) =>
    md.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "").replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[([^\]]*)\]\(.*?\)/g, "$1").replace(/#{1,6}\s?/g, "").replace(/[*_~]{1,3}/g, "")
      .replace(/>\s?/gm, "").replace(/\n{2,}/g, ". ").replace(/\n/g, " ").trim();

  const speakMessage = useCallback(async (content: string, idx: number) => {
    if (playingIdx === idx) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingIdx(null);
      return;
    }
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingIdx(null);
    const text = stripMarkdown(content);
    if (!text) return;
    setLoadingTtsIdx(idx);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ text, voiceId: ttsVoiceId }),
      });
      if (!response.ok) throw new Error("TTS request failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingIdx(idx);
      setLoadingTtsIdx(null);
      audio.onended = () => { setPlayingIdx(null); audioRef.current = null; URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlayingIdx(null); audioRef.current = null; URL.revokeObjectURL(url); toast.error("Audio playback failed"); };
      await audio.play();
    } catch {
      setLoadingTtsIdx(null);
      setPlayingIdx(null);
      toast.error("Failed to generate speech");
    }
  }, [playingIdx, ttsVoiceId]);

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return { playingIdx, loadingTtsIdx, copiedIdx, speakMessage, copyMessage, audioRef };
}
