"use client";

import { Eraser, Menu, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getModelOption } from "@/lib/ai/models";
import {
  AttachmentPayload,
  ChatMessage,
  ChatSession,
  NovaSettings,
  PendingConfirmation,
  StreamEvent,
} from "@/types/nova";
import { AboutModal } from "./AboutModal";
import { ChatInput } from "./ChatInput";
import { ConfirmDialog } from "./ConfirmDialog";
import { MessageBubble } from "./MessageBubble";
import { SettingsModal } from "./SettingsModal";
import { Sidebar } from "./Sidebar";
import { WelcomeScreen } from "./WelcomeScreen";

const CHATS_STORAGE_KEY = "nova_ai_chats_v1";
const SETTINGS_STORAGE_KEY = "nova_ai_settings_v1";

const DEFAULT_SETTINGS: NovaSettings = {
  modelId: "gemini-4-hydrogen",
  agentMode: true,
  webSearchEnabled: true,
  responseLanguage: "auto",
};

function createEmptyChat(): ChatSession {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New Chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function NovaApp() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [settings, setSettings] = useState<NovaSettings>(DEFAULT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedChats = localStorage.getItem(CHATS_STORAGE_KEY);
      if (savedChats) {
        const parsed = JSON.parse(savedChats) as ChatSession[];
        if (parsed.length > 0) {
          setChats(parsed);
          setActiveChatId(parsed[0].id);
        }
      }
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }
    } catch {}

    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setApiConfigured(Boolean(d.ok)))
      .catch(() => setApiConfigured(false));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    } catch {}
  }, [chats]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages.length, isStreaming]);

  const ensureActiveChat = (): ChatSession => {
    if (activeChat) return activeChat;
    const fresh = createEmptyChat();
    setChats((prev) => [fresh, ...prev]);
    setActiveChatId(fresh.id);
    return fresh;
  };

  const updateChatMessages = (
    chatId: string,
    updater: (prev: ChatMessage[]) => ChatMessage[],
    newTitle?: string
  ) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              title: newTitle ?? c.title,
              updatedAt: Date.now(),
              messages: updater(c.messages),
            }
          : c
      )
    );
  };

  const streamAssistantTurn = async (
    chatId: string,
    historyForApi: ChatMessage[],
    assistantMessageId: string,
    approvedConfirmation?: { toolName: string; args: Record<string, unknown> }
  ) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: historyForApi.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          settings,
          approvedConfirmation,
        }),
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const block of lines) {
          const dataLine = block
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!dataLine) continue;

          const event = JSON.parse(dataLine.slice(6)) as StreamEvent;

          updateChatMessages(chatId, (msgs) =>
            msgs.map((m) => {
              if (m.id !== assistantMessageId) return m;
              if (event.type === "stage") {
                const steps = [...(m.agentSteps ?? [])];
                const idx = steps.findIndex(
                  (s) => s.toolName && s.toolName === event.step.toolName && s.status === "running"
                );
                if (idx >= 0) steps[idx] = event.step;
                else steps.push(event.step);
                return { ...m, agentSteps: steps };
              }
              if (event.type === "delta") {
                return { ...m, content: m.content + event.text };
              }
              if (event.type === "citations") {
                return { ...m, citations: event.citations };
              }
              if (event.type === "confirmation_required") {
                return { ...m, pendingConfirmation: event.confirmation };
              }
              if (event.type === "done") {
                return { ...m, modelUsed: event.modelUsed };
              }
              if (event.type === "error") {
                return { ...m, error: event.message };
              }
              return m;
            })
          );
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const msg =
          err instanceof Error ? err.message : "Failed to contact NOVA AI.";
        updateChatMessages(chatId, (msgs) =>
          msgs.map((m) =>
            m.id === assistantMessageId ? { ...m, error: msg } : m
          )
        );
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleSend = async (
    text: string,
    attachments: AttachmentPayload[]
  ) => {
    const targetChat = ensureActiveChat();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || "Please analyze the attached file(s).",
      createdAt: Date.now(),
      attachments: attachments.length ? attachments : undefined,
    };
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    const nextHistory = [...targetChat.messages, userMessage];
    const autoTitle =
      targetChat.messages.length === 0
        ? (text || attachments[0]?.name || "New Chat").slice(0, 40)
        : undefined;

    updateChatMessages(
      targetChat.id,
      () => [...nextHistory, assistantMessage],
      autoTitle
    );

    await streamAssistantTurn(targetChat.id, nextHistory, assistantMessage.id);
  };

  const handleRegenerate = async () => {
    if (!activeChat || isStreaming) return;
    const msgs = [...activeChat.messages];
    if (msgs[msgs.length - 1]?.role === "assistant") {
      msgs.pop();
    }
    if (msgs.length === 0) return;

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    updateChatMessages(activeChat.id, () => [...msgs, assistantMessage]);
    await streamAssistantTurn(activeChat.id, msgs, assistantMessage.id);
  };

  const handleApproveConfirmation = async (
    messageId: string,
    confirmation: PendingConfirmation
  ) => {
    if (!activeChat) return;
    if (confirmation.toolName === "request_clear_chat_history") {
      if (confirmation.args.scope === "all_chats") {
        setChats([]);
        setActiveChatId(null);
        return;
      }
      updateChatMessages(activeChat.id, () => []);
      return;
    }

    updateChatMessages(activeChat.id, (msgs) =>
      msgs.map((m) =>
        m.id === messageId ? { ...m, pendingConfirmation: undefined } : m
      )
    );
    await streamAssistantTurn(activeChat.id, activeChat.messages, messageId, {
      toolName: confirmation.toolName,
      args: confirmation.args,
    });
  };

  const activeModel = getModelOption(settings.modelId);

  return (
    <div className="flex h-screen overflow-hidden bg-[#070910] text-slate-200">
      <Sidebar
        open={sidebarOpen}
        chats={chats}
        activeChatId={activeChatId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectChat={(id) => setActiveChatId(id)}
        onNewChat={() => {
          const fresh = createEmptyChat();
          setChats((prev) => [fresh, ...prev]);
          setActiveChatId(fresh.id);
        }}
        onRenameChat={(id, title) =>
          setChats((prev) =>
            prev.map((c) => (c.id === id ? { ...c, title } : c))
          )
        }
        onRequestDeleteChat={(chat) =>
          setConfirmState({
            title: "Delete Conversation?",
            description: `Are you sure you want to permanently delete "${chat.title}"?`,
            onConfirm: () => {
              setChats((prev) => {
                const next = prev.filter((c) => c.id !== chat.id);
                if (activeChatId === chat.id) {
                  setActiveChatId(next[0]?.id ?? null);
                }
                return next;
              });
              setConfirmState(null);
            },
          })
        }
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-blue-600/10 via-violet-600/5 to-transparent" />

        <header className="relative z-10 flex items-center justify-between border-b border-slate-800/80 bg-[#070910]/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0d111d] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-500/40"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>{activeModel.name}</span>
              {settings.agentMode && (
                <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300">
                  Agent
                </span>
              )}
       

<!-- ZIP builder added: extracts embedded source files and creates a project archive. -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js">