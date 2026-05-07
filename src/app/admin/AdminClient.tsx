"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, XCircle, Users, RotateCcw } from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  payment_status: string;
  payment_proof_url: string | null;
  paid_at: string | null;
  is_admin: boolean;
  created_at: string;
}

export default function AdminPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [proofModal, setProofModal] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/usuarios");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

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
          <div className="bg-copa-dark-800 rounded-2xl border border-copa-gold/30 p-5">
            <h2 className="text-xs font-bold text-copa-gold uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle size={14} />
              Aguardando aprovacao ({pendingApproval.length})
            </h2>
            <div className="space-y-4">
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
          </div>
        )}

        {/* Sincronizacao */}
        <div className="bg-copa-dark-800 rounded-2xl border border-white/10 p-5">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Sincronizacao de Jogos</h2>
          <button
            onClick={syncMatches}
            disabled={syncing}
            className="flex items-center gap-2 bg-copa-red hover:bg-red-700 disabled:opacity-60 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        </div>

        {/* Todos os usuarios */}
        <div className="bg-copa-dark-800 rounded-2xl border border-white/10 p-5">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Users size={14} />
            Todos os participantes ({users.length})
          </h2>

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