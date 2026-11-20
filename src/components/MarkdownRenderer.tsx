"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") || "text";
  const raw = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-700/60 bg-[#080b14]">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-3.5 py-2 text-xs text-slate-400">
        <span className="font-mono uppercase tracking-wider text-cyan-400/90">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-slate-300 transition hover:bg-slate-800"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-slate-200">
        <code className="font-mono">{raw}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none break-words text-[15px] leading-relaxed prose-headings:font-semibold prose-headings:text-white prose-p:my-2.5 prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-table:border-collapse prose-th:border prose-th:border-slate-700 prose-th:bg-slate-900/60 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-slate-800 prose-td:px-3 prose-td:py-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isBlock = Boolean(className) || String(children).includes("\n");
            if (!isBlock) {
              return (
                <code
                  className="rounded-md bg-slate-800/80 px-1.5 py-0.5 font-mono text-[13px] text-cyan-300"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
