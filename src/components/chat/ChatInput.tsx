import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Volume2, VolumeX, Paperclip, X } from "lucide-react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Skill } from "@/components/chat/SkillsPanel";
import { getAttachmentType, type PendingAttachment } from "@/lib/chat-attachments";

const MAX_MESSAGE_LENGTH = 10000;
const MAX_ATTACHMENTS = 4;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  onSend: (attachments?: PendingAttachment[]) => void;
  isStreaming: boolean;
  enabledSkillIds: string[];
  skills: Skill[];
  isGuest: boolean;
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
  isGuest,
  autoReadEnabled,
  setAutoReadEnabled,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<PendingAttachment[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<PendingAttachment[]>([]);
  const charsRemaining = MAX_MESSAGE_LENGTH - input.length;
  const showCharCount = input.length > MAX_MESSAGE_LENGTH * 0.8;

  useEffect(() => {
    attachmentsRef.current = attachedFiles;
  }, [attachedFiles]);

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
        handleSend();
      }
    },
    [input, attachedFiles, isStreaming]
  );

  const handleSend = () => {
    if (isStreaming || (!input.trim() && attachedFiles.length === 0)) return;
    onSend(attachedFiles.length > 0 ? attachedFiles : undefined);
    setAttachedFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";

    const remaining = MAX_ATTACHMENTS - attachedFiles.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
      return;
    }

    const validFiles: PendingAttachment[] = files.slice(0, remaining).flatMap((file) => {
      const attachmentType = getAttachmentType(file.type);
      if (!attachmentType) {
        toast.error(`${file.name} is not a supported image or MP4 file`);
        return [];
      }
      if (attachmentType === "video" && isGuest) {
        toast.error("Sign in to attach MP4 files");
        return [];
      }
      const sizeLimit = attachmentType === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > sizeLimit) {
        toast.error(`${file.name} exceeds ${attachmentType === "video" ? "20MB" : "10MB"} limit`);
        return [];
      }
      return [{
        file,
        preview: URL.createObjectURL(file),
        type: attachmentType,
        name: file.name,
        mimeType: file.type,
      }];
    });

    setAttachedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeAttachment = (idx: number) => {
    setAttachedFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.preview));
    };
  }, []);

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

      {/* Attachment previews */}
      {attachedFiles.length > 0 && (
        <div className="flex gap-2 pb-2 mb-2 overflow-x-auto">
          {attachedFiles.map((attachment, idx) => (
            <div key={idx} className="relative shrink-0 h-16 w-16 rounded-md overflow-hidden border border-border">
              {attachment.type === "image" ? (
                <img src={attachment.preview} alt={attachment.name} className="h-full w-full object-cover" />
              ) : (
                <video src={attachment.preview} className="h-full w-full object-cover" muted playsInline preload="metadata" />
              )}
              <button
                onClick={() => removeAttachment(idx)}
                className="absolute top-0 right-0 bg-background/80 rounded-bl-md p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming || attachedFiles.length >= MAX_ATTACHMENTS}
          className="min-h-[44px] min-w-[44px] shrink-0"
          title="Attach image or MP4"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
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
          onClick={handleSend}
          disabled={isStreaming || (!input.trim() && attachedFiles.length === 0)}
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
