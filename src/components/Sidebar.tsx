"use client";

import {
  Check,
  Info,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { ChatSession } from "@/types/nova";
import { NovaLogo } from "./NovaLogo";

interface SidebarProps {
  open: boolean;
  chats: ChatSession[];
  activeChatId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, title: string) => void;
  onRequestDeleteChat: (chat: ChatSession) => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({
  open,
  chats,
  activeChatId,
  searchQuery,
  onSearchChange,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onRequestDeleteChat,
  onOpenSettings,
  onOpenAbout,
  onCloseMobile,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [showTools, setShowTools] = useState(false);

  const filtered = chats.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  const commitRename = (id: string) => {
    const trimmed = draftTitle.trim();
    if (trimmed) onRenameChat(id, trimmed);
    setEditingId(null);
  };

  return (
    <>
      {open && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800/80 bg-[#090d18] transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <NovaLogo size={28} />
            <span className="bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-base font-semibold tracking-wide text-transparent">
              NOVA AI
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2.5 p-3">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-violet-500/15 px-3 py-2.5 text-sm font-medium text-white transition hover:border-cyan-400/60"
          >
            <Plus className="h-4 w-4 text-cyan-300" />
            New Chat
          </button>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-xl border border-slate-800 bg-[#070910] py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 py-1">
          <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Conversations
          </div>
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-xs text-slate-500">
              No matching conversations.
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((chat) => {
                const active = chat.id === activeChatId;
                const isEditing = editingId === chat.id;
                return (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition ${
                      active
                        ? "bg-slate-800/80 text-white"
                        : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-cyan-400/70" />

                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-1">
                        <input
                          autoFocus
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(chat.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full rounded bg-slate-900 px-1.5 py-0.5 text-xs text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => commitRename(chat.id)}
                          className="text-emerald-400"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectChat(chat.id);
                            onCloseMobile();
                          }}
                          className="flex-1 truncate text-left text-xs font-medium"
                        >
                          {chat.title}
                        </button>
                        <div className="hidden items-center gap-1 group-hover:flex">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(chat.id);
                              setDraftTitle(chat.title);
                            }}
                            title="Rename"
                            className="rounded p-1 hover:bg-slate-700 hover:text-white"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRequestDeleteChat(chat)}
                            title="Delete"
                            className="rounded p-1 hover:bg-rose-500/20 hover:text-rose-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800/80 px-3 py-2">
          <button
            type="button"
            onClick={() => setShowTools((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800/50"
          >
            <span className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-violet-400" />
              Agent Tools
            </span>
            <span className="text-[10px] text-cyan-400">4 active</span>
          </button>
          {showTools && (
            <div className="mt-1 space-y-1 rounded-xl border border-slate-800 bg-[#070910] p-2.5 text-[11px] text-slate-400">
              <div>• Live Web Search (with citations)</div>
              <div>• Safe Math Evaluator</div>
              <div>• Date &amp; Timezone Lookup</div>
              <div>• Guarded History Actions</div>
            </div>
          )}
        </div>

        <div className="space-y-1 border-t border-slate-800/80 p-3">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800/60"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            Settings &amp; Models
          </button>
          <button
            type="button"
            onClick={onOpenAbout}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800/60"
          >
            <Info className="h-4 w-4 text-slate-400" />
            About NOVA AI
          </button>
          <div className="pt-2 text-center text-[11px] text-slate-500">
            NOVA AI • Created by Anand
          </div>
        </div>
      </aside>
    </>
  );
}
