"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

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
  const [syncMsg, setSyncMsg] = useState("");
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
    await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, payment_status: status }),
    });
    await loadUsers();
  }

  async function syncMatches() {
    setSyncing(true);
    setSyncMsg("");
    const res = await fetch("/api/cron/sync-matches", {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}` },
    });
    const data = await res.json();
    setSyncMsg(`Sincronizados ${data.synced ?? 0} de ${data.total ?? 0} jogos`);
    setSyncing(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const statusLabel: Record<string, string> = {
    paid:             "✅ Pago",
    pending:          "⏸ Não pagou",
    pending_approval: "⏳ Aguardando aprovação",
    rejected:         "❌ Rejeitado",
    revoked:          "🚫 Revogado",
  };

  // Separa pendentes de aprovação para mostrar primeiro
  const pendingApproval = users.filter((u) => u.payment_status === "pending_approval");
  const others = users.filter((u) => u.payment_status !== "pending_approval");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white px-4 py-3 flex justify-between items-center">
        <span className="font-bold">⚽ Admin — Bolão Copa 2026</span>
        <button onClick={handleLogout} className="text-xs bg-white/20 px-3 py-1 rounded-lg">
          Sair
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Comprovantes aguardando aprovação */}
        {pendingApproval.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-yellow-800 mb-4 flex items-center gap-2">
              ⏳ Aguardando aprovação ({pendingApproval.length})
            </h2>
            <div className="space-y-4">
              {pendingApproval.map((u) => (
                <div key={u.id} className="bg-white rounded-xl border border-yellow-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Enviado em {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => updateStatus(u.id, "paid")}
                        className="text-sm bg-green-100 text-green-700 font-medium px-3 py-1.5 rounded-lg hover:bg-green-200"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => updateStatus(u.id, "rejected")}
                        className="text-sm bg-red-100 text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-200"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>

                  {u.payment_proof_url && (
                    <div className="mt-3">
                      {u.payment_proof_url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ? (
                        <button
                          onClick={() => setProofModal(u.payment_proof_url!)}
                          className="block"
                        >
                          <Image
                            src={u.payment_proof_url}
                            alt="Comprovante"
                            width={200}
                            height={120}
                            className="rounded-lg border border-gray-100 object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
                            unoptimized
                          />
                          <span className="text-xs text-blue-500 mt-1 block">
                            Clique para ampliar
                          </span>
                        </button>
                      ) : (
                        <a
                          href={u.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          📄 Ver comprovante (PDF)
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sincronização de jogos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Sincronização de Jogos</h2>
          <button
            onClick={syncMatches}
            disabled={syncing}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </button>
          {syncMsg && <p className="text-sm text-gray-600 mt-2">{syncMsg}</p>}
        </div>

        {/* Lista de todos os usuários */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Todos os participantes ({users.length})
          </h2>

          {loading ? (
            <p className="text-gray-400 text-sm">Carregando...</p>
          ) : (
            <div className="space-y-3">
              {others.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {u.name}{" "}
                      {u.is_admin && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full ml-1">
                          admin
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {statusLabel[u.payment_status] ?? u.payment_status}
                      {u.paid_at
                        ? ` • pago em ${new Date(u.paid_at).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {u.payment_status !== "paid" && u.payment_status !== "pending_approval" && (
                      <button
                        onClick={() => updateStatus(u.id, "paid")}
                        className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200"
                      >
                        Aprovar
                      </button>
                    )}
                    {u.payment_status === "paid" && (
                      <button
                        onClick={() => updateStatus(u.id, "revoked")}
                        className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-lg hover:bg-red-200"
                      >
                        Revogar
                      </button>
                    )}
                    {(u.payment_status === "revoked" || u.payment_status === "rejected") && (
                      <button
                        onClick={() => updateStatus(u.id, "pending")}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg"
                      >
                        Resetar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal comprovante ampliado */}
      {proofModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setProofModal(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setProofModal(null)}
              className="absolute -top-10 right-0 text-white text-sm"
            >
              ✕ Fechar
            </button>
            <Image
              src={proofModal}
              alt="Comprovante ampliado"
              width={600}
              height={800}
              className="rounded-xl w-full object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
