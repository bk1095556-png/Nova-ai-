import { ModelOption } from "@/types/nova";

export const MODEL_CATALOG: ModelOption[] = [
  {
    id: "gemini-4-hydrogen",
    name: "Gemini 4 Hydrogen",
    provider: "gemini",
    description: "Fast agentic reasoning, coding, and multimodal workflows.",
    badge: "Recommended",
    supportsSearch: true,
    supportsMultimodal: true,
  },
  {
    id: "gemini-4-argon",
    name: "Gemini 4 Argon",
    provider: "gemini",
    description: "Efficient frontier reasoning with balanced speed.",
    supportsSearch: true,
    supportsMultimodal: true,
  },
  {
    id: "gemini-4-carbon",
    name: "Gemini 4 Carbon",
    provider: "gemini",
    description: "Deepest reasoning for complex analysis, math, and architecture.",
    badge: "Deep",
    supportsSearch: true,
    supportsMultimodal: true,
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    provider: "gemini",
    description: "High-speed model for everyday tasks and long context.",
    supportsSearch: true,
    supportsMultimodal: true,
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    provider: "gemini",
    description: "Ultra-fast responses for lightweight queries.",
    badge: "Fastest",
    supportsSearch: true,
    supportsMultimodal: true,
  },
];

export const DEFAULT_MODEL_ID =
  process.env.NOVA_DEFAULT_MODEL || "gemini-4-hydrogen";

export function getModelOption(modelId: string): ModelOption {
  return (
    MODEL_CATALOG.find((m) => m.id === modelId) ?? MODEL_CATALOG[0]
  );
}
