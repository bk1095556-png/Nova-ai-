import { Citation } from "@/types/nova";
import { AIProvider, ToolDefinition } from "@/lib/ai/provider";

export interface AgentTool {
  definition: ToolDefinition;
  requiresConfirmation?: boolean;
  describeConfirmation?: (args: Record<string, unknown>) => {
    title: string;
    description: string;
  };
  execute: (
    args: Record<string, unknown>,
    ctx: {
      provider: AIProvider;
      modelId: string;
      signal?: AbortSignal;
    }
  ) => Promise<{
    output: unknown;
    citations?: Citation[];
  }>;
}

function evaluateMathExpression(expr: string): number {
  const cleaned = expr.replace(/\s+/g, "");
  let pos = 0;

  const peek = () => cleaned[pos] ?? "";
  const consume = () => cleaned[pos++] ?? "";

  function parseExpression(): number {
    let val = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const rhs = parseTerm();
      val = op === "+" ? val + rhs : val - rhs;
    }
    return val;
  }

  function parseTerm(): number {
    let val = parsePower();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = consume();
      const rhs = parsePower();
      if (op === "*") val *= rhs;
      else if (op === "/") {
        if (rhs === 0) throw new Error("Division by zero");
        val /= rhs;
      } else {
        val %= rhs;
      }
    }
    return val;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek() === "^") {
      consume();
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === "-") {
      consume();
      return -parseUnary();
    }
    if (peek() === "+") {
      consume();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    if (peek() === "(") {
      consume();
      const val = parseExpression();
      if (consume() !== ")") throw new Error("Mismatched parentheses");
      return val;
    }

    const rest = cleaned.slice(pos);
    const numMatch = rest.match(/^(?:\d+\.?\d*|\.\d+)/);
    if (numMatch) {
      pos += numMatch[0].length;
      return parseFloat(numMatch[0]);
    }

    const idMatch = rest.match(/^[a-zA-Z_]+/);
    if (idMatch) {
      const ident = idMatch[0].toLowerCase();
      pos += ident.length;
      if (ident === "pi") return Math.PI;
      if (ident === "e") return Math.E;

      if (peek() !== "(") throw new Error(`Unknown identifier: ${ident}`);
      consume();
      const arg = parseExpression();
      if (consume() !== ")") throw new Error("Missing closing parenthesis");

      const fns: Record<string, (x: number) => number> = {
        sqrt: Math.sqrt,
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        abs: Math.abs,
        log: Math.log10,
        ln: Math.log,
      };
      if (!fns[ident]) throw new Error(`Unsupported function: ${ident}`);
      return fns[ident](arg);
    }

    throw new Error(`Unexpected token near "${cleaned.slice(pos)}"`);
  }

  const result = parseExpression();
  if (pos < cleaned.length) {
    throw new Error(`Unexpected trailing characters: "${cleaned.slice(pos)}"`);
  }
  if (!Number.isFinite(result)) throw new Error("Result is not finite");
  return result;
}

export function buildAgentTools(options: {
  webSearchEnabled: boolean;
}): Record<string, AgentTool> {
  const tools: Record<string, AgentTool> = {
    get_current_datetime: {
      definition: {
        name: "get_current_datetime",
        description:
          "Returns the current server UTC and formatted local date/time. Useful when asked about today's date, day of week, or time.",
        parametersSchema: {
          type: "OBJECT",
          properties: {
            timezone: {
              type: "STRING",
              description: "Optional IANA timezone like Asia/Kolkata or UTC.",
            },
          },
        },
      },
      execute: async (args) => {
        const tz =
          typeof args.timezone === "string" && args.timezone
            ? args.timezone
            : "Asia/Kolkata";
        const now = new Date();
        let formatted = now.toISOString();
        try {
          formatted = new Intl.DateTimeFormat("en-IN", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone: tz,
          }).format(now);
        } catch {}
        return {
          output: { iso: now.toISOString(), timezone: tz, formatted },
        };
      },
    },

    calculate_math: {
      definition: {
        name: "calculate_math",
        description:
          "Safely evaluates mathematical arithmetic and scientific expressions (+, -, *, /, %, ^, sqrt, sin, cos, tan, log, ln, abs, pi, e).",
        parametersSchema: {
          type: "OBJECT",
          properties: {
            expression: {
              type: "STRING",
              description: "Mathematical expression, e.g. 'sqrt(144) + 2^5'",
            },
          },
          required: ["expression"],
        },
      },
      execute: async (args) => {
        const expression = String(args.expression ?? "");
        const value = evaluateMathExpression(expression);
        return { output: { expression, result: value } };
      },
    },

    request_clear_chat_history: {
      definition: {
        name: "request_clear_chat_history",
        description:
          "Requests clearing/deleting the user's conversation history. Destructive action that always requires user confirmation.",
        parametersSchema: {
          type: "OBJECT",
          properties: {
            scope: {
              type: "STRING",
              description: "'current_chat' or 'all_chats'",
            },
          },
          required: ["scope"],
        },
      },
      requiresConfirmation: true,
      describeConfirmation: (args) => ({
        title: "Confirm Conversation Deletion",
        description:
          args.scope === "all_chats"
            ? "NOVA AI wants to delete all saved chat sessions on this device. Approve to proceed."
            : "NOVA AI wants to clear all messages in the current conversation. Approve to proceed.",
      }),
      execute: async (args) => ({
        output: {
          approved: true,
          scope: args.scope ?? "current_chat",
          instruction: "Client will execute the approved clear operation.",
        },
      }),
    },
  };

  if (options.webSearchEnabled) {
    tools.web_search = {
      definition: {
        name: "web_search",
        description:
          "Searches the live web for current facts, news, documentation, prices, or recent events and returns grounded findings with source citations.",
        parametersSchema: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "Focused web search query.",
            },
          },
          required: ["query"],
        },
      },
      execute: async (args, ctx) => {
        const query = String(args.query ?? "");
        let summary = "";
        const citations: Citation[] = [];
        const seen = new Set<string>();

        for await (const chunk of ctx.provider.streamGenerate({
          modelId: ctx.modelId,
          systemInstruction:
            "Search the web accurately and return a concise, factual summary of the key findings with dates and details. Do not invent facts.",
          messages: [{ role: "user", content: query }],
          enableGoogleSearch: true,
          signal: ctx.signal,
        })) {
          if (chunk.textDelta) summary += chunk.textDelta;
          if (chunk.citations) {
            for (const c of chunk.citations) {
              if (!seen.has(c.uri)) {
                seen.add(c.uri);
                citations.push(c);
              }
            }
          }
        }

        return {
          output: {
            query,
            summary: summary || "No relevant web results were returned.",
            sourcesCount: citations.length,
          },
          citations,
        };
      },
    };
  }

  return tools;
}
