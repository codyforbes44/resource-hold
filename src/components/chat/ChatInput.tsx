import { useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Volume2, VolumeX } from "lucide-react";
import { Sparkles } from "lucide-react";
import type { Skill } from "@/components/chat/SkillsPanel";

const MAX_MESSAGE_LENGTH = 10000;

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  enabledSkillIds: string[];
  skills: Skill[];
  autoReadEnabled: boolean;
  setAutoReadEnabled: (v: boolean | ((prev: boolean) => boolean)) => void;
}

const ChatInput = ({
  input,
  setInput,
  onSend,
  isStreaming,
  enabledSkillIds,
  skills,
  autoReadEnabled,
  setAutoReadEnabled,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charsRemaining = MAX_MESSAGE_LENGTH - input.length;
  const showCharCount = input.length > MAX_MESSAGE_LENGTH * 0.8;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 6 * 24; // ~6 rows
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend]
  );

  return (
    <div className="border-t border-border p-3 md:p-4 pb-[max(env(safe-area-inset-bottom,0px),12px)]">
      {/* Active skills indicator */}
      {enabledSkillIds.length > 0 && (
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border/50">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[11px] text-muted-foreground">
            Active:{" "}
            {skills
              .filter((s) => s.enabled)
              .map((s) => s.name)
              .join(", ")}
          </span>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder={
              enabledSkillIds.length > 0
                ? "Ask anything — skills active..."
                : "Type a message..."
            }
            disabled={isStreaming}
            rows={1}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-y-auto min-h-[44px]"
            style={{ maxHeight: "144px" }}
          />
          {showCharCount && (
            <span
              className={`absolute right-3 bottom-2 text-[10px] ${
                charsRemaining < 500 ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {charsRemaining.toLocaleString()}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant={autoReadEnabled ? "default" : "ghost"}
          size="icon"
          onClick={() => setAutoReadEnabled((v: boolean) => !v)}
          className="min-h-[44px] min-w-[44px] shrink-0"
          title={autoReadEnabled ? "Auto-read on" : "Auto-read off"}
        >
          {autoReadEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          onClick={onSend}
          disabled={isStreaming || !input.trim()}
          className="min-h-[44px] min-w-[44px]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export { MAX_MESSAGE_LENGTH };
export default ChatInput;
