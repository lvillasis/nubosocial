// components/ProfileSettings.tsx
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import NextImage from "next/image";
import { useRouter } from "next/router";
import type { Area } from "react-easy-crop";
import Cropper from "react-easy-crop";

/** Crea HTMLImageElement (para evitar usar next/image en canvas ops) */
const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });

/**
 * Recorta usando canvas y devuelve un Blob PNG
 * pixelCrop: objeto retornado por react-easy-crop getCroppedAreaPixels
 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(pixelCrop.width);
  canvas.height = Math.round(pixelCrop.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Canvas is empty"));
      resolve(blob);
    }, "image/png");
  });
}

export default function ProfileSettings() {
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  // form state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState<string | null>(null); // avatar URL
  const [cover, setCover] = useState<string | null>(null);

  // upload / crop state
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type?: "success" | "error" } | null>(null);

  const initRef = useRef({ name: "", bio: "", location: "", image: "", cover: "" });

  // Crop modal state - we use same modal but track mode "avatar" | "cover"
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropMode, setCropMode] = useState<null | "avatar" | "cover">(null);
  const [rawFileUrl, setRawFileUrl] = useState<string | null>(null); // local preview for crop
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropUploading, setCropUploading] = useState(false);

  const bioMax = 160;

    // load initial data from API / session
    useEffect(() => {
    const fetchData = async () => {
        if (!session?.user?.email) {
        setLoading(false);
        return;
        }
        try {
        setLoading(true);
        const res = await fetch("/api/user/settings");
        if (!res.ok) throw new Error("Error al cargar usuario");
        const data = await res.json();

        const initialName = data.name || session.user.name || "";
        const initialBio = data.bio || "";
        const initialLocation = data.location || "";
        const initialImage = data.image || session.user.image || "/default-avatar.png";
        const initialCover = data.coverImage || "";

        setName(initialName);
        setBio(initialBio);
        setLocation(initialLocation);
        setImage(initialImage);
        setCover(initialCover || null);

        initRef.current = {
            name: initialName,
            bio: initialBio,
            location: initialLocation,
            image: initialImage,
            cover: initialCover || "",
        };
        } catch (err) {
        console.error("Error cargando configuración", err);
        setStatusMsg({ text: "Error cargando configuración", type: "error" });
        } finally {
        setLoading(false);
        }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user?.email]);

  const isDirty =
    name !== initRef.current.name ||
    bio !== initRef.current.bio ||
    location !== initRef.current.location ||
    (image || "") !== initRef.current.image ||
    (cover || "") !== initRef.current.cover;

  // warn beforeunload if dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // When user selects an avatar file -> open crop modal in avatar mode
  const onAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setUploadErr("Solo se permiten imágenes.");
      return;
    }
    if (f.size > 6 * 1024 * 1024) {
      setUploadErr("Max 6MB.");
      return;
    }
    setUploadErr(null);
    const localUrl = URL.createObjectURL(f);
    setRawFileUrl(localUrl);
    setCropMode("avatar");
    setShowCropModal(true);
  };

  // When user selects a cover file -> open crop modal in cover mode
  const onCoverFileSelected = (e: React.ChangeEvent<HTMLInputElement> | File) => {
    let f: File | undefined;
    if (e instanceof File) f = e;
    else f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setStatusMsg({ text: "Solo se permiten imágenes para la portada", type: "error" });
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      setStatusMsg({ text: "La portada supera 12MB (recomiendo <8MB)", type: "error" });
      return;
    }
    const localUrl = URL.createObjectURL(f);
    setRawFileUrl(localUrl);
    setCropMode("cover");
    setShowCropModal(true);
    setStatusMsg(null);
  };

  const onCropComplete = (_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  };

  // Apply crop: build blob, upload to /api/upload, set state, refresh route
  const applyCropAndUpload = async () => {
    if (!rawFileUrl || !croppedAreaPixels || !cropMode) return;
    setCropUploading(true);
    setUploading(true);
    setStatusMsg(null);

    try {
      const blob = await getCroppedImg(rawFileUrl, croppedAreaPixels);
      const fileName = cropMode === "avatar" ? "avatar.png" : "cover.png";
      const file = new File([blob], fileName, { type: "image/png" });

      const form = new FormData();
      form.append("file", file);
      form.append("type", cropMode === "avatar" ? "avatar" : "cover");

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error en upload");

      // update local preview to returned url
      if (cropMode === "avatar") {
        setImage(data.url);
        setStatusMsg({ text: "Avatar subido correctamente", type: "success" });
      } else {
        setCover(data.url);
        setStatusMsg({ text: "Portada subido correctamente", type: "success" });
      }

      // cleanup
      setShowCropModal(false);
      setRawFileUrl((u) => {
        if (u) URL.revokeObjectURL(u);
        return null;
      });
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);

      // refresh page/session to get latest user data
      await router.replace(router.asPath);
    } catch (err: any) {
      console.error("Error upload crop:", err);
      setStatusMsg({ text: err?.message || "Error al subir imagen", type: "error" });
    } finally {
      setCropUploading(false);
      setUploading(false);
    }
  };

  // Simple upload without cropping (fallback) - e.g. drag/drop cover directly
  const uploadFileDirect = async (f: File, type: "avatar" | "cover") => {
    if (!f) return null;
    setUploading(true);
    setStatusMsg(null);

    try {
      const form = new FormData();
      form.append("file", f);
      form.append("type", type);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      if (type === "avatar") setImage(data.url);
      else setCover(data.url);

      await router.replace(router.asPath);
      return data.url;
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: err?.message || "Error al subir imagen", type: "error" });
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Save handler (POST to your API)
  const handleSave = async () => {
    if (!session?.user?.email) return;
    setStatusMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          name: name.trim(),
          bio: bio.trim(),
          location: location.trim(),
          image,
          cover,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error al guardar");

      initRef.current = { name, bio, location, image: image || "", cover: cover || "" };
      setStatusMsg({ text: "Configuración guardada ✓", type: "success" });
      await router.replace(router.asPath);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: err?.message || "Error al guardar", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(initRef.current.name);
    setBio(initRef.current.bio);
    setLocation(initRef.current.location);
    setImage(initRef.current.image || null);
    setCover(initRef.current.cover || null);
    setStatusMsg(null);
  };

  const handleCoverDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    const f = ev.dataTransfer.files?.[0];
    if (f) onCoverFileSelected(f);
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white/60 dark:bg-[#07070f]/60 rounded-xl shadow-md flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        <span className="ml-3 text-gray-600 dark:text-gray-300">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-[#0b0b12] rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-gray-800 dark:text-gray-100">Configuración de perfil</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ajusta tu nombre, biografía y fotos.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Cerrar"
              onClick={() => (isDirty ? confirm("Tienes cambios sin guardar. ¿Salir?") && router.back() : router.back())}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cover preview & upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Portada</label>

          <div
            className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800"
            onDrop={handleCoverDrop}
            onDragOver={(ev) => ev.preventDefault()}
          >
            {cover ? (
              <div className="w-full h-44 md:h-56 relative bg-gray-100 dark:bg-gray-900">
                {/* objectPosition centered for better centering */}
                <NextImage src={cover} alt="Cover preview" fill style={{ objectFit: "cover", objectPosition: "center" }} />
              </div>
            ) : (
              <div className="w-full h-44 md:h-56 flex items-center justify-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white">
                <div className="text-sm md:text-base px-4 text-center">
                  Sin portada aún
                  <div className="text-xs opacity-90 mt-1">Arrastra una imagen o haz clic para seleccionar</div>
                </div>
              </div>
            )}

            <div className="p-3 flex items-center justify-between bg-white dark:bg-[#070717]">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-white/20 dark:bg-white/5 rounded-md hover:brightness-105 transition text-sm">
                  <span className="text-xs md:text-sm">{uploading ? "Subiendo..." : "Seleccionar imagen"}</span>
                  <input type="file" accept="image/*" onChange={(e) => onCoverFileSelected(e)} className="sr-only" />
                </label>

                {cover && cover !== initRef.current.cover && (
                  <button type="button" onClick={() => setCover(initRef.current.cover || null)} className="text-sm text-red-400 hover:text-red-300">
                    Eliminar portada
                  </button>
                )}
              </div>

              <div className="text-xs text-gray-500">{uploading ? "Espere..." : "Max 12MB"}</div>
            </div>
          </div>
        </div>

        {/* Grid: avatar left, inputs right */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Avatar column */}
          <div className="col-span-1 flex flex-col items-center">
            <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-transparent ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0b0b12]">
              <NextImage src={image || "/default-avatar.png"} alt="Avatar" fill style={{ objectFit: "cover" }} />
            </div>

            <div className="mt-4 flex flex-col items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white/20 dark:bg-white/5 rounded-full text-sm hover:brightness-105 transition">
                <input type="file" accept="image/*" onChange={onAvatarFileSelected} className="sr-only" />
                {uploading ? <span className="text-sm text-gray-400">Subiendo...</span> : <span className="text-sm text-indigo-500">Cambiar foto</span>}
              </label>

              {image !== initRef.current.image && (
                <button className="text-sm text-red-400 hover:text-red-300" onClick={() => setImage(initRef.current.image || null)}>
                  Revertir
                </button>
              )}

              {uploadErr && <p className="text-xs text-red-400 mt-1">{uploadErr}</p>}
            </div>
          </div>

          {/* Inputs column */}
          <div className="col-span-2">
            <label className="block mb-4">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nombre</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#06060b] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </label>

            <label className="block mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Biografía</span>
                <span className="text-xs text-gray-400">{bio.length}/{bioMax}</span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, bioMax))}
                rows={4}
                placeholder="Cuéntale al mundo quién eres (máx. 160 caracteres)"
                className="w-full p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#06060b] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </label>

            <label className="block mb-6">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 block">Ubicación</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ciudad, país"
                className="w-full p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#06060b] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </label>

            <div className="flex gap-3 items-center">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white py-3 rounded-lg font-semibold hover:brightness-105 transition disabled:opacity-60"
              >
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>

              <button type="button" onClick={handleCancel} className="px-4 py-3 rounded-lg bg-white/20 dark:bg-white/5 hover:bg-white/30 transition">
                Cancelar
              </button>
            </div>

            {statusMsg && <div className={`mt-4 text-sm ${statusMsg.type === "success" ? "text-green-500" : "text-red-400"}`}>{statusMsg.text}</div>}
          </div>
        </div>
      </div>

      {/* Crop modal */}
      {showCropModal && rawFileUrl && cropMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => {
              setShowCropModal(false);
              setRawFileUrl((u) => {
                if (u) URL.revokeObjectURL(u);
                return null;
              });
              setCropMode(null);
              setZoom(1);
              setCrop({ x: 0, y: 0 });
            }}
          />

          <div className="relative bg-white dark:bg-[#0b0b12] rounded-2xl shadow-2xl w-full max-w-3xl p-4 md:p-6 transform transition duration-200 ease-out">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Recortar {cropMode === "avatar" ? "avatar" : "portada"}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-300"
                  onClick={() => {
                    setShowCropModal(false);
                    setRawFileUrl((u) => {
                      if (u) URL.revokeObjectURL(u);
                      return null;
                    });
                    setCropMode(null);
                    setZoom(1);
                    setCrop({ x: 0, y: 0 });
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm"
                  onClick={applyCropAndUpload}
                  disabled={cropUploading}
                >
                  {cropUploading ? "Subiendo..." : "Usar imagen"}
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative w-full md:flex-1" style={{ height: 360 }}>
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden">
                  <Cropper
                    image={rawFileUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={cropMode === "avatar" ? 1 / 1 : 16 / 9}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
              </div>

              <div className="md:w-64 flex flex-col gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Zoom</label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-[#0b0b14] rounded-md p-3 text-sm text-gray-700 dark:text-gray-200">
                  <p className="font-medium mb-1">Preview</p>
                  <div className="w-24 h-24 rounded-full overflow-hidden border mx-auto">
                    {rawFileUrl && <img src={rawFileUrl} alt="preview" className="w-full h-full object-cover" />}
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  Ajusta la posición y el zoom para recortar tu {cropMode === "avatar" ? "avatar" : "portada"}. Luego haz click en <strong>Usar imagen</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
