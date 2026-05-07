"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const PIX_LINK = "https://nubank.com.br/cobrar/20z6y/69fbc1e5-a16e-4b75-b54e-5e630ecac01e";
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(PIX_LINK)}`;

type PaymentStatus = "pending" | "pending_approval" | "paid" | "rejected";

export default function PagamentoClient() {
  const supabase = createClient();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function submitProof() {
    if (!file) { setError("Selecione o comprovante antes de enviar."); return; }
    setUploading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `comprovantes/${user.id}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setError("Erro ao enviar o arquivo. Tente novamente.");
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
      setStatus("pending_approval");
      setShowUpload(false);
    } else {
      setError("Erro ao enviar solicitação. Tente novamente.");
    }
    setUploading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (status === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-700 to-green-900">
        <div className="text-5xl animate-spin">⚽</div>
      </div>
    );
  }

  // Aguardando aprovação do admin
  if (status === "pending_approval") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-700 to-green-900 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Comprovante enviado!</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Estamos avaliando seu pagamento, aguarde enquanto liberamos seu acesso.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Você será liberado em breve após a aprovação do administrador.
          </p>
          <button
            onClick={handleLogout}
            className="mt-8 text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  // Tela principal de pagamento (pending / rejected)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-700 to-green-900 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">

        {status === "rejected" && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-center">
            <p className="text-sm font-semibold text-red-700">Pagamento não aprovado</p>
            <p className="text-xs text-red-500 mt-1">
              Envie um novo comprovante ou entre em contato com o administrador.
            </p>
          </div>
        )}

        <div className="text-center mb-5">
          <div className="text-5xl mb-3">💸</div>
          <h1 className="text-2xl font-bold text-gray-900">Pagar Inscrição</h1>
          <p className="text-gray-500 text-sm mt-1">
            Faça o PIX e envie o comprovante para liberar seu acesso
          </p>
        </div>

        {/* QR Code gerado via qrserver.com */}
        <div className="flex justify-center mb-4">
          <Image
            src={QR_URL}
            alt="QR Code PIX Nubank"
            width={180}
            height={180}
            className="rounded-xl border border-gray-100"
            unoptimized
          />
        </div>

        <a
          href={PIX_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-purple-600 hover:bg-purple-700 text-white text-center font-semibold py-3 rounded-xl mb-2 transition-colors"
        >
          Abrir link do PIX (Nubank)
        </a>

        <button
          onClick={copyLink}
          className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors mb-5"
        >
          {copied ? "✓ Link copiado!" : "Copiar link"}
        </button>

        <div className="border-t border-gray-100 pt-5">
          {!showUpload ? (
            <button
              onClick={() => setShowUpload(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Já paguei — Enviar comprovante
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Selecione o comprovante:</p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
              />
              {file && <p className="text-xs text-gray-400 truncate">{file.name}</p>}
              {error && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                onClick={submitProof}
                disabled={uploading || !file}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {uploading ? "Enviando..." : "Enviar solicitação"}
              </button>
              <button
                onClick={() => { setShowUpload(false); setError(""); setFile(null); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="mt-5 w-full text-xs text-gray-300 hover:text-gray-500"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}


