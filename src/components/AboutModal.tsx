"use client";

import { Sparkles, X } from "lucide-react";
import { NovaLogo } from "./NovaLogo";

export function AboutModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/60 bg-[#0d111d] p-7 text-center shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex w-fit justify-center">
          <NovaLogo size={54} />
        </div>

        <h2 className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-2xl font-semibold text-transparent">
          NOVA AI
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-300">
          Created by Anand
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
          <Sparkles className="h-3.5 w-3.5" />
          An independent AI assistant project
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          A modern AI experience built to assist, learn, explore and create.
        </p>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-xs leading-relaxed text-slate-400">
          Powered via server-side Gemini API with a modular provider and
          agentic tool architecture. Designed for clarity, honesty, and
          multilingual support across English, Hindi, and Hinglish.
        </div>
      </div>
    </div>
  );
}
