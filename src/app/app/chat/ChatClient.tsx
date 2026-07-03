"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { ChatMessageEntry, getMessagesSince, sendMessage, deleteMessage } from "./actions";
import ChatRulesAnnouncement from "./ChatRulesAnnouncement";

const TZ = "America/Sao_Paulo";
const POLL_INTERVAL_MS = 15000;

interface Props {
  initialMessages: ChatMessageEntry[];
  currentUserId: string;
  isAdmin: boolean;
}

export default function ChatClient({ initialMessages, currentUserId, isAdmin }: Props) {
  const [messages, setMessages] = useState<ChatMessageEntry[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number>(initialMessages[initialMessages.length - 1]?.id ?? 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await getMessagesSince(lastIdRef.current);
        if (fresh.length === 0) return;
        lastIdRef.current = fresh[fresh.length - 1].id;
        setMessages((prev) => [...prev, ...fresh]);
      } catch {
        // silencioso — tenta de novo no próximo ciclo
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const created = await sendMessage(trimmed);
      lastIdRef.current = Math.max(lastIdRef.current, created.id);
      setMessages((prev) => [...prev, created]);
      setText("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a mensagem.");
    }
    setSending(false);
  }

  async function handleDelete(messageId: number) {
    const previous = messages;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await deleteMessage(messageId);
    } catch (e: unknown) {
      setMessages(previous);
      toast.error(e instanceof Error ? e.message : "Não foi possível apagar a mensagem.");
    }
  }

  return (
    <div className="h-full flex flex-col bg-copa-dark">
      <ChatRulesAnnouncement />

      {/* Header */}
      <div className="shrink-0 bg-gradient-to-br from-copa-red to-red-900 px-4 py-5">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-copa-gold" fill="currentColor" />
          <h1 className="text-base font-black text-white tracking-wide">Chat do Bolão</h1>
        </div>
        <p className="text-xs text-white/50 mt-1">Fale com os outros participantes</p>
      </div>

      {/* Mensagens */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <MessageCircle size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Nenhuma mensagem ainda.</p>
            <p className="text-white/25 text-xs mt-1">Seja o primeiro a puxar assunto!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.user_id === currentUserId;
          const name = msg.profiles?.name ?? "Participante";
          const avatar = msg.profiles?.avatar_url;
          const time = formatInTimeZone(new Date(msg.created_at), TZ, "HH:mm");

          if (msg.type === "reaction") {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="group flex items-center gap-1.5 max-w-[90%] bg-white/5 border border-white/10 rounded-full pl-3 pr-1.5 py-1.5">
                  <p className="text-xs text-white/50 text-center leading-snug break-words">
                    {msg.message} <span className="text-white/25">· {time}</span>
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      aria-label="Apagar mensagem"
                      className="shrink-0 text-white/20 hover:text-red-400 p-0.5 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                {!isMine && (
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/10 bg-copa-dark-700 flex items-center justify-center mb-1">
                    {avatar ? (
                      <Image src={avatar} alt={name} width={28} height={28} className="object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-white">{name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                )}

                <div
                  className={`rounded-2xl px-3 py-2 ${
                    isMine
                      ? "bg-copa-red text-white rounded-br-sm"
                      : "bg-copa-dark-800 text-white border border-white/10 rounded-bl-sm"
                  }`}
                >
                  {!isMine && (
                    <p className="text-[11px] font-bold text-copa-gold mb-0.5">{name}</p>
                  )}
                  <p className="text-sm leading-snug break-words whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-white/70" : "text-white/30"}`}>{time}</p>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    aria-label="Apagar mensagem"
                    className="shrink-0 text-white/20 hover:text-red-400 p-1 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-white/10 bg-copa-dark-800 px-3 py-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escreva uma mensagem..."
          maxLength={500}
          className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          aria-label="Enviar mensagem"
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-copa-red hover:bg-red-700 disabled:opacity-50 text-white transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
