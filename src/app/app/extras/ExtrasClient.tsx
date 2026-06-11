"use client";

import { useState, useTransition } from "react";
import { BonusQuestion, BonusAnswer } from "@/lib/types";
import { submitBonusAnswer } from "./actions";
import { toast } from "sonner";
import { Star, Lock, Check, Info, X, ChevronDown } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

const TZ = "America/Sao_Paulo";

interface Props {
  questions: BonusQuestion[];
  answerMap: Record<number, BonusAnswer>;
}

function isExpired(q: BonusQuestion) {
  return !!q.closes_at && new Date(q.closes_at) <= new Date();
}

function PointsBadge({ points, scored }: { points: number; scored?: boolean }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
      scored
        ? points > 0
          ? "bg-copa-gold/20 text-copa-gold border-copa-gold/30"
          : "bg-red-500/20 text-red-400 border-red-400/30"
        : "bg-white/10 text-white/60 border-white/10"
    }`}>
      {scored ? (points > 0 ? `+${points} pts` : "+0 pts") : `${points} pts`}
    </span>
  );
}

function QuestionCard({
  question,
  answer,
}: {
  question: BonusQuestion;
  answer: BonusAnswer | undefined;
}) {
  const [selected, setSelected] = useState(answer?.answer ?? "");
  const [isPending, startTransition] = useTransition();
  const expired = isExpired(question);
  const scored = answer?.points !== null && answer?.points !== undefined;
  const locked = expired || scored;

  function handleSave() {
    if (!selected) { toast.error("Selecione uma opção."); return; }
    startTransition(async () => {
      try {
        await submitBonusAnswer(question.id, selected);
        toast.success("Resposta salva!");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <div className={`bg-copa-dark-800 rounded-2xl border px-4 py-4 ${
      scored && (answer?.points ?? 0) > 0
        ? "border-copa-gold/40"
        : expired && !scored
        ? "border-white/5 opacity-70"
        : "border-white/10"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white leading-snug">{question.question}</p>
          {question.description && (
            <p className="text-xs text-white/40 mt-0.5">{question.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {locked && <Lock size={12} className="text-white/30" />}
          <PointsBadge points={scored ? (answer?.points ?? 0) : question.points} scored={scored} />
        </div>
      </div>

      {/* Prazo */}
      {question.closes_at && (
        <p className="text-xs text-white/30 mb-3">
          {expired ? "Encerrado" : `Até ${formatInTimeZone(new Date(question.closes_at), TZ, "dd/MM 'às' HH:mm", { locale: ptBR })}`}
        </p>
      )}

      {/* Input */}
      {question.type === "select" && (
        <div className="relative">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={locked}
            className="w-full appearance-none bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 pr-8 text-sm text-white focus:outline-none focus:border-copa-red disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" disabled className="bg-copa-dark text-white">Selecione...</option>
            {(question.options ?? []).map((opt) => (
              <option key={opt} value={opt} className="bg-copa-dark text-white">{opt}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        </div>
      )}

      {question.type === "number" && (
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={locked}
          className="w-full appearance-none bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-copa-red disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="" disabled className="bg-copa-dark text-white">Selecione...</option>
          {Array.from(
            { length: (question.max_value ?? 10) - (question.min_value ?? 0) + 1 },
            (_, i) => (question.min_value ?? 0) + i
          ).map((n) => (
            <option key={n} value={String(n)} className="bg-copa-dark text-white">{n}</option>
          ))}
        </select>
      )}

      {/* Botão salvar */}
      {!locked && (
        <button
          onClick={handleSave}
          disabled={isPending || !selected}
          className="mt-3 flex items-center justify-center gap-1.5 w-full bg-copa-red hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
        >
          <Check size={14} />
          {isPending ? "Salvando..." : answer ? "Atualizar resposta" : "Salvar resposta"}
        </button>
      )}

      {/* Resposta correta após apuração */}
      {scored && question.correct_answer && (
        <div className="mt-3 flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
          <span className="text-xs text-white/40">Resposta correta:</span>
          <span className="text-xs font-semibold text-white">{question.correct_answer}</span>
        </div>
      )}
    </div>
  );
}

export default function ExtrasClient({ questions, answerMap }: Props) {
  const [showRules, setShowRules] = useState(false);

  const open = questions.filter((q) => !isExpired(q));
  const closed = questions.filter((q) => isExpired(q));

  return (
    <div className="min-h-screen bg-copa-dark">
      {/* Header */}
      <div className="bg-gradient-to-br from-copa-red to-red-900 px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-copa-gold" fill="currentColor" />
            <h1 className="text-base font-black text-white tracking-wide">Perguntas Extras</h1>
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <Info size={14} />
            Como funciona
          </button>
        </div>
        <p className="text-xs text-white/50 mt-1">Acumule pontos extras além dos palpites</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {questions.length === 0 && (
          <div className="text-center py-16">
            <Star size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Nenhuma pergunta extra disponível ainda.</p>
          </div>
        )}

        {open.length > 0 && (
          <>
            {open.map((q) => (
              <QuestionCard key={q.id} question={q} answer={answerMap[q.id]} />
            ))}
          </>
        )}

        {closed.length > 0 && (
          <>
            {open.length > 0 && (
              <p className="text-xs font-bold text-white/30 uppercase tracking-widest pt-2">Encerradas</p>
            )}
            {closed.map((q) => (
              <QuestionCard key={q.id} question={q} answer={answerMap[q.id]} />
            ))}
          </>
        )}
      </div>

      {/* Modal de regras */}
      {showRules && (
        <div className="fixed inset-0 z-[60]" onClick={() => setShowRules(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-copa-dark-800 rounded-t-2xl border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4 border-b border-white/5">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Como funcionam as perguntas extras</h3>
                <button onClick={() => setShowRules(false)} className="text-white/40 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div style={{ maxHeight: "55vh", overflowY: "scroll" }} className="px-5 py-4 pb-8 space-y-3">
              <div className="bg-copa-gold/10 border border-copa-gold/30 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-white mb-1">O que são?</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  Perguntas especiais sobre a Copa que valem pontos extras no ranking, além dos palpites dos jogos.
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 space-y-2">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Pontuação</p>
                <div className="flex items-center gap-2">
                  <span className="text-copa-gold font-black text-sm w-6">✓</span>
                  <span className="text-xs text-white/70">Acertou → ganha todos os pontos da pergunta</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-black text-sm w-6">✗</span>
                  <span className="text-xs text-white/70">Errou → 0 pontos</span>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Regras</p>
                <ul className="text-xs text-white/50 leading-relaxed space-y-1">
                  <li>• Respostas só podem ser enviadas antes do prazo de cada pergunta</li>
                  <li>• É possível alterar a resposta enquanto o prazo estiver aberto</li>
                  <li>• A apuração é feita pelo administrador após o evento</li>
                  <li>• Os pontos extras somam diretamente ao total do ranking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
