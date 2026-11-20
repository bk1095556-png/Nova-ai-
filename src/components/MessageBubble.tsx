"use client";

import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  FileText,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { ChatMessage, PendingConfirmation } from "@/types/nova";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { NovaLogo } from "./NovaLogo";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  onApproveConfirmation?: (confirmation: PendingConfirmation) => void;
  onDenyConfirmation?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isStreaming,
  isLastAssistant,
  onRegenerate,
  onApproveConfirmation,
  onDenyConfirmation,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-blue-500/25 bg-gradient-to-br from-blue-600/25 via-indigo-600/20 to-violet-600/20 px-4 py-3 text-[15px] text-slate-100 shadow-lg sm:max-w-[75%]">
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {message.attachments.map((file) => (
                <span
                  key={file.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/30 px-2.5 py-1 text-xs text-cyan-200"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {file.name}
                </span>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3.5">
      <div className="mt-0.5">
        <NovaLogo size={30} />
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {message.agentSteps && message.agentSteps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.agentSteps.map((step) => (
              <span
                key={step.id}
                title={step.detail}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                  step.status === "error"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    : step.status === "waiting_confirmation"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : step.status === "running"
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                    : "border-slate-700/70 bg-slate-900/70 text-slate-300"
                }`}
              >
                {step.stage === "tool_call" || step.stage === "tool_result" ? (
                  <Wrench className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {step.label}
              </span>
            ))}
          </div>
        )}

        {message.pendingConfirmation && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-200">
                  {message.pendingConfirmation.actionTitle}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                  {message.pendingConfirmation.actionDescription}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onApproveConfirmation?.(message.pendingConfirmation!)
                    }
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
                  >
                    Approve Action
                  </button>
                  <button
                    type="button"
                    onClick={() => onDenyConfirmation?.(message.id)}
                    className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-500/10"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {message.error ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{message.error}</span>
          </div>
        ) : message.content ? (
          <div className="rounded-2xl border border-slate-800/80 bg-[#0d111d]/80 px-4 py-3">
            <MarkdownRenderer content={message.content} />
            {isStreaming && (
              <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-full bg-cyan-400 align-middle" />
            )}
          </div>
        ) : isStreaming ? (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-[#0d111d]/80 px-4 py-3 text-sm text-slate-400">
            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" />
            <span className="ml-1 text-xs">NOVA AI is thinking...</span>
          </div>
        ) : null}

        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.citations.map((c, idx) => (
              <a
                key={c.uri}
                href={c.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-[260px] items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 text-xs text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
              >
                <span className="font-mono text-[10px] text-cyan-400">
                  [{idx + 1}]
                </span>
                <span className="truncate">{c.title}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
              </a>
            ))}
          </div>
        )}

        {!isStreaming && message.content && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-slate-800/70 hover:text-slate-300"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            {isLastAssistant && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-slate-800/70 hover:text-slate-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Regenerate</span>
              </button>
            )}
            {message.modelUsed && (
              <span className="ml-auto font-mono text-[11px] text-slate-600">
                {message.modelUsed}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
