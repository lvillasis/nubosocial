"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Image as ImageIcon, Smile } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface Props {
  onPostCreated: () => void;
}

export default function NewPostForm({ onPostCreated }: Props) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleImageRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
    setUploadProgress(null);
  };

  const handleEmojiInsert = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUploadProgress(null);

    let imageUrl: string | null = null;

    if (imageFile) {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", "unsigned_post_upload"); // reemplaza por tu preset

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && mountedRef.current) {
          const percent = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(percent);
        }
      };

      const uploadPromise = new Promise<{ secure_url: string }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const parsed = JSON.parse(xhr.response);
              resolve(parsed);
            } catch (err) {
              reject(new Error("Respuesta inválida al subir imagen"));
            }
          } else {
            reject(new Error("Error al subir imagen"));
          }
        };
        xhr.onerror = () => reject(new Error("Fallo de red al subir imagen"));
        xhr.open("POST", "https://api.cloudinary.com/v1_1/dro7oqjdp/image/upload");
        xhr.send(formData);
      });

      try {
        const uploadData = await uploadPromise;
        imageUrl = uploadData.secure_url;
      } catch (err) {
        console.error(err);
        setError("Error al subir imagen");
        return;
      } finally {
        setUploadProgress(null);
      }
    }

    try {
      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, image: imageUrl || null }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Error al crear el post");
        return;
      }

      // limpiar formulario
      setContent("");
      handleImageRemove();
      onPostCreated();
    } catch (err) {
      console.error("Error creando post:", err);
      setError("Error inesperado al crear el post");
    }
  };

  const isDisabled = !imageFile && content.trim() === "";

  return (
    <form
      onSubmit={handleSubmit}
      className="glass rounded-2xl p-4 shadow-card border border-[rgba(255,255,255,0.03)] transition-colors"
    >
      {/* Textarea */}
      <label htmlFor="newpost-text" className="sr-only">
        ¿Qué estás pensando?
      </label>
      <textarea
        id="newpost-text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="¿Qué estás pensando? #hashtag 😄"
        className="w-full p-3 rounded-lg bg-white/60 dark:bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-[var(--muted-fallback)] min-h-[88px] resize-none border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.02)] focus:ring-2 focus:ring-[rgba(124,58,237,0.14)]"
        rows={3}
      />

      {/* Imagen Previsualización */}
      {previewUrl && (
        <div className="relative mt-3 rounded-xl overflow-hidden border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.03)]">
          <img src={previewUrl} alt="Vista previa" className="w-full h-auto object-cover max-h-96" />
          <button
            type="button"
            onClick={handleImageRemove}
            className="absolute top-2 right-2 bg-white/80 text-black hover:brightness-95 dark:bg-black/60 dark:text-white p-1 rounded-full cursor-pointer transition"
            aria-label="Eliminar imagen"
            title="Eliminar imagen"
          >
            <X size={16} />
          </button>

          {uploadProgress !== null && (
            <div className="absolute bottom-0 left-0 h-1 w-full bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.04)]">
              <div
                className="h-full"
                style={{
                  width: `${uploadProgress}%`,
                  background: "linear-gradient(90deg,#7c3aed,#5b21b6)",
                  transition: "width 120ms linear",
                }}
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                role="progressbar"
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-rose-400 mt-2 text-sm" role="alert">
          {error}
        </p>
      )}

      {/* Acciones (emoji, imagen, publicar) */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-white/60 text-slate-800 dark:bg-[rgba(255,255,255,0.03)] dark:text-[var(--muted-fallback)] rounded-full hover:brightness-95 transition cursor-pointer"
            title="Agregar imagen"
          >
            <ImageIcon size={16} />
            <span className="text-sm">Imagen</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

          <button
            type="button"
            onClick={() => handleEmojiInsert("😊")}
            className="flex items-center gap-2 px-3 py-2 bg-white/60 text-slate-800 dark:bg-[rgba(255,255,255,0.03)] dark:text-[var(--muted-fallback)] rounded-full hover:brightness-95 transition cursor-pointer"
            title="Agregar emoji"
          >
            <Smile size={16} />
            <span className="text-sm">Emoji</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={isDisabled}
          className={twMerge(
            "px-5 py-2 rounded-full font-semibold text-white transition",
            isDisabled
              ? "bg-[rgba(255,255,255,0.06)] cursor-not-allowed text-[var(--muted-fallback)]"
              : "btn-primary cursor-pointer"
          )}
          aria-disabled={isDisabled}
        >
          Publicar
        </button>
      </div>
    </form>
  );
}
