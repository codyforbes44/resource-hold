import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

const CodeBlock = ({
  language,
  children,
}: {
  language: string | undefined;
  children: string;
}) => {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="relative group/code rounded-lg overflow-hidden border border-border my-3">
      <div className="flex items-center justify-between bg-muted px-4 py-1.5 text-xs text-muted-foreground">
        <span className="font-mono">{language || "text"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-0.5 hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={resolvedTheme === "dark" ? oneDark : oneLight}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "0.8rem",
          background: "transparent",
        }}
        codeTagProps={{
          style: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none [&_img]:rounded-lg [&_img]:max-h-96 [&_img]:w-auto">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");

            // Inline code
            if (!match && !codeString.includes("\n")) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock language={match?.[1]}>{codeString}</CodeBlock>;
          },
          pre({ children }) {
            return <>{children}</>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
