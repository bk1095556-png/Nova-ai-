"use client";

import { CheckCircle2, Cpu, Trash2, X, XCircle } from "lucide-react";
import { MODEL_CATALOG } from "@/lib/ai/models";
import { NovaSettings } from "@/types/nova";

interface SettingsModalProps {
  open: boolean;
  settings: NovaSettings;
  apiConfigured: boolean | null;
  onUpdate: (next: Partial<NovaSettings>) => void;
  onRequestClearAll: () => void;
  onClose: () => void;
}

export function SettingsModal({
  open,
  settings,
  apiConfigured,
  onUpdate,
  onRequestClearAll,
  onClose,
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700/60 bg-[#0d111d] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">NOVA Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-200">
                Server Gemini API Status
              </span>
              {apiConfigured === true ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Connected
                </span>
              ) : apiConfigured === false ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
                  <XCircle className="h-4 w-4" /> Not configured
                </span>
              ) : (
                <span className="text-xs text-slate-400">Checking...</span>
              )}
            </div>
            {apiConfigured === false && (
              <p className="mt-2 text-xs text-slate-400">
                On Netlify, Gemini access is provided automatically by AI
                Gateway once the site has a production deploy. To use your own
                key instead, set <code className="text-cyan-300">GEMINI_API_KEY</code>{" "}
                on the server. Keys are never exposed to the browser.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              AI Model
            </label>
            <div className="space-y-2">
              {MODEL_CATALOG.map((model) => {
                const active = settings.modelId === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onUpdate({ modelId: model.id })}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-cyan-500/60 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {model.name}
                      </span>
                      {model.badge && (
                        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {model.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
              <div>
                <div className="text-sm font-medium text-white">
                  Agentic Workflow
                </div>
                <div className="text-xs text-slate-400">
                  Enables planning, tool selection (math, datetime, web search),
                  and multi-step reasoning.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.agentMode}
                onChange={(e) => onUpdate({ agentMode: e.target.checked })}
                className="h-4 w-4 accent-cyan-500"
              />
            </label>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
              <label className="mb-1.5 block text-sm font-medium text-white">
                Language Preference
              </label>
              <select
                value={settings.responseLanguage}
                onChange={(e) =>
                  onUpdate({
                    responseLanguage: e.target
                      .value as NovaSettings["responseLanguage"],
                  })
                }
                className="w-full rounded-lg border border-slate-700 bg-[#070910] px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="auto">Auto (English / Hindi / Hinglish)</option>
                <option value="english">English</option>
                <option value="hindi">Hindi (हिंदी)</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onRequestClearAll}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Conversation History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
