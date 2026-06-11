"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { toast } from "sonner";
import { Camera, ArrowLeft, Trash2, Check, X } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface Props {
  profile: Profile;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, cropPixels: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const size = 300;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, size, size
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas vazio"));
    }, "image/jpeg", 0.92);
  });
}

export default function FotoClient({ profile }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  // crop state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB para edição.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirmCrop() {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);

    let blob: Blob;
    try {
      blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
    } catch {
      toast.error("Erro ao processar imagem.");
      setUploading(false);
      return;
    }

    const path = `avatars/${profile.id}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      toast.error("Erro ao enviar imagem.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", profile.id);

    if (updateError) {
      toast.error("Erro ao salvar foto.");
      setUploading(false);
      return;
    }

    setAvatarUrl(publicUrl);
    setImageSrc(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setUploading(false);
    toast.success("Foto atualizada!");
  }

  async function handleRemove() {
    setRemoving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", profile.id);

    if (error) {
      toast.error("Erro ao remover foto.");
      setRemoving(false);
      return;
    }

    setAvatarUrl("");
    setRemoving(false);
    toast.success("Foto removida.");
  }

  return (
    <div className="min-h-screen bg-copa-dark flex flex-col">
      <div className="max-w-lg mx-auto w-full px-4 py-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Voltar</span>
        </button>

        <div className="bg-copa-dark-800 rounded-2xl border border-white/10 p-6 flex flex-col items-center gap-6">
          <h1 className="text-xs font-bold text-white/40 uppercase tracking-widest self-start">
            Foto de perfil
          </h1>

          {/* Avatar preview */}
          <div className="w-32 h-32 rounded-full bg-copa-dark-700 overflow-hidden border-2 border-white/20">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-4xl">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || removing}
              className="w-full flex items-center justify-center gap-2 bg-copa-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              <Camera size={16} />
              {avatarUrl ? "Trocar foto" : "Adicionar foto"}
            </button>

            {avatarUrl && (
              <button
                onClick={handleRemove}
                disabled={uploading || removing}
                className="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-60 font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                <Trash2 size={16} />
                {removing ? "Removendo..." : "Remover foto"}
              </button>
            )}
          </div>

          <p className="text-xs text-white/30 text-center">
            Formatos aceitos: JPG, PNG, WEBP · Máximo 10MB
          </p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Modal de crop */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Área do cropper */}
          <div className="relative flex-1">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Controle de zoom */}
          <div className="bg-black/80 px-6 pt-4 pb-2">
            <label className="block text-xs text-white/40 text-center mb-2">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-copa-red"
            />
          </div>

          {/* Botões */}
          <div className="bg-black/80 px-6 pb-8 pt-3 flex gap-3">
            <button
              onClick={() => { setImageSrc(null); setZoom(1); setCrop({ x: 0, y: 0 }); }}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 border border-white/20 text-white/70 font-semibold py-3 rounded-xl text-sm"
            >
              <X size={16} />
              Cancelar
            </button>
            <button
              onClick={handleConfirmCrop}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 bg-copa-red hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {uploading ? "Enviando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
