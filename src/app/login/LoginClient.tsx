"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    router.push("/app/palpites");
    router.refresh();
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative"
        style={{ backgroundImage: "url('/assets/world-cup-2026-background-free-vector.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Image src="/assets/Logo_copa_2026.png" alt="Copa 2026" width={72} height={72} className="rounded-2xl mb-2" unoptimized />
          <div className="w-10 h-10 border-2 border-copa-red border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm font-medium">Entrando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-copa-dark">
        <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/assets/Logo_copa_2026.png"
              alt="Copa 2026"
              width={80}
              height={80}
              className="rounded-2xl"
              unoptimized
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">Bolão Copa 2026</h1>
          <p className="text-white/50 text-sm mt-1">Faça login para continuar</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                E-mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red focus:ring-1 focus:ring-copa-red"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red focus:ring-1 focus:ring-copa-red"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-copa-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm tracking-wide mt-2"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          Não tem conta?{" "}
          <Link href="/register" className="text-copa-gold font-semibold hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
