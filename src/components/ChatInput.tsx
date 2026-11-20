"use client";

import {
  FileText,
  Globe,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Square,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AttachmentPayload } from "@/types/nova";

interface ChatInputProps {
  isStreaming: boolean;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  onSend: (text: string, attachments: AttachmentPayload[]) => void;
  onStop: () => void;
}

const MAX_FILE_BYTES = 4 * 1024 * 1024;

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function ChatInput({
  isStreaming,
  webSearchEnabled,
  onToggleWebSearch,
  onSend,
  onStop,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    setVoiceSupported(Boolean(win.SpeechRecognition || win.webkitSpeechRecognition));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotice(null);
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const added: AttachmentPayload[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        setNotice(`${file.name} exceeds the 4 MB upload limit.`);
        continue;
      }

      const isText =
        file.type.startsWith("text/") ||
        /\.(txt|md|csv|json|ts|tsx|js|py)$/i.test(file.name);

      if (isText) {
        const content = await file.text();
        added.push({
          id: crypto.randomUUID(),
          name: file.name,
          mimeType: file.type || "text/plain",
          size: file.size,
          content,
          kind: "text",
        });
      } else if (
        file.type === "application/pdf" ||
        file.type.startsWith("image/")
      ) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = String(reader.result || "");
            resolve(res.split(",")[1] || "");
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        added.push({
          id: crypto.randomUUID(),
          name: file.name,
          mimeType: file.type,
          size: file.size,
          content: base64,
          kind: "binary",
        });
      } else {
        setNotice(
          `Unsupported format: ${file.name}. Supported: TXT, MD, CSV, JSON, code files, PDF, and images.`
        );
      }
    }

    setAttachments((prev) => [...prev, ...added]);
    e.target.value = "";
  };

  const toggleVoice = () => {
    setNotice(null);
    if (!voiceSupported) {
      setNotice(
        "Voice input uses the browser Web Speech API, which is not supported in this browser."
      );
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setNotice("Microphone permission denied or speech recognition failed.");
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const submit = () => {
    if (isStreaming) return;
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    onSend(trimmed, attachments);
    setText("");
    setAttachments([]);
    setNotice(null);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-3 pb-3 pt-2 sm:px-6">
      {notice && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-700/70 bg-[#0d111d]/95 p-2.5 shadow-xl focus-within:border-cyan-500/50">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 px-1">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200"
              >
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                <span className="max-w-[160px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((a) => a.id !== file.id))
                  }
                  className="text-slate-400 hover:text-rose-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask NOVA AI anything (English, हिंदी, Hinglish)..."
          className="max-h-44 w-full resize-none bg-transparent px-2 py-1.5 text-[15px] text-slate-100 placeholder-slate-500 focus:outline-none"
        />

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.ts,.tsx,.js,.py,.pdf,image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach document or image"
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              <Paperclip className="h-4 w-4" />
              <span className="hidden sm:inline">Attach</span>
            </button>

            <button
              type="button"
              onClick={onToggleWebSearch}
              title="Toggle Web Search Grounding"
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                webSearchEnabled
                  ? "border border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Web Search</span>
            </button>

            <button
              type="button"
              onClick={toggleVoice}
              title={
                voiceSupported
                  ? "Voice input"
                  : "Voice input not supported in this browser"
              }
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                isListening
                  ? "border border-rose-500/40 bg-rose-500/15 text-rose-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {isListening ? (
                <MicOff className="h-4 w-4 animate-pulse" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600/90 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim() && attachments.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
