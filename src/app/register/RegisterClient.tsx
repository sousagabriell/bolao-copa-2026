"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, User } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setError("Este e-mail já está cadastrado.");
      } else {
        setError("Erro ao criar conta. Tente novamente.");
      }
      setLoading(false);
      return;
    }

    router.push("/pagamento");
    router.refresh();
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
          <p className="text-white/50 text-sm mt-1">Crie sua conta</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                Nome
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-3 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red focus:ring-1 focus:ring-copa-red"
                  placeholder="Seu nome"
                />
              </div>
            </div>

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
                  placeholder="Mínimo 8 caracteres"
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
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          Já tem conta?{" "}
          <Link href="/login" className="text-copa-gold font-semibold hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}
