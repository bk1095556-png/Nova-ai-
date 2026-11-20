export type ProviderId = "gemini";

export interface ModelOption {
  id: string;
  name: string;
  provider: ProviderId;
  description: string;
  badge?: string;
  supportsSearch: boolean;
  supportsMultimodal: boolean;
}

export interface AttachmentPayload {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  content: string;
  kind: "text" | "binary";
}

export interface Citation {
  title: string;
  uri: string;
}

export interface AgentStep {
  id: string;
  stage: "planning" | "tool_call" | "tool_result" | "synthesizing" | "confirmation";
  label: string;
  detail?: string;
  toolName?: string;
  status: "running" | "done" | "error" | "waiting_confirmation";
  timestamp: number;
}

export interface PendingConfirmation {
  id: string;
  toolName: string;
  actionTitle: string;
  actionDescription: string;
  args: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  attachments?: AttachmentPayload[];
  citations?: Citation[];
  agentSteps?: AgentStep[];
  pendingConfirmation?: PendingConfirmation;
  modelUsed?: string;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface NovaSettings {
  modelId: string;
  agentMode: boolean;
  webSearchEnabled: boolean;
  responseLanguage: "auto" | "english" | "hindi" | "hinglish";
}

export type StreamEvent =
  | { type: "stage"; step: AgentStep }
  | { type: "delta"; text: string }
  | { type: "citations"; citations: Citation[] }
  | { type: "confirmation_required"; confirmation: PendingConfirmation }
  | { type: "done"; modelUsed: string }
  | { type: "error"; message: string };
