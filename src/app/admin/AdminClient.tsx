"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, XCircle, Users, RotateCcw, Star, Plus, ChevronDown, Calendar, Pencil, Save } from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  payment_status: string;
  payment_proof_url: string | null;
  paid_at: string | null;
  is_admin: boolean;
  created_at: string;
}

interface BonusQuestionRow {
  id: number;
  question: string;
  type: string;
  points: number;
  closes_at: string | null;
  is_active: boolean;
  correct_answer: string | null;
  options: string[] | null;
  min_value: number | null;
  max_value: number | null;
}

interface MatchRow {
  id: number;
  external_id: number;
  home_team: string;
  away_team: string;
  starts_at: string;
  status: string;
  home_score_regular: number | null;
  away_score_regular: number | null;
  stage: string;
  group_name: string | null;
  stadium: string | null;
  city: string | null;
}

const EMPTY_MATCH_FORM = {
  home_team: "",
  away_team: "",
  starts_at: "",
  stage: "GROUP_STAGE",
  group_name: "",
  stadium: "",
  city: "",
  matchday: "",
};

const STAGES = [
  { value: "GROUP_STAGE", label: "Fase de grupos" },
  { value: "LAST_16", label: "Oitavas de final" },
  { value: "QUARTER_FINALS", label: "Quartas de final" },
  { value: "SEMI_FINALS", label: "Semifinal" },
  { value: "THIRD_PLACE", label: "Terceiro lugar" },
  { value: "FINAL", label: "Final" },
];

const EMPTY_FORM = {
  question: "",
  description: "",
  type: "select" as "select" | "number",
  optionsText: "",
  min_value: "0",
  max_value: "10",
  points: "5",
  closes_at: "",
  sort_order: "0",
};

export default function AdminPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [proofModal, setProofModal] = useState<string | null>(null);

  // Matches state
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [matchForm, setMatchForm] = useState(EMPTY_MATCH_FORM);
  const [savingMatch, setSavingMatch] = useState(false);
  const [matchResults, setMatchResults] = useState<Record<number, { home: string; away: string }>>({});
  const [savingResult, setSavingResult] = useState<number | null>(null);
  const [matchFilter, setMatchFilter] = useState<"upcoming" | "finished" | "all">("upcoming");

  // Bonus questions state
  const [bonusQuestions, setBonusQuestions] = useState<BonusQuestionRow[]>([]);
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [bonusForm, setBonusForm] = useState(EMPTY_FORM);
  const [savingBonus, setSavingBonus] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, string>>({});
  const [scoringId, setScoringId] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/usuarios");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  const loadBonusQuestions = useCallback(async () => {
    const res = await fetch("/api/admin/bonus-questions");
    const data = await res.json();
    if (Array.isArray(data)) {
      setBonusQuestions(data);
      const answers: Record<number, string> = {};
      for (const q of data) answers[q.id] = q.correct_answer ?? "";
      setCorrectAnswers(answers);
    }
  }, []);

  const loadMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/matches");
      const data = await res.json();
      if (Array.isArray(data)) {
        setMatches(data);
        const results: Record<number, { home: string; away: string }> = {};
        for (const m of data) {
          results[m.id] = {
            home: m.home_score_regular !== null ? String(m.home_score_regular) : "",
            away: m.away_score_regular !== null ? String(m.away_score_regular) : "",
          };
        }
        setMatchResults(results);
      }
    } catch (e) {
      console.error("Erro ao carregar partidas:", e);
    }
  }, []);

  useEffect(() => { loadUsers(); loadBonusQuestions(); loadMatches(); }, [loadUsers, loadBonusQuestions, loadMatches]);

  async function saveMatch() {
    if (!matchForm.home_team || !matchForm.away_team || !matchForm.starts_at || !matchForm.stage) {
      toast.error("Preencha times, data/hora e fase.");
      return;
    }
    setSavingMatch(true);
    const res = await fetch("/api/admin/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        home_team: matchForm.home_team,
        away_team: matchForm.away_team,
        starts_at: new Date(matchForm.starts_at).toISOString(),
        stage: matchForm.stage,
        group_name: matchForm.group_name || undefined,
        stadium: matchForm.stadium || undefined,
        city: matchForm.city || undefined,
        matchday: matchForm.matchday ? parseInt(matchForm.matchday) : undefined,
      }),
    });
    if (res.ok) {
      toast.success("Partida criada!");
      setMatchForm(EMPTY_MATCH_FORM);
      setShowMatchForm(false);
      await loadMatches();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Erro ao criar partida.");
    }
    setSavingMatch(false);
  }

  async function saveResult(id: number, finish: boolean) {
    const r = matchResults[id];
    if (!r || r.home === "" || r.away === "") {
      toast.error("Informe o placar dos dois times.");
      return;
    }
    setSavingResult(id);
    const res = await fetch("/api/admin/matches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        home_score_regular: parseInt(r.home),
        away_score_regular: parseInt(r.away),
        ...(finish ? { status: "FINISHED" } : {}),
      }),
    });
    if (res.ok) {
      toast.success(finish ? "Resultado salvo e pontos calculados!" : "Placar salvo.");
      await loadMatches();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Erro ao salvar.");
    }
    setSavingResult(null);
  }

  async function saveBonusQuestion() {
    if (!bonusForm.question || !bonusForm.points) {
      toast.error("Preencha pelo menos a pergunta e os pontos.");
      return;
    }
    setSavingBonus(true);
    const options = bonusForm.type === "select"
      ? bonusForm.optionsText.split("\n").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const res = await fetch("/api/admin/bonus-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: bonusForm.question,
        description: bonusForm.description || undefined,
        type: bonusForm.type,
        options,
        min_value: bonusForm.type === "number" ? parseInt(bonusForm.min_value) : undefined,
        max_value: bonusForm.type === "number" ? parseInt(bonusForm.max_value) : undefined,
        points: parseInt(bonusForm.points),
        closes_at: bonusForm.closes_at || undefined,
        sort_order: parseInt(bonusForm.sort_order),
      }),
    });
    if (res.ok) {
      toast.success("Pergunta criada!");
      setBonusForm(EMPTY_FORM);
      setShowBonusForm(false);
      await loadBonusQuestions();
    } else {
      toast.error("Erro ao criar pergunta.");
    }
    setSavingBonus(false);
  }

  async function saveCorrectAnswer(id: number) {
    const answer = correctAnswers[id];
    if (!answer) { toast.error("Digite a resposta correta."); return; }
    const res = await fetch("/api/admin/bonus-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, correct_answer: answer }),
    });
    if (res.ok) toast.success("Resposta salva!");
    else toast.error("Erro ao salvar.");
  }

  async function scoreQuestion(id: number) {
    setScoringId(id);
    const res = await fetch("/api/admin/bonus-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, score: true }),
    });
    const data = await res.json();
    if (res.ok) toast.success(`${data.scored} respostas pontuadas!`);
    else toast.error(data.error ?? "Erro ao pontuar.");
    setScoringId(null);
  }

  async function toggleActive(id: number, current: boolean) {
    await fetch("/api/admin/bonus-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
    await loadBonusQuestions();
  }

  async function updateStatus(userId: string, status: string) {
    const res = await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, payment_status: status }),
    });
    if (res.ok) {
      toast.success(status === "paid" ? "Pagamento aprovado!" : status === "rejected" ? "Pagamento rejeitado." : "Status atualizado.");
    } else {
      toast.error("Erro ao atualizar status.");
    }
    await loadUsers();
  }

  async function syncMatches() {
    setSyncing(true);
    const res = await fetch("/api/cron/sync-matches", {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}` },
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Sincronizados ${data.synced ?? 0} de ${data.total ?? 0} jogos`);
    } else {
      toast.error("Erro ao sincronizar jogos.");
    }
    setSyncing(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const statusLabel: Record<string, string> = {
    paid:             "Pago",
    pending:          "Nao pagou",
    pending_approval: "Aguardando aprovacao",
    rejected:         "Rejeitado",
    revoked:          "Revogado",
  };

  const [openSection, setOpenSection] = useState<string | null>("aprovacoes");
  function toggleSection(key: string) {
    setOpenSection((s) => (s === key ? null : key));
  }

  const pendingApproval = users.filter((u) => u.payment_status === "pending_approval");
  const others = users.filter((u) => u.payment_status !== "pending_approval");

  return (
    <div className="min-h-screen bg-copa-dark">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Header admin */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black text-white">Painel Admin</h1>
          <button
            onClick={handleLogout}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Sair
          </button>
        </div>

        {/* Aprovacoes pendentes */}
        {pendingApproval.length > 0 && (
          <div className="bg-copa-dark-800 rounded-2xl border border-copa-gold/30">
            <button
              onClick={() => toggleSection("aprovacoes")}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <h2 className="text-xs font-bold text-copa-gold uppercase tracking-widest flex items-center gap-2">
                <CheckCircle size={14} />
                Aguardando aprovacao ({pendingApproval.length})
              </h2>
              <ChevronDown size={14} className={`text-copa-gold/50 transition-transform duration-200 ${openSection === "aprovacoes" ? "rotate-180" : ""}`} />
            </button>
            {openSection === "aprovacoes" && (
            <div className="px-5 pb-5 space-y-4">
              {pendingApproval.map((u) => (
                <div key={u.id} className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{u.name}</p>
                      <p className="text-xs text-white/30 mt-0.5">
                        Enviado em {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => updateStatus(u.id, "paid")}
                        className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 font-medium px-3 py-1.5 rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        <CheckCircle size={12} />
                        Aprovar
                      </button>
                      <button
                        onClick={() => updateStatus(u.id, "rejected")}
                        className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 font-medium px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        <XCircle size={12} />
                        Rejeitar
                      </button>
                    </div>
                  </div>

                  {u.payment_proof_url && (
                    <div className="mt-3">
                      {u.payment_proof_url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ? (
                        <button onClick={() => setProofModal(u.payment_proof_url!)} className="block">
                          <Image
                            src={u.payment_proof_url}
                            alt="Comprovante"
                            width={200}
                            height={120}
                            className="rounded-lg border border-white/10 object-cover hover:opacity-80 transition-opacity cursor-zoom-in"
                            unoptimized
                          />
                          <span className="text-xs text-copa-blue mt-1 block">Clique para ampliar</span>
                        </button>
                      ) : (
                        <a
                          href={u.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-copa-blue hover:underline"
                        >
                          Ver comprovante (PDF)
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* Sincronizacao */}
        <div className="bg-copa-dark-800 rounded-2xl border border-white/10">
          <button
            onClick={() => toggleSection("sincronizacao")}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <RefreshCw size={14} />
              Sincronizacao de Jogos
            </h2>
            <ChevronDown size={14} className={`text-white/30 transition-transform duration-200 ${openSection === "sincronizacao" ? "rotate-180" : ""}`} />
          </button>
          {openSection === "sincronizacao" && (
            <div className="px-5 pb-5">
              <button
                onClick={syncMatches}
                disabled={syncing}
                className="flex items-center gap-2 bg-copa-red hover:bg-red-700 disabled:opacity-60 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Sincronizando..." : "Sincronizar agora"}
              </button>
            </div>
          )}
        </div>

        {/* Gerenciar Partidas */}
        <div className="bg-copa-dark-800 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between px-5 py-4">
            <button
              onClick={() => toggleSection("partidas")}
              className="flex-1 flex items-center justify-between"
            >
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} />
                Partidas ({matches.length})
              </h2>
              <ChevronDown size={14} className={`text-white/30 transition-transform duration-200 ${openSection === "partidas" ? "rotate-180" : ""}`} />
            </button>
            {openSection === "partidas" && (
              <button
                onClick={() => setShowMatchForm((v) => !v)}
                className="flex items-center gap-1 text-xs bg-copa-red hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors ml-3"
              >
                <Plus size={12} />
                Nova
              </button>
            )}
          </div>
          {openSection === "partidas" && (
          <div className="px-5 pb-5">

          {/* Formulário nova partida */}
          {showMatchForm && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Time da casa *"
                  value={matchForm.home_team}
                  onChange={(e) => setMatchForm((f) => ({ ...f, home_team: e.target.value }))}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red"
                />
                <input
                  type="text"
                  placeholder="Time visitante *"
                  value={matchForm.away_team}
                  onChange={(e) => setMatchForm((f) => ({ ...f, away_team: e.target.value }))}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Data e hora (horário local) *</label>
                <input
                  type="datetime-local"
                  value={matchForm.starts_at}
                  onChange={(e) => setMatchForm((f) => ({ ...f, starts_at: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-copa-red"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-white/40 mb-1">Fase *</label>
                  <div className="relative">
                    <select
                      value={matchForm.stage}
                      onChange={(e) => setMatchForm((f) => ({ ...f, stage: e.target.value }))}
                      className="w-full appearance-none bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-copa-red"
                    >
                      {STAGES.map((s) => (
                        <option key={s.value} value={s.value} className="bg-copa-dark">{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  </div>
                </div>
                <div className="w-24">
                  <label className="block text-xs text-white/40 mb-1">Grupo</label>
                  <input
                    type="text"
                    placeholder="Ex: A"
                    value={matchForm.group_name}
                    onChange={(e) => setMatchForm((f) => ({ ...f, group_name: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-white/40 mb-1">Rodada</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="1"
                    value={matchForm.matchday}
                    onChange={(e) => setMatchForm((f) => ({ ...f, matchday: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Estádio"
                  value={matchForm.stadium}
                  onChange={(e) => setMatchForm((f) => ({ ...f, stadium: e.target.value }))}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red"
                />
                <input
                  type="text"
                  placeholder="Cidade"
                  value={matchForm.city}
                  onChange={(e) => setMatchForm((f) => ({ ...f, city: e.target.value }))}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveMatch}
                  disabled={savingMatch}
                  className="flex-1 bg-copa-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2 rounded-xl text-sm transition-colors"
                >
                  {savingMatch ? "Salvando..." : "Criar partida"}
                </button>
                <button
                  onClick={() => { setShowMatchForm(false); setMatchForm(EMPTY_MATCH_FORM); }}
                  className="px-4 text-sm text-white/40 hover:text-white/70"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Filtro */}
          <div className="flex gap-2 mb-3">
            {(["upcoming", "finished", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setMatchFilter(f)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  matchFilter === f ? "bg-copa-red text-white" : "bg-white/10 text-white/40 hover:text-white/70"
                }`}
              >
                {f === "upcoming" ? "Próximas" : f === "finished" ? "Encerradas" : "Todas"}
              </button>
            ))}
          </div>

          {/* Lista de partidas */}
          <div className="space-y-3">
            {matches
              .filter((m) => {
                if (matchFilter === "upcoming") return m.status !== "FINISHED";
                if (matchFilter === "finished") return m.status === "FINISHED";
                return true;
              })
              .map((m) => {
                const r = matchResults[m.id] ?? { home: "", away: "" };
                const finished = m.status === "FINISHED";
                const isSaving = savingResult === m.id;
                const stageLabel = STAGES.find((s) => s.value === m.stage)?.label ?? m.stage;
                return (
                  <div key={m.id} className={`bg-white/5 border rounded-xl p-4 ${finished ? "border-green-500/20" : "border-white/10"}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {m.home_team} <span className="text-white/30">x</span> {m.away_team}
                        </p>
                        <p className="text-xs text-white/30 mt-0.5">
                          {new Date(m.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {stageLabel}
                          {m.external_id < 0 && <span className="ml-1 text-copa-gold">(manual)</span>}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        finished ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"
                      }`}>
                        {finished ? "Encerrado" : m.status}
                      </span>
                    </div>

                    {/* Inputs de resultado */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={r.home}
                        onChange={(e) => setMatchResults((prev) => ({ ...prev, [m.id]: { ...prev[m.id], home: e.target.value } }))}
                        placeholder="0"
                        className="w-14 text-center bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-copa-red"
                      />
                      <span className="text-white/30 text-xs">x</span>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={r.away}
                        onChange={(e) => setMatchResults((prev) => ({ ...prev, [m.id]: { ...prev[m.id], away: e.target.value } }))}
                        placeholder="0"
                        className="w-14 text-center bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-copa-red"
                      />
                      <button
                        onClick={() => saveResult(m.id, false)}
                        disabled={isSaving}
                        title="Salvar placar sem encerrar"
                        className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white/60 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Save size={11} />
                      </button>
                      <button
                        onClick={() => saveResult(m.id, true)}
                        disabled={isSaving || finished}
                        className="flex-1 flex items-center justify-center gap-1 text-xs bg-green-500/20 hover:bg-green-500/30 disabled:opacity-40 text-green-400 font-bold px-2.5 py-1.5 rounded-lg transition-colors border border-green-500/20"
                      >
                        <CheckCircle size={11} />
                        {isSaving ? "Salvando..." : finished ? "Encerrado" : "Encerrar e pontuar"}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
          </div>
          )}
        </div>

        {/* Perguntas Extras */}
        <div className="bg-copa-dark-800 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between px-5 py-4">
            <button
              onClick={() => toggleSection("perguntas")}
              className="flex-1 flex items-center justify-between"
            >
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Star size={14} />
                Perguntas Extras ({bonusQuestions.length})
              </h2>
              <ChevronDown size={14} className={`text-white/30 transition-transform duration-200 ${openSection === "perguntas" ? "rotate-180" : ""}`} />
            </button>
            {openSection === "perguntas" && (
              <button
                onClick={() => setShowBonusForm((v) => !v)}
                className="flex items-center gap-1 text-xs bg-copa-red hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors ml-3"
              >
                <Plus size={12} />
                Nova
              </button>
            )}
          </div>
          {openSection === "perguntas" && (
          <div className="px-5 pb-5">

          {/* Formulário nova pergunta */}
          {showBonusForm && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 space-y-3">
              <input
                type="text"
                placeholder="Pergunta *"
                value={bonusForm.question}
                onChange={(e) => setBonusForm((f) => ({ ...f, question: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red"
              />
              <input
                type="text"
                placeholder="Descrição / dica (opcional)"
                value={bonusForm.description}
                onChange={(e) => setBonusForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-white/40 mb-1">Tipo</label>
                  <div className="relative">
                    <select
                      value={bonusForm.type}
                      onChange={(e) => setBonusForm((f) => ({ ...f, type: e.target.value as "select" | "number" }))}
                      className="w-full appearance-none bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-copa-red"
                    >
                      <option value="select" className="bg-copa-dark">Lista de opções</option>
                      <option value="number" className="bg-copa-dark">Número (0–N)</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  </div>
                </div>
                <div className="w-20">
                  <label className="block text-xs text-white/40 mb-1">Pontos</label>
                  <input
                    type="number"
                    min={1}
                    value={bonusForm.points}
                    onChange={(e) => setBonusForm((f) => ({ ...f, points: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-copa-red"
                  />
                </div>
              </div>

              {bonusForm.type === "select" ? (
                <div>
                  <label className="block text-xs text-white/40 mb-1">Opções (uma por linha)</label>
                  <textarea
                    rows={6}
                    placeholder={"Brasil\nArgentina\nFrança\n..."}
                    value={bonusForm.optionsText}
                    onChange={(e) => setBonusForm((f) => ({ ...f, optionsText: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red resize-none"
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-white/40 mb-1">Mínimo</label>
                    <input type="number" value={bonusForm.min_value} onChange={(e) => setBonusForm((f) => ({ ...f, min_value: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-copa-red" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-white/40 mb-1">Máximo</label>
                    <input type="number" value={bonusForm.max_value} onChange={(e) => setBonusForm((f) => ({ ...f, max_value: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-copa-red" />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-white/40 mb-1">Prazo (opcional)</label>
                  <input
                    type="datetime-local"
                    value={bonusForm.closes_at}
                    onChange={(e) => setBonusForm((f) => ({ ...f, closes_at: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-copa-red"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-white/40 mb-1">Ordem</label>
                  <input
                    type="number"
                    min={0}
                    value={bonusForm.sort_order}
                    onChange={(e) => setBonusForm((f) => ({ ...f, sort_order: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-copa-red"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveBonusQuestion}
                  disabled={savingBonus}
                  className="flex-1 bg-copa-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2 rounded-xl text-sm transition-colors"
                >
                  {savingBonus ? "Salvando..." : "Salvar pergunta"}
                </button>
                <button
                  onClick={() => { setShowBonusForm(false); setBonusForm(EMPTY_FORM); }}
                  className="px-4 text-sm text-white/40 hover:text-white/70"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de perguntas */}
          {bonusQuestions.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-4">Nenhuma pergunta criada ainda.</p>
          ) : (
            <div className="space-y-3">
              {bonusQuestions.map((q) => (
                <div key={q.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-copa-gold">{q.points} pts</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${q.is_active ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/30"}`}>
                          {q.is_active ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(q.id, q.is_active)}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors shrink-0"
                    >
                      {q.is_active ? "Desativar" : "Ativar"}
                    </button>
                  </div>

                  {/* Definir resposta correta + pontuar */}
                  <div className="flex gap-2">
                    {q.type === "select" ? (
                      <div className="relative flex-1">
                        <select
                          value={correctAnswers[q.id] ?? ""}
                          onChange={(e) => setCorrectAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          className="w-full appearance-none bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-copa-red"
                        >
                          <option value="" className="bg-copa-dark">Resposta correta...</option>
                          {(q.options ?? []).map((opt) => (
                            <option key={opt} value={opt} className="bg-copa-dark">{opt}</option>
                          ))}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                      </div>
                    ) : (
                      <select
                        value={correctAnswers[q.id] ?? ""}
                        onChange={(e) => setCorrectAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-copa-red"
                      >
                        <option value="" className="bg-copa-dark">Resposta correta...</option>
                        {Array.from({ length: (q.max_value ?? 10) - (q.min_value ?? 0) + 1 }, (_, i) => (q.min_value ?? 0) + i).map((n) => (
                          <option key={n} value={String(n)} className="bg-copa-dark">{n}</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => saveCorrectAnswer(q.id)}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white/70 px-3 py-2 rounded-lg transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
                  <button
                    onClick={() => scoreQuestion(q.id)}
                    disabled={scoringId === q.id || !q.correct_answer}
                    className="w-full flex items-center justify-center gap-1.5 text-xs bg-copa-gold/20 hover:bg-copa-gold/30 disabled:opacity-50 text-copa-gold font-bold py-2 rounded-lg transition-colors border border-copa-gold/30"
                  >
                    <Star size={12} />
                    {scoringId === q.id ? "Pontuando..." : "Pontuar respostas"}
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
          )}
        </div>

        {/* Todos os usuarios */}
        <div className="bg-copa-dark-800 rounded-2xl border border-white/10">
          <button
            onClick={() => toggleSection("usuarios")}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} />
              Todos os participantes ({users.length})
            </h2>
            <ChevronDown size={14} className={`text-white/30 transition-transform duration-200 ${openSection === "usuarios" ? "rotate-180" : ""}`} />
          </button>
          {openSection === "usuarios" && (
          <div className="px-5 pb-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-copa-red border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {others.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white truncate">
                      {u.name}{" "}
                      {u.is_admin && (
                        <span className="text-xs bg-copa-gold/20 text-copa-gold px-1.5 py-0.5 rounded-full ml-1">
                          admin
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-white/30">
                      {statusLabel[u.payment_status] ?? u.payment_status}
                      {u.paid_at ? ` • pago em ${new Date(u.paid_at).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {u.payment_status !== "paid" && u.payment_status !== "pending_approval" && (
                      <button
                        onClick={() => updateStatus(u.id, "paid")}
                        className="text-xs bg-green-500/20 text-green-400 border border-green-500/20 px-2 py-1 rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        Aprovar
                      </button>
                    )}
                    {u.payment_status === "paid" && (
                      <button
                        onClick={() => updateStatus(u.id, "revoked")}
                        className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        <RotateCcw size={10} />
                        Revogar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
          )}
        </div>
      </div>

      {/* Modal comprovante */}
      {proofModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setProofModal(null)}
        >
          <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={proofModal}
              alt="Comprovante ampliado"
              width={400}
              height={600}
              className="rounded-2xl w-full object-contain"
              unoptimized
            />
            <button
              onClick={() => setProofModal(null)}
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/80"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}