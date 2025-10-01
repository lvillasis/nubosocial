// components/ProfileImageUploader.tsx
import React, { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Props = {
  type?: "avatar" | "cover";
  maxFileSizeMB?: number;
  className?: string;
  onUploaded?: (url: string) => void; // opcional callback
};

export default function ProfileImageUploader({
  type = "avatar",
  maxFileSizeMB = 5,
  className = "",
  onUploaded,
}: Props) {
  const { data: session, update } = useSession();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [xhrRequest, setXhrRequest] = useState<XMLHttpRequest | null>(null);

  // Show session image initially if no local preview
  useEffect(() => {
    if (!preview && session?.user?.image) {
      setPreview(session.user.image as string);
    }
  }, [session?.user?.image]);

  const resetState = () => {
    setLoading(false);
    setProgress(null);
    setError(null);
    setXhrRequest(null);
  };

  const validateFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      return "Solo se permiten imágenes.";
    }
    const maxBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `El archivo supera el tamaño máximo de ${maxFileSizeMB} MB.`;
    }
    return null;
  };

  const uploadFile = (file: File) => {
    setError(null);
    setLoading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    // Usamos XHR para poder reportar progreso
    const xhr = new XMLHttpRequest();
    setXhrRequest(xhr);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setProgress(pct);
      }
    };

    xhr.onload = async () => {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          // asumimos la respuesta { ok: true, url: "..." }
          if (data?.url) {
            // refrescar sesión para obtener nueva imagen si tu API actualiza el perfil
            await update?.();
            onUploaded?.(data.url);
            setPreview(data.url);
            setError(null);
            resetState();
            alert(`${type === "avatar" ? "Avatar" : "Portada"} actualizado correctamente ✅`);
            return;
          }
          throw new Error(data?.error || "Error en la respuesta del servidor");
        } else {
          const data = JSON.parse(xhr.responseText || "{}");
          throw new Error(data?.error || `Error ${xhr.status}`);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error al subir imagen");
        resetState();
      }
    };

    xhr.onerror = () => {
      setError("Error de red al subir la imagen");
      resetState();
    };

    xhr.open("POST", "/api/upload", true);
    xhr.send(formData);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    // preview local inmediato
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    uploadFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    handleFile(file);
    // limpiar input value para permitir re-subir mismo archivo si se desea
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const cancelUpload = () => {
    if (xhrRequest) {
      xhrRequest.abort();
      setError("Subida cancelada");
      resetState();
    }
  };

  const removePreview = async () => {
    // Solo limpiar preview local y restaurar la imagen de sesión si existe
    setPreview(session?.user?.image || null);
    setError(null);
  };

  // UI sizes
  const avatarClass =
    "w-32 h-32 md:w-36 md:h-36 rounded-full object-cover border-4 border-transparent ring-2 ring-offset-2 ring-offset-transparent";
  const coverClass = "w-full h-40 md:h-56 object-cover rounded-lg";

  return (
    <div className={`relative ${className}`}>
      <label
        htmlFor={`file-${type}`}
        onDrop={type === "cover" ? onDrop : undefined}
        onDragOver={type === "cover" ? onDragOver : undefined}
        className={`group block cursor-pointer select-none ${type === "avatar" ? "inline-block" : "w-full"} `}
      >
        <input
          id={`file-${type}`}
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="sr-only"
        />

        {/* Avatar */}
        {type === "avatar" ? (
          <div className="relative inline-block">
            {/* imagen actual / preview */}
            <div className="relative">
              <img
                src={preview || "/default-avatar.png"}
                alt={type === "avatar" ? "Avatar" : "Portada"}
                className={`${avatarClass} bg-gray-200`}
              />
              {/* Overlay edit icon */}
              <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                  <div className="bg-black/60 text-white text-xs py-1 px-3 rounded-full backdrop-blur-sm shadow-lg">
                    Cambiar avatar
                  </div>
                </div>
              </div>
            </div>
            {/* Small controls below */}
            <div className="mt-2 flex items-center gap-2 justify-center">
              {loading ? (
                <>
                  <div className="text-sm text-gray-300">Subiendo...</div>
                  {progress !== null && (
                    <div className="w-24 bg-gray-700 rounded-full overflow-hidden h-2">
                      <div style={{ width: `${progress}%` }} className="h-2 bg-gradient-to-r from-indigo-500 to-pink-500" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={cancelUpload}
                    className="text-xs text-yellow-300 underline ml-2"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Seleccionar
                  </button>
                  {preview && preview !== (session?.user?.image || null) && (
                    <button
                      type="button"
                      onClick={removePreview}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Eliminar
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          // Cover / Portada
          <div className="relative">
            <div className="rounded-lg overflow-hidden border border-gray-800/40">
              <div
                className={`relative flex items-center justify-center ${!preview ? "bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600" : ""} `}
                style={{ minHeight: 160 }}
                aria-hidden
              >
                {preview ? (
                  <img src={preview} alt="Preview portada" className={`${coverClass} w-full`} />
                ) : (
                  <div className="text-center px-4 py-8 text-white/90">
                    <div className="text-lg font-semibold mb-1">Subir portada</div>
                    <div className="text-sm opacity-80">Arrastra la imagen aquí o haz click para seleccionar</div>
                  </div>
                )}

                {/* Loading/progress */}
                {loading && (
                  <div className="absolute inset-0 flex items-end">
                    <div className="w-full">
                      <div className="h-2 bg-gray-700">
                        <div style={{ width: `${progress ?? 0}%` }} className="h-2 bg-gradient-to-r from-indigo-500 to-pink-500 transition-all" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="px-3 py-2 bg-white/5 text-white rounded-md text-sm hover:bg-white/10 transition"
                >
                  Seleccionar imagen
                </button>
                {preview && preview !== (session?.user?.image || null) && (
                  <button
                    type="button"
                    onClick={removePreview}
                    className="px-3 py-2 bg-red-600/20 text-red-300 rounded-md text-sm hover:bg-red-600/30 transition"
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <div className="text-sm text-gray-300">
                {loading ? `Subiendo ${progress ?? 0}%` : `Tamaño máximo: ${maxFileSizeMB}MB`}
              </div>
            </div>
          </div>
        )}
      </label>

      {/* Errores accesibles */}
      {error && (
        <div role="alert" aria-live="assertive" className="mt-2 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
