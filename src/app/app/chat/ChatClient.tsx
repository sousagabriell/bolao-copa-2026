"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { MentionableUser, PendingMention, ReactionEmoji } from "@/lib/types";
import ReactionPicker from "@/components/ReactionPicker";
import MentionAutocomplete from "@/components/MentionAutocomplete";
import {
  ChatMessageEntry,
  MessageReactionsMap,
  getMessagesSince,
  sendMessage,
  deleteMessage,
  getReactionsForMessages,
  toggleMessageReaction,
} from "./actions";
import ChatRulesAnnouncement from "./ChatRulesAnnouncement";
import ReactionPredictionCard from "./ReactionPredictionCard";
import ReactionRankingCard from "./ReactionRankingCard";

const TZ = "America/Sao_Paulo";
const POLL_INTERVAL_MS = 15000;

interface Props {
  initialMessages: ChatMessageEntry[];
  initialReactions: MessageReactionsMap;
  currentUserId: string;
  isAdmin: boolean;
  mentionableUsers: MentionableUser[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderWithMentions(text: string, names: string[]) {
  if (names.length === 0) return text;
  const pattern = names.map((n) => `@${escapeRegExp(n)}`).join("|");
  const regex = new RegExp(`(${pattern})`, "gu");
  return text.split(regex).map((part, i) => {
    const isMention = names.some((n) => part === `@${n}`);
    return isMention ? (
      <span key={i} className="text-copa-gold font-semibold">{part}</span>
    ) : (
      part
    );
  });
}

export default function ChatClient({ initialMessages, initialReactions, currentUserId, isAdmin, mentionableUsers }: Props) {
  const [messages, setMessages] = useState<ChatMessageEntry[]>(initialMessages);
  const [reactionsMap, setReactionsMap] = useState<MessageReactionsMap>(initialReactions);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastIdRef = useRef<number>(initialMessages[initialMessages.length - 1]?.id ?? 0);
  const messageIdsRef = useRef<number[]>(initialMessages.map((m) => m.id));

  const [pendingMentions, setPendingMentions] = useState<PendingMention[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState<DOMRect | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredMentionUsers =
    mentionQuery === null
      ? []
      : mentionableUsers.filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6);

  function closeMentionDropdown() {
    setMentionQuery(null);
    setMentionAnchor(null);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setText(value);

    const cursor = e.target.selectionStart ?? value.length;
    const match = value.slice(0, cursor).match(/(?:^|\s)@([^\s@]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setHighlightedIndex(0);
      setMentionAnchor(inputRef.current?.getBoundingClientRect() ?? null);
    } else {
      closeMentionDropdown();
    }
  }

  function handleMentionSelect(user: MentionableUser) {
    const cursor = inputRef.current?.selectionStart ?? text.length;
    const atIndex = text.slice(0, cursor).lastIndexOf("@");
    if (atIndex === -1) {
      closeMentionDropdown();
      return;
    }

    const before = text.slice(0, atIndex);
    const after = text.slice(cursor);
    const inserted = `@${user.name} `;
    setText(before + inserted + after);
    setPendingMentions((prev) => (prev.some((m) => m.userId === user.id) ? prev : [...prev, { userId: user.id, name: user.name }]));
    closeMentionDropdown();

    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      inputRef.current?.setSelectionRange(pos, pos);
      inputRef.current?.focus();
    });
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mentionQuery !== null && filteredMentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % filteredMentionUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + filteredMentionUsers.length) % filteredMentionUsers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleMentionSelect(filteredMentionUsers[highlightedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeMentionDropdown();
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function resolveMentionsForSend(finalText: string, pending: PendingMention[]): string[] {
    const confirmed = new Set<string>();
    for (const m of pending) {
      const re = new RegExp(`(?:^|\\s)@${escapeRegExp(m.name)}(?=\\s|$|[.,!?;:])`, "u");
      if (re.test(finalText)) confirmed.add(m.userId);
    }
    return [...confirmed];
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await getMessagesSince(lastIdRef.current);
        if (fresh.length > 0) {
          lastIdRef.current = fresh[fresh.length - 1].id;
          messageIdsRef.current = [...messageIdsRef.current, ...fresh.map((m) => m.id)];
          setMessages((prev) => [...prev, ...fresh]);
        }
        // Também atualiza as reações das mensagens já carregadas, já que
        // outros participantes podem reagir a qualquer momento.
        if (messageIdsRef.current.length > 0) {
          const reactions = await getReactionsForMessages(messageIdsRef.current);
          setReactionsMap(reactions);
        }
      } catch {
        // silencioso — tenta de novo no próximo ciclo
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  async function handleReact(messageId: number, emoji: ReactionEmoji) {
    try {
      const updated = await toggleMessageReaction(messageId, emoji);
      setReactionsMap((prev) => ({ ...prev, [messageId]: updated }));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível reagir.");
    }
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const mentionedUserIds = resolveMentionsForSend(trimmed, pendingMentions);
      const created = await sendMessage(trimmed, mentionedUserIds);
      const enriched: ChatMessageEntry = {
        ...created,
        mentioned_names: mentionedUserIds
          .map((id) => mentionableUsers.find((u) => u.id === id)?.name)
          .filter((n): n is string => !!n),
      };
      lastIdRef.current = Math.max(lastIdRef.current, enriched.id);
      messageIdsRef.current = [...messageIdsRef.current, enriched.id];
      setMessages((prev) => [...prev, enriched]);
      setText("");
      setPendingMentions([]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a mensagem.");
    }
    setSending(false);
  }

  async function handleDelete(messageId: number) {
    const previous = messages;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    messageIdsRef.current = messageIdsRef.current.filter((id) => id !== messageId);
    try {
      await deleteMessage(messageId);
    } catch (e: unknown) {
      setMessages(previous);
      messageIdsRef.current = [...messageIdsRef.current, messageId];
      toast.error(e instanceof Error ? e.message : "Não foi possível apagar a mensagem.");
    }
  }

  return (
    <div className="h-full flex flex-col bg-copa-dark">
      <ChatRulesAnnouncement />

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
            if (msg.reaction_data?.kind === "prediction") {
              return (
                <ReactionPredictionCard
                  key={msg.id}
                  data={msg.reaction_data}
                  reactorName={name}
                  reactorAvatarUrl={avatar ?? null}
                  time={time}
                  isAdmin={isAdmin}
                  onDelete={() => handleDelete(msg.id)}
                />
              );
            }
            if (msg.reaction_data?.kind === "ranking") {
              return (
                <ReactionRankingCard
                  key={msg.id}
                  data={msg.reaction_data}
                  reactorName={name}
                  reactorAvatarUrl={avatar ?? null}
                  time={time}
                  isAdmin={isAdmin}
                  onDelete={() => handleDelete(msg.id)}
                />
              );
            }

            // Fallback: reação antiga, enviada antes de reaction_data existir.
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
            <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              <div className={`flex ${isMine ? "justify-end" : "justify-start"} w-full`}>
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
                    <p className="text-sm leading-snug break-words whitespace-pre-wrap">
                      {renderWithMentions(msg.message, msg.mentioned_names)}
                    </p>
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

              <div className={`mt-1 ${isMine ? "mr-1" : "ml-9"}`}>
                <ReactionPicker
                  reactions={reactionsMap[msg.id] ?? []}
                  onSelect={(emoji) => handleReact(msg.id, emoji)}
                />
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-white/10 bg-copa-dark-800 px-3 py-3 flex items-center gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleInputKeyDown}
          placeholder="Escreva uma mensagem... (@ pra mencionar alguém)"
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

      {mentionQuery !== null && mentionAnchor && (
        <MentionAutocomplete
          users={filteredMentionUsers}
          anchorRect={mentionAnchor}
          highlightedIndex={highlightedIndex}
          onSelect={handleMentionSelect}
          onClose={closeMentionDropdown}
        />
      )}
    </div>
  );
}
