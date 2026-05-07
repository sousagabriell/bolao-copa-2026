"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";

interface Props {
  profile: Profile;
}

export default function PerfilClient({ profile }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile.name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAuth, setSavingAuth] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg("Imagem muito grande. Máximo 2MB.");
      console.log("teste-vercel")
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${profile.id}.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (error) {
      setProfileMsg("Erro ao enviar imagem.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");

    const { error } = await supabase
      .from("profiles")
      .update({ name, avatar_url: avatarUrl || null })
      .eq("id", profile.id);

    setSavingProfile(false);
    setProfileMsg(error ? "Erro ao salvar." : "Perfil atualizado!");
  }

  async function saveAuth(e: React.FormEvent) {
    e.preventDefault();
    setSavingAuth(true);
    setAuthMsg("");

    // Reautenticar antes de mudar email/senha
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user?.email ?? "",
      password: currentPassword,
    });

    if (reAuthError) {
      setAuthMsg("Senha atual incorreta.");
      setSavingAuth(false);
      return;
    }

    if (newEmail) {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        setAuthMsg("Erro ao atualizar e-mail: " + error.message);
        setSavingAuth(false);
        return;
      }
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setAuthMsg("Nova senha deve ter pelo menos 8 caracteres.");
        setSavingAuth(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setAuthMsg("Erro ao atualizar senha: " + error.message);
        setSavingAuth(false);
        return;
      }
    }

    setSavingAuth(false);
    setAuthMsg("Atualizado com sucesso!");
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
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Avatar e nome */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Perfil</h2>

        <div className="flex flex-col items-center mb-4">
          <button onClick={() => fileRef.current?.click()} className="relative">
            <div className="w-20 h-20 rounded-full bg-green-100 overflow-hidden border-2 border-green-200">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-green-700 font-bold text-2xl">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="absolute bottom-0 right-0 bg-green-600 text-white rounded-full text-xs px-1.5 py-0.5">
              {uploading ? "..." : "✏️"}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <p className="text-xs text-gray-400 mt-1">Toque para trocar a foto</p>
        </div>

        <form onSubmit={saveProfile} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {profileMsg && (
            <p className={`text-sm ${profileMsg.includes("Erro") ? "text-red-600" : "text-green-600"}`}>
              {profileMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={savingProfile}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm"
          >
            {savingProfile ? "Salvando..." : "Salvar perfil"}
          </button>
        </form>
      </div>

      {/* E-mail e senha */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">E-mail e Senha</h2>
        <form onSubmit={saveAuth} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual (obrigatória)</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Novo e-mail (opcional)</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="novo@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha (opcional)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          {authMsg && (
            <p className={`text-sm ${authMsg.includes("Erro") || authMsg.includes("incorreta") ? "text-red-600" : "text-green-600"}`}>
              {authMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={savingAuth}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm"
          >
            {savingAuth ? "Salvando..." : "Atualizar credenciais"}
          </button>
        </form>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full border border-red-300 text-red-600 font-semibold py-3 rounded-xl hover:bg-red-50 transition-colors"
      >
        Sair da conta
      </button>
    </div>
  );
}
