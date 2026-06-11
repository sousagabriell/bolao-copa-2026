"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { toast } from "sonner";
import { Camera, LogOut, Pencil } from "lucide-react";

interface Props {
  profile: Profile;
}

export default function PerfilClient({ profile }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(profile.name);
  const [avatarUrl] = useState(profile.avatar_url ?? "");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAuth, setSavingAuth] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);

    const { error } = await supabase
      .from("profiles")
      .update({ name, avatar_url: avatarUrl || null })
      .eq("id", profile.id);

    setSavingProfile(false);
    if (error) {
      toast.error("Erro ao salvar.");
    } else {
      toast.success("Perfil atualizado!");
    }
  }

  async function saveAuth(e: React.FormEvent) {
    e.preventDefault();
    setSavingAuth(true);

    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user?.email ?? "",
      password: currentPassword,
    });

    if (reAuthError) {
      toast.error("Senha atual incorreta.");
      setSavingAuth(false);
      return;
    }

    if (newEmail) {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        toast.error("Erro ao atualizar e-mail: " + error.message);
        setSavingAuth(false);
        return;
      }
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        toast.error("Nova senha deve ter pelo menos 8 caracteres.");
        setSavingAuth(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error("Erro ao atualizar senha: " + error.message);
        setSavingAuth(false);
        return;
      }
    }

    setSavingAuth(false);
    toast.success("Credenciais atualizadas!");
    setCurrentPassword("");
    setNewPassword("");
    setNewEmail("");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-copa-dark">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Avatar e nome */}
        <div className="bg-copa-dark-800 rounded-2xl border border-white/10 p-5">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-5">Perfil</h2>

          <div className="flex flex-col items-center mb-5">
            <Link href="/app/perfil/foto" className="relative group">
              <div className="w-20 h-20 rounded-full bg-copa-dark-700 overflow-hidden border-2 border-white/20 group-hover:border-copa-red/60 transition-colors">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-copa-red rounded-full p-1.5">
                <Camera size={11} className="text-white" />
              </div>
            </Link>
            <p className="text-xs text-white/30 mt-2">Toque para trocar a foto</p>
          </div>

          <form onSubmit={saveProfile} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Nome</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red focus:ring-1 focus:ring-copa-red"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full bg-copa-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <Pencil size={14} />
              {savingProfile ? "Salvando..." : "Salvar perfil"}
            </button>
          </form>
        </div>

        {/* E-mail e senha */}
        <div className="bg-copa-dark-800 rounded-2xl border border-white/10 p-5">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-5">E-mail e Senha</h2>
          <form onSubmit={saveAuth} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Senha atual (obrigatoria)</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red focus:ring-1 focus:ring-copa-red"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Novo e-mail (opcional)</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red focus:ring-1 focus:ring-copa-red"
                placeholder="novo@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Nova senha (opcional)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-copa-red focus:ring-1 focus:ring-copa-red"
                placeholder="Minimo 8 caracteres"
              />
            </div>
            <button
              type="submit"
              disabled={savingAuth}
              className="w-full bg-copa-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm"
            >
              {savingAuth ? "Salvando..." : "Atualizar credenciais"}
            </button>
          </form>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 font-semibold py-3 rounded-2xl hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
          Sair da conta
        </button>
      </div>
    </div>
  );
}