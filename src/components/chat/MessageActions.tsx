import { useState, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Copy, Check, Volume2, Square, Loader2, RotateCcw, Trash2,
} from "lucide-react";

interface MessageActionsProps {
  content: string;
  index: number;
  role: "user" | "assistant";
  isVisible: boolean;
  onCopy: (content: string, idx: number) => void;
  onSpeak?: (content: string, idx: number) => void;
  onRegenerate?: (idx: number) => void;
  onDelete: (idx: number) => void;
  copiedIdx: number | null;
  playingIdx: number | null;
  loadingTtsIdx: number | null;
}

const MessageActions = ({
  content,
  index,
  role,
  isVisible,
  onCopy,
  onSpeak,
  onRegenerate,
  onDelete,
  copiedIdx,
  playingIdx,
  loadingTtsIdx,
}: MessageActionsProps) => {
  if (!isVisible) return null;

  return (
    <div className="absolute -bottom-6 right-0 flex items-center gap-1 z-10">
      <button
        onClick={() => onCopy(content, index)}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-foreground"
        title="Copy"
      >
        {copiedIdx === index ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      {role === "assistant" && (
        <>
          {onSpeak && (
            <button
              onClick={() => onSpeak(content, index)}
              disabled={loadingTtsIdx === index}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
              title={playingIdx === index ? "Stop" : "Read aloud"}
            >
              {loadingTtsIdx === index ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : playingIdx === index ? (
                <Square className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </button>
          )}
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(index)}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-foreground"
              title="Regenerate"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </>
      )}
      <button
        onClick={() => onDelete(index)}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-destructive"
        title="Delete"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
};

export default MessageActions;
