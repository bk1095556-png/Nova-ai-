import { AttachmentPayload, Citation } from "@/types/nova";

export interface ProviderMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  attachments?: AttachmentPayload[];
  toolCallId?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parametersSchema: {
    type: "OBJECT";
    properties: Record<
      string,
      {
        type: "STRING" | "NUMBER" | "BOOLEAN";
        description: string;
      }
    >;
    required?: string[];
  };
}

export interface ProviderGenerateInput {
  modelId: string;
  systemInstruction: string;
  messages: ProviderMessage[];
  tools?: ToolDefinition[];
  enableGoogleSearch?: boolean;
  signal?: AbortSignal;
}

export interface ProviderStreamChunk {
  textDelta?: string;
  functionCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  citations?: Citation[];
}

export interface AIProvider {
  readonly id: string;
  streamGenerate(
    input: ProviderGenerateInput
  ): AsyncGenerator<ProviderStreamChunk, void, unknown>;
}
