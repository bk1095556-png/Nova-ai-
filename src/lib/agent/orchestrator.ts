import {
  AgentStep,
  Citation,
  NovaSettings,
  StreamEvent,
} from "@/types/nova";
import { AIProvider, ProviderMessage } from "@/lib/ai/provider";
import { buildAgentTools } from "./tools";

export function buildNovaSystemInstruction(settings: NovaSettings): string {
  const languageDirective =
    settings.responseLanguage === "auto"
      ? "Automatically match the user's language (English, Hindi in Devanagari, or Hinglish in Roman script naturally)."
      : `Prefer responding in ${settings.responseLanguage}.`;

  return [
    "You are NOVA AI — an independent, intelligent, calm, and structured AI assistant.",
    "Creator identity: You were created by Anand. If asked 'Who created you?', 'Who is your developer?', or similar questions, respond naturally: 'I was created by Anand.'",
    "Honesty & transparency: Never pretend you have your own custom-trained foundation model. If asked about your underlying model architecture, transparently state that NOVA AI connects to Gemini models via API.",
    "Accuracy: Admit uncertainty clearly instead of guessing or inventing facts. Cite sources when web_search returns citations.",
    `Language support: ${languageDirective}`,
    "Capabilities: Assist clearly across coding, mathematics, science, writing, brainstorming, document analysis, and research using clean Markdown.",
    "Safety: Never execute destructive actions without explicit user confirmation.",
  ].join("\n");
}

function makeStep(
  partial: Omit<AgentStep, "id" | "timestamp">
): AgentStep {
  return {
    ...partial,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
}

export async function* runNovaAgent(params: {
  provider: AIProvider;
  modelId: string;
  messages: ProviderMessage[];
  settings: NovaSettings;
  approvedConfirmation?: { toolName: string; args: Record<string, unknown> };
  signal?: AbortSignal;
}): AsyncGenerator<StreamEvent, void, unknown> {
  const { provider, modelId, settings, signal } = params;
  const systemInstruction = buildNovaSystemInstruction(settings);
  const workingMessages: ProviderMessage[] = [...params.messages];
  const collectedCitations = new Map<string, Citation>();

  if (params.approvedConfirmation) {
    const tools = buildAgentTools({
      webSearchEnabled: settings.webSearchEnabled,
    });
    const tool = tools[params.approvedConfirmation.toolName];
    if (tool) {
      yield {
        type: "stage",
        step: makeStep({
          stage: "tool_result",
          label: `Executed approved action: ${params.approvedConfirmation.toolName}`,
          status: "done",
          toolName: params.approvedConfirmation.toolName,
        }),
      };
      const exec = await tool.execute(params.approvedConfirmation.args, {
        provider,
        modelId,
        signal,
      });
      workingMessages.push({
        role: "tool",
        content: "",
        toolName: params.approvedConfirmation.toolName,
        toolResult: exec.output,
      });
    }
  }

  if (!settings.agentMode) {
    yield {
      type: "stage",
      step: makeStep({
        stage: "synthesizing",
        label: "Generating response",
        status: "running",
      }),
    };

    for await (const chunk of provider.streamGenerate({
      modelId,
      systemInstruction,
      messages: workingMessages,
      enableGoogleSearch: settings.webSearchEnabled,
      signal,
    })) {
      if (signal?.aborted) return;
      if (chunk.citations) {
        for (const c of chunk.citations) collectedCitations.set(c.uri, c);
      }
      if (chunk.textDelta) {
        yield { type: "delta", text: chunk.textDelta };
      }
    }

    if (collectedCitations.size > 0) {
      yield {
        type: "citations",
        citations: Array.from(collectedCitations.values()),
      };
    }
    yield { type: "done", modelUsed: modelId };
    return;
  }

  const tools = buildAgentTools({
    webSearchEnabled: settings.webSearchEnabled,
  });
  const toolDefinitions = Object.values(tools).map((t) => t.definition);

  yield {
    type: "stage",
    step: makeStep({
      stage: "planning",
      label: "Planning approach & evaluating tools",
      status: "done",
    }),
  };

  const MAX_STEPS = 4;

  for (let stepIdx = 0; stepIdx < MAX_STEPS; stepIdx++) {
    if (signal?.aborted) return;

    let pendingToolCall: {
      name: string;
      args: Record<string, unknown>;
    } | null = null;
    let streamedTextThisTurn = false;

    for await (const chunk of provider.streamGenerate({
      modelId,
      systemInstruction,
      messages: workingMessages,
      tools: toolDefinitions,
      signal,
    })) {
      if (signal?.aborted) return;

      if (chunk.functionCalls?.length) {
        pendingToolCall = chunk.functionCalls[0];
        break;
      }

      if (chunk.textDelta) {
        if (!streamedTextThisTurn) {
          streamedTextThisTurn = true;
          yield {
            type: "stage",
            step: makeStep({
              stage: "synthesizing",
              label: "Synthesizing final response",
              status: "done",
            }),
          };
        }
        yield { type: "delta", text: chunk.textDelta };
      }
    }

    if (!pendingToolCall) {
      break;
    }

    const tool = tools[pendingToolCall.name];
    if (!tool) {
      workingMessages.push({
        role: "tool",
        content: "",
        toolName: pendingToolCall.name,
        toolResult: { error: `Unknown tool: ${pendingToolCall.name}` },
      });
      continue;
    }

    if (tool.requiresConfirmation) {
      const desc = tool.describeConfirmation?.(pendingToolCall.args) ?? {
        title: `Confirm ${pendingToolCall.name}`,
        description: "NOVA AI is requesting confirmation before proceeding.",
      };
      yield {
        type: "stage",
        step: makeStep({
          stage: "confirmation",
          label: `Awaiting confirmation: ${pendingToolCall.name}`,
          status: "waiting_confirmation",
          toolName: pendingToolCall.name,
        }),
      };
      yield {
        type: "confirmation_required",
        confirmation: {
          id: crypto.randomUUID(),
          toolName: pendingToolCall.name,
          actionTitle: desc.title,
          actionDescription: desc.description,
          args: pendingToolCall.args,
        },
      };
      yield { type: "done", modelUsed: modelId };
      return;
    }

    yield {
      type: "stage",
      step: makeStep({
        stage: "tool_call",
        label: `Running tool: ${pendingToolCall.name}`,
        detail: JSON.stringify(pendingToolCall.args),
        status: "running",
        toolName: pendingToolCall.name,
      }),
    };

    try {
      const execResult = await tool.execute(pendingToolCall.args, {
        provider,
        modelId,
        signal,
      });

      if (execResult.citations) {
        for (const c of execResult.citations) {
          collectedCitations.set(c.uri, c);
        }
      }

      yield {
        type: "stage",
        step: makeStep({
          stage: "tool_result",
          label: `Completed: ${pendingToolCall.name}`,
          status: "done",
          toolName: pendingToolCall.name,
        }),
      };

      workingMessages.push({
        role: "assistant",
        content: "",
        toolName: pendingToolCall.name,
        toolArgs: pendingToolCall.args,
      });
      workingMessages.push({
        role: "tool",
        content: "",
        toolName: pendingToolCall.name,
        toolResult: execResult.output,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Tool execution failed";
      yield {
        type: "stage",
        step: makeStep({
          stage: "tool_result",
          label: `Tool failed: ${pendingToolCall.name}`,
          detail: message,
          status: "error",
          toolName: pendingToolCall.name,
        }),
      };
      workingMessages.push({
        role: "tool",
        content: "",
        toolName: pendingToolCall.name,
        toolResult: { error: message },
      });
    }
  }

  if (collectedCitations.size > 0) {
    yield {
      type: "citations",
      citations: Array.from(collectedCitations.values()),
    };
  }

  yield { type: "done", modelUsed: modelId };
}
