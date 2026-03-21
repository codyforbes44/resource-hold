import { useState, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Check, Copy, Download, ExternalLink } from "lucide-react";
import ThinkingBlock from "./ThinkingBlock";

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

/** Parse <think>...</think> blocks out of content */
function parseThinkingBlocks(content: string): { thinking: string | null; rest: string } {
  const match = content.match(/^<think>([\s\S]*?)<\/think>\s*/);
  if (match) {
    return { thinking: match[1], rest: content.slice(match[0].length) };
  }
  // Handle still-streaming thinking (no closing tag yet)
  const openMatch = content.match(/^<think>([\s\S]*)$/);
  if (openMatch) {
    return { thinking: openMatch[1], rest: "" };
  }
  return { thinking: null, rest: content };
}

const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  const { thinking, rest } = useMemo(() => parseThinkingBlocks(content), [content]);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-p:leading-relaxed prose-li:leading-relaxed">
      {rest && <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ── Code ──
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");

            if (!match && !codeString.includes("\n")) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground not-prose"
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

          // ── Links ──
          a({ href, children, ...props }) {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/30 hover:decoration-primary/60 transition-colors inline-flex items-center gap-0.5"
                {...(isExternal && {
                  target: "_blank",
                  rel: "noopener noreferrer",
                })}
                {...props}
              >
                {children}
                {isExternal && <ExternalLink className="h-3 w-3 inline-block shrink-0" />}
              </a>
            );
          },

          // ── Headings ──
          h1({ children, ...props }) {
            return (
              <h1 className="text-xl font-bold font-display mt-6 mb-3 pb-2 border-b border-border first:mt-0" {...props}>
                {children}
              </h1>
            );
          },
          h2({ children, ...props }) {
            return (
              <h2 className="text-lg font-bold font-display mt-5 mb-2 pb-1.5 border-b border-border/60" {...props}>
                {children}
              </h2>
            );
          },
          h3({ children, ...props }) {
            return (
              <h3 className="text-base font-semibold font-display mt-4 mb-2" {...props}>
                {children}
              </h3>
            );
          },
          h4({ children, ...props }) {
            return (
              <h4 className="text-sm font-semibold font-display mt-3 mb-1.5" {...props}>
                {children}
              </h4>
            );
          },

          // ── Blockquote ──
          blockquote({ children, ...props }) {
            return (
              <blockquote
                className="border-l-3 border-primary/40 bg-muted/50 rounded-r-lg px-4 py-2 my-3 text-muted-foreground italic not-prose"
                {...props}
              >
                {children}
              </blockquote>
            );
          },

          // ── Lists ──
          ul({ children, ...props }) {
            return (
              <ul className="my-2 ml-1 space-y-1 list-disc list-outside pl-4 marker:text-muted-foreground/60" {...props}>
                {children}
              </ul>
            );
          },
          ol({ children, ...props }) {
            return (
              <ol className="my-2 ml-1 space-y-1 list-decimal list-outside pl-4 marker:text-muted-foreground/60" {...props}>
                {children}
              </ol>
            );
          },
          li({ children, className, ...props }) {
            const isTask = className?.includes("task-list-item");
            return (
              <li
                className={`text-foreground pl-1 ${isTask ? "list-none -ml-4 flex items-start gap-2" : ""}`}
                {...props}
              >
                {children}
              </li>
            );
          },

          // ── Task list checkbox ──
          input({ type, checked, ...props }) {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  disabled
                  className="mt-1 h-3.5 w-3.5 rounded border-border accent-primary shrink-0"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },

          // ── Tables ──
          table({ children, ...props }) {
            return (
              <div className="my-3 overflow-x-auto rounded-lg border border-border not-prose">
                <table className="w-full text-sm" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          thead({ children, ...props }) {
            return (
              <thead className="bg-muted/70 text-muted-foreground" {...props}>
                {children}
              </thead>
            );
          },
          th({ children, ...props }) {
            return (
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider border-b border-border" {...props}>
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td className="px-3 py-2 border-b border-border/50 text-foreground" {...props}>
                {children}
              </td>
            );
          },
          tr({ children, ...props }) {
            return (
              <tr className="even:bg-muted/30 transition-colors hover:bg-muted/50" {...props}>
                {children}
              </tr>
            );
          },

          // ── Horizontal rule ──
          hr({ ...props }) {
            return <hr className="my-4 border-border/60" {...props} />;
          },

          // ── Images ──
          img({ src, alt, ...props }) {
            const isStorageUrl = src?.includes("/storage/v1/object/public/chat_images/");
            return (
              <div className="relative group/img my-3 inline-block">
                <a href={src} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={src}
                    alt={alt || ""}
                    className="rounded-lg max-h-[32rem] w-auto border border-border/30 hover:border-border transition-colors"
                    loading="lazy"
                    {...props}
                  />
                </a>
                {isStorageUrl && (
                  <a
                    href={src}
                    download
                    className="absolute top-2 right-2 rounded-md bg-background/80 backdrop-blur-sm p-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity border border-border/50 hover:bg-accent"
                    title="Download image"
                  >
                    <Download className="h-4 w-4 text-foreground" />
                  </a>
                )}
              </div>
            );
          },

          // ── Paragraphs ──
          p({ children, ...props }) {
            return (
              <p className="my-2 leading-relaxed text-foreground" {...props}>
                {children}
              </p>
            );
          },

          // ── Strikethrough (del) ──
          del({ children, ...props }) {
            return (
              <del className="text-muted-foreground/60 line-through" {...props}>
                {children}
              </del>
            );
          },

          // ── Strong / Em ──
          strong({ children, ...props }) {
            return (
              <strong className="font-semibold text-foreground" {...props}>
                {children}
              </strong>
            );
          },
        }}
      >
        {rest}
      </ReactMarkdown>}
    </div>
  );
};

export default MarkdownRenderer;
