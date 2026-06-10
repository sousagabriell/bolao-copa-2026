"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Copy, ExternalLink, Upload, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";

const PIX_LINK = "https://nubank.com.br/cobrar/20z6y/6a29e833-77ec-4f38-a178-434df8e717d8";
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(PIX_LINK)}`;

type PaymentStatus = "pending" | "pending_approval" | "paid" | "rejected";

export default function PagamentoClient() {
  const supabase = createClient();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("payment_status")
      .eq("id", user.id)
      .single();
    if (data) setStatus(data.payment_status as PaymentStatus);
  }, [supabase]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  async function copyLink() {
    await navigator.clipboard.writeText(PIX_LINK);
    toast.success("Link copiado!");
  }

  async function submitProof() {
    if (!file) { toast.error("Selecione o comprovante antes de enviar."); return; }
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `comprovantes/${user.id}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast.error("Erro ao enviar o arquivo. Tente novamente.");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

    const res = await fetch("/api/pagamento/enviar-comprovante", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof_url: urlData.publicUrl }),
    });

    if (res.ok) {
      toast.success("Comprovante enviado! Aguarde a aprovação.");
      setStatus("pending_approval");
      setShowUpload(false);
      setFile(null);
    } else {
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    }
    setUploading(false);
  }

  async function handleRefreshSession() {
    setRefreshing(true);
    await supabase.auth.refreshSession();
    window.location.href = "/app/palpites";
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (status === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor:'#0B1120',backgroundImage:'url(/assets/world-cup-2026-background-free-vector.jpg)',backgroundSize:'cover',backgroundPosition:'center'}}>
        <div className="w-10 h-10 border-2 border-copa-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Aguardando aprovação do admin
  if (status === "pending_approval") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative" style={{backgroundImage:'url(/assets/world-cup-2026-background-free-vector.jpg)',backgroundSize:'cover',backgroundPosition:'center'}}>
        <div className="absolute inset-0 bg-black/70" />
        <div className="w-full max-w-sm text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-copa-gold/10 border border-copa-gold/30 flex items-center justify-center">
              <Clock size={36} className="text-copa-gold" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white mb-3">Comprovante enviado!</h1>
          <p className="text-white/60 text-sm leading-relaxed mb-2">
            Estamos avaliando seu pagamento, aguarde enquanto liberamos seu acesso.
          </p>
          <p className="text-xs text-white/30 mb-8">
            Você será liberado em breve após a aprovação do administrador.
          </p>

          <button
            onClick={handleRefreshSession}
            disabled={refreshing}
            className="w-full bg-copa-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Verificando..." : "Atualizar conta"}
          </button>

          <button
            onClick={handleLogout}
            className="text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative" style={{backgroundImage:'url(/assets/world-cup-2026-background-free-vector.jpg)',backgroundSize:'cover',backgroundPosition:'center'}}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="w-full max-w-sm relative z-10">

        {status === "rejected" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-4 mb-6 flex items-start gap-3">
            <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Pagamento não aprovado</p>
              <p className="text-xs text-red-400/70 mt-1">
                Envie um novo comprovante ou entre em contato com o administrador.
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-white tracking-wide">Pagar Inscrição</h1>
          <p className="text-white/50 text-sm mt-1">
            Faça o PIX e envie o comprovante para liberar seu acesso
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl p-5 mb-4 flex flex-col items-center">
          <Image
            src={QR_URL}
            alt="QR Code PIX Nubank"
            width={200}
            height={200}
            className="rounded-xl"
            unoptimized
          />
          <p className="text-xs text-gray-500 mt-3 font-medium">Escaneie com o app do banco</p>
        </div>

        {/* Botões PIX */}
        <div className="space-y-2 mb-5">
          <a
            href={PIX_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-dark hover:bg-black/80 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            <ExternalLink size={16} />
            Abrir link do PIX (Nubank)
          </a>

          <button
            onClick={copyLink}
            className="flex items-center justify-center gap-2 w-full bg-white/10 border border-white/20 text-white/80 py-3 rounded-xl text-sm hover:bg-white/15 transition-colors"
          >
            <Copy size={15} />
            Copiar link
          </button>
        </div>

        {/* Upload comprovante */}
        <div className="border-t border-white/10 pt-5">
          {!showUpload ? (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center justify-center gap-2 w-full bg-copa-red hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              <CheckCircle size={16} />
              Já paguei — Enviar comprovante
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Selecione o comprovante:</p>

              <label className="flex flex-col items-center justify-center w-full h-28 bg-white/5 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-copa-red/60 transition-colors">
                <Upload size={22} className="text-white/40 mb-2" />
                <span className="text-sm text-white/50">
                  {file ? file.name : "Clique para selecionar"}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>

              <button
                onClick={submitProof}
                disabled={uploading || !file}
                className="w-full bg-copa-red hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                {uploading ? "Enviando..." : "Enviar solicitação"}
              </button>
              <button
                onClick={() => { setShowUpload(false); setFile(null); }}
                className="w-full text-sm text-white/40 hover:text-white/70 py-1"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="mt-6 w-full text-xs text-white/20 hover:text-white/50 transition-colors"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
