import { useState } from "react";
import { ChevronRight, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingBlockProps {
  content: string;
}

const ThinkingBlock = ({ content }: ThinkingBlockProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-3 rounded-lg border border-border/60 bg-muted/30 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-90"
          )}
        />
        <Brain className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        <span className="font-display">Thinking</span>
        <span className="ml-auto text-muted-foreground/50">
          {open ? "collapse" : "expand"}
        </span>
      </button>
      {open && (
        <div className="border-t border-border/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap font-mono">
          {content.trim()}
        </div>
      )}
    </div>
  );
};

export default ThinkingBlock;
