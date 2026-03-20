import {
  Copy, Check, Volume2, Square, Loader2, RotateCcw, Trash2,
} from "lucide-react";

interface MessageActionsProps {
  content: string;
  index: number;
  role: "user" | "assistant";
  isMobileTapped: boolean;
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
  isMobileTapped,
  onCopy,
  onSpeak,
  onRegenerate,
  onDelete,
  copiedIdx,
  playingIdx,
  loadingTtsIdx,
}: MessageActionsProps) => {
  // On desktop: hidden by default, shown on group-hover (CSS)
  // On mobile: hidden by default, shown when tapped (isMobileTapped)
  return (
    <div
      className={`absolute -bottom-6 right-0 items-center gap-1 z-10 ${
        isMobileTapped ? "flex" : "hidden group-hover:flex"
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onCopy(content, index); }}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-foreground"
        title="Copy"
      >
        {copiedIdx === index ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      {role === "assistant" && (
        <>
          {onSpeak && (
            <button
              onClick={(e) => { e.stopPropagation(); onSpeak(content, index); }}
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
              onClick={(e) => { e.stopPropagation(); onRegenerate(index); }}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-foreground"
              title="Regenerate"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(index); }}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-card border border-border text-muted-foreground hover:text-destructive"
        title="Delete"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
};

export default MessageActions;
