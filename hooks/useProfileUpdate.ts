// hooks/useProfileUpdate.ts
import { useState } from "react";

type ProfileData = {
  name?: string;
  bio?: string;
  location?: string;
  image?: string;      // avatar URL
  coverImage?: string; // cover URL
};

export function useProfileUpdate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const uploadImage = async (file: File, type: "avatar" | "cover") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("Error al subir imagen: " + txt);
    }
    const data = await res.json();
    // Esperamos { success: true, url: result.secure_url, user: updatedUser }
    return data.url as string;
  };

  const updateProfile = async (payload: ProfileData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error("Error actualizando perfil: " + txt);
      }
      const data = await res.json();
      setSuccess(true);
      return data; // retorna el body (ej. { message, user })
    } catch (err: any) {
      setError(err.message || "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Helper que primero sube imágenes (si hay) y luego llama a updateProfile
  const uploadThenUpdate = async (options: {
    name?: string;
    bio?: string;
    location?: string;
    avatarFile?: File | null;
    coverFile?: File | null;
  }) => {
    const { name, bio, location, avatarFile, coverFile } = options;
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      let imageUrl: string | undefined;
      let coverUrl: string | undefined;

      if (avatarFile) {
        imageUrl = await uploadImage(avatarFile, "avatar");
      }
      if (coverFile) {
        coverUrl = await uploadImage(coverFile, "cover");
      }

      const payload: ProfileData = {
        ...(name !== undefined ? { name } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(imageUrl ? { image: imageUrl } : {}),
        ...(coverUrl ? { coverImage: coverUrl } : {}),
      };

      const result = await updateProfile(payload);
      return result;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadImage,
    updateProfile,
    uploadThenUpdate,
    loading,
    error,
    success,
  };
}
