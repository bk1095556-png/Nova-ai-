"use client";

import { Code2, Compass, Globe, Sparkles } from "lucide-react";
import { NovaLogo } from "./NovaLogo";

const SUGGESTIONS = [
  {
    icon: Code2,
    title: "Architect & Code",
    prompt:
      "Design a scalable TypeScript rate limiter with Redis and explain edge cases.",
  },
  {
    icon: Globe,
    title: "Live Web Research",
    prompt:
      "Search the web for the latest breakthroughs in solid-state batteries in 2026 and cite sources.",
  },
  {
    icon: Sparkles,
    title: "Hinglish / Hindi Support",
    prompt:
      "Quantum entanglement ko simple Hinglish mein samjhao ek real-world analogy ke saath.",
  },
  {
    icon: Compass,
    title: "Math & Reasoning",
    prompt:
      "Calculate the compound growth of ₹1,50,000 at 12% annually over 8 years and break down the formula.",
  },
];

export function WelcomeScreen({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="relative mb-5">
        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-violet-500/20 blur-xl" />
        <div className="relative">
          <NovaLogo size={56} />
        </div>
      </div>

      <h1 className="bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
        Meet NOVA AI
      </h1>
      <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
        An intelligent, modular assistant built for coding, research, math,
        writing, and multilingual reasoning in English, Hindi, and Hinglish.
      </p>
      <p className="mt-1.5 text-xs tracking-wide text-slate-500">
        Created by Anand
      </p>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group flex flex-col items-start rounded-2xl border border-slate-800/90 bg-[#0d111d]/75 p-4 text-left transition duration-200 hover:border-cyan-500/40 hover:bg-[#121829]"
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                <Icon className="h-4 w-4 text-violet-400 transition group-hover:text-cyan-300" />
                {item.title}
              </div>
              <p className="line-clamp-2 text-sm text-slate-300 group-hover:text-white">
                {item.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
