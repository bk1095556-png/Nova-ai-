import {
  Content,
  FunctionDeclaration,
  GoogleGenAI,
  Part,
  Type,
} from "@google/genai";
import { Citation } from "@/types/nova";
import {
  AIProvider,
  ProviderGenerateInput,
  ProviderMessage,
  ProviderStreamChunk,
  ToolDefinition,
} from "./provider";

function mapParamType(t: "STRING" | "NUMBER" | "BOOLEAN"): Type {
  switch (t) {
    case "NUMBER":
      return Type.NUMBER;
    case "BOOLEAN":
      return Type.BOOLEAN;
    default:
      return Type.STRING;
  }
}

function toGeminiFunctionDeclarations(
  tools: ToolDefinition[]
): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: Type.OBJECT,
      properties: Object.fromEntries(
        Object.entries(tool.parametersSchema.properties).map(([key, val]) => [
          key,
          {
            type: mapParamType(val.type),
            description: val.description,
          },
        ])
      ),
      required: tool.parametersSchema.required ?? [],
    },
  }));
}

function toGeminiContents(messages: ProviderMessage[]): Content[] {
  const contents: Content[] = [];

  for (const msg of messages) {
    if (msg.role === "tool" && msg.toolName) {
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: msg.toolName,
              response: { result: msg.toolResult },
            },
          },
        ],
      });
      continue;
    }

    if (msg.role === "assistant" && msg.toolName && msg.toolArgs) {
      contents.push({
        role: "model",
        parts: [
          {
            functionCall: {
              name: msg.toolName,
              args: msg.toolArgs,
            },
          },
        ],
      });
      continue;
    }

    const parts: Part[] = [];
    if (msg.attachments?.length) {
      for (const file of msg.attachments) {
        if (file.kind === "text") {
          parts.push({
            text: `\n[Attached Document: ${file.name}]\n\`\`\`\n${file.content.slice(0, 60000)}\n\`\`\`\n`,
          });
        } else {
          parts.push({
            inlineData: {
              mimeType: file.mimeType,
              data: file.content,
            },
          });
        }
      }
    }

    if (msg.content) {
      parts.push({ text: msg.content });
    }

    if (parts.length > 0) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      });
    }
  }

  return contents;
}

function extractCitations(rawChunk: unknown): Citation[] {
  const chunk = rawChunk as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
        }>;
      };
    }>;
  };
  const groundingChunks =
    chunk?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const results: Citation[] = [];
  for (const item of groundingChunks) {
    if (item.web?.uri) {
      results.push({
        uri: item.web.uri,
        title: item.web.title || item.web.uri,
      });
    }
  }
  return results;
}

export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async *streamGenerate(
    input: ProviderGenerateInput
  ): AsyncGenerator<ProviderStreamChunk, void, unknown> {
    const tools: Array<Record<string, unknown>> = [];

    if (input.enableGoogleSearch) {
      tools.push({ googleSearch: {} });
    } else if (input.tools?.length) {
      tools.push({
        functionDeclarations: toGeminiFunctionDeclarations(input.tools),
      });
    }

    const stream = await this.client.models.generateContentStream({
      model: input.modelId,
      contents: toGeminiContents(input.messages),
      config: {
        systemInstruction: input.systemInstruction,
        ...(tools.length > 0 ? { tools } : {}),
        abortSignal: input.signal,
      },
    });

    for await (const chunk of stream) {
      if (input.signal?.aborted) break;

      const citations = extractCitations(chunk);
      const functionCalls = chunk.functionCalls?.map((fc) => ({
        name: fc.name ?? "unknown_tool",
        args: (fc.args as Record<string, unknown>) ?? {},
      }));

      yield {
        textDelta: chunk.text || undefined,
        functionCalls: functionCalls?.length ? functionCalls : undefined,
        citations: citations.length ? citations : undefined,
      };
    }
  }
}
