import { NextRequest } from "next/server";
import { z } from "zod";
import { runNovaAgent } from "@/lib/agent/orchestrator";
import { resolveProvider } from "@/lib/ai/registry";
import { StreamEvent } from "@/types/nova";

export const runtime = "nodejs";

const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  content: z.string(),
  kind: z.enum(["text", "binary"]),
});

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      attachments: z.array(AttachmentSchema).optional(),
    })
  ),
  settings: z.object({
    modelId: z.string(),
    agentMode: z.boolean(),
    webSearchEnabled: z.boolean(),
    responseLanguage: z.enum(["auto", "english", "hindi", "hinglish"]),
  }),
  approvedConfirmation: z
    .object({
      toolName: z.string(),
      args: z.record(z.unknown()),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
    });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request payload",
        issues: parsed.error.flatten(),
      }),
      { status: 400 }
    );
  }

  const { messages, settings, approvedConfirmation } = parsed.data;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        const { provider, modelId } = resolveProvider(settings.modelId);

        for await (const event of runNovaAgent({
          provider,
          modelId,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          settings,
          approvedConfirmation,
          signal: req.signal,
        })) {
          if (req.signal.aborted) break;
          send(event);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected server error occurred.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
