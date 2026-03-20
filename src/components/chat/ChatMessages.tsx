import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, LogIn } from "lucide-react";
import MessageActions from "@/components/chat/MessageActions";
import type { Skill } from "@/components/chat/SkillsPanel";
import logoSrc from "@/assets/logo-gclaw.png";

const MarkdownRenderer = lazy(() => import("@/components/chat/MarkdownRenderer"));

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTED_PROMPTS = [
  "Explain quantum computing in simple terms",
  "Write a Python function to sort a list",
  "What are the latest trends in AI?",
  "Help me brainstorm a startup idea",
  "Summarize the key points of machine learning",
];

interface ChatMessagesProps {
  messages: Msg[];
  isStreaming: boolean;
  isGuest: boolean;
  skills: Skill[];
  onToggleSkill: (id: string) => void;
  onSend: (prompt: string) => void;
  onCopy: (content: string, idx: number) => void;
  onSpeak: (content: string, idx: number) => void;
  onRegenerate: (idx: number) => void;
  onDelete: (idx: number) => void;
  copiedIdx: number | null;
  playingIdx: number | null;
  loadingTtsIdx: number | null;
  signupNudgeDismissed: boolean;
  onDismissNudge: () => void;
  conversationCount: number;
}

const ChatMessages = ({
  messages,
  isStreaming,
  isGuest,
  skills,
  onToggleSkill,
  onSend,
  onCopy,
  onSpeak,
  onRegenerate,
  onDelete,
  copiedIdx,
  playingIdx,
  loadingTtsIdx,
  signupNudgeDismissed,
  onDismissNudge,
  conversationCount,
}: ChatMessagesProps) => {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeActionIdx, setActiveActionIdx] = useState<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMessageTap = (idx: number) => {
    if (!isMobile) return;
    setActiveActionIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <>
      {/* Guest sign-up nudge */}
      {isGuest && !signupNudgeDismissed && conversationCount >= 3 && (
        <div className="mx-3 mt-2 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">You've started {conversationCount} chats!</span>{" "}
            <Link to="/auth" className="text-primary hover:underline font-medium">Sign up</Link> to keep them forever and unlock all features.
          </p>
          <button
            onClick={onDismissNudge}
            className="shrink-0 text-muted-foreground/60 hover:text-foreground transition-colors text-xs"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <ScrollArea className="flex-1 p-3 md:p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-4">
            <img src={logoSrc} alt="gClaw" className="h-16 w-16 opacity-30" />
            <p className="text-lg text-muted-foreground">Start a conversation with gClaw</p>
            <p className="max-w-md text-sm text-muted-foreground/60">
              Choose a model above and type a message below. Enable skills via the{" "}
              <Sparkles className="inline h-3.5 w-3.5" /> button.
            </p>
            {isGuest && (
              <p className="text-xs text-muted-foreground/50">
                <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to save conversations across sessions.
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSend(prompt)}
                  className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all min-h-[44px]"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {skills.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onToggleSkill(s.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all min-h-[44px] ${
                    s.enabled
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/20"
                  }`}
                >
                  <s.icon className="h-3 w-3" />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`group mb-6 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            onClick={() => handleMessageTap(i)}
          >
            <div className="relative max-w-[90%] md:max-w-[80%]">
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Suspense fallback={<span>{msg.content}</span>}>
                    <MarkdownRenderer content={msg.content} />
                  </Suspense>
                ) : (
                  msg.content
                )}
              </div>
              <MessageActions
                content={msg.content}
                index={i}
                role={msg.role}
                isVisible={isMobile ? activeActionIdx === i : true}
                onCopy={onCopy}
                onSpeak={msg.role === "assistant" ? onSpeak : undefined}
                onRegenerate={msg.role === "assistant" ? onRegenerate : undefined}
                onDelete={onDelete}
                copiedIdx={copiedIdx}
                playingIdx={playingIdx}
                loadingTtsIdx={loadingTtsIdx}
              />
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="mb-4 flex justify-start">
            <div className="flex items-center gap-1 rounded-xl bg-muted px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </ScrollArea>
    </>
  );
};

export default ChatMessages;
