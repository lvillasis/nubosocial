// components/EditProfileModal.tsx
import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from "react-easy-crop";
import { X, Camera, Check, Loader2 } from "lucide-react";

type ValuesSent = {
  name: string;
  bio: string;
  location: string;
  image?: string | null;
  coverImage?: string | null;
};

export default function EditProfileModal({
  initialData,
  onClose,
  onSave,
}: {
  initialData: {
    name?: string;
    bio?: string;
    location?: string;
    image?: string | null;
    coverImage?: string | null;
    email?: string;
  };
  onClose: () => void;
  onSave: (values: ValuesSent) => Promise<any>;
}) {
  const [name, setName] = useState(initialData.name || "");
  const [bio, setBio] = useState(initialData.bio || "");
  const [location, setLocation] = useState(initialData.location || "");

  const [previewImage, setPreviewImage] = useState(initialData.image || "/default-avatar.png");
  const [previewCover, setPreviewCover] = useState(initialData.coverImage || "/default-cover.jpg");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cropper
  const [cropMode, setCropMode] = useState<null | "avatar" | "cover">(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<any>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === "avatar") {
      setPreviewImage(url);
      setCropMode("avatar");
    } else {
      setPreviewCover(url);
      setCropMode("cover");
    }
  };

  // función que devuelve canvas recortado con tamaño fijo
  const getCroppedImg = async (imageSrc: string, cropArea: any, type: "avatar" | "cover") => {
    const image: HTMLImageElement = await new Promise((resolve, reject) => {
      const img = new window.Image();
      img.src = imageSrc;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // tamaños fijos
    const targetWidth = type === "avatar" ? 400 : 1500;
    const targetHeight = type === "avatar" ? 400 : 500;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(
      image,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], `${type}.jpg`, { type: "image/jpeg" }));
        }
      }, "image/jpeg");
    });
  };

  const applyCrop = async () => {
    if (!cropMode) return;

    const croppedFile = await getCroppedImg(
      cropMode === "avatar" ? previewImage : previewCover,
      croppedArea,
      cropMode
    );

    if (croppedFile) {
      const formData = new FormData();
      formData.append("file", croppedFile);
      formData.append("type", cropMode);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.url) {
          if (cropMode === "avatar") {
            setPreviewImage(data.url);
          } else {
            setPreviewCover(data.url);
          }
        }
      } catch (_err) {
        console.error("Error subiendo imagen:", _err);
      }
    }

    setCropMode(null);
  };

  const handleSave = async () => {
    setErrorMessage(null);
    const values: ValuesSent = {
      name,
      bio,
      location,
      image: previewImage,
      coverImage: previewCover,
    };

    try {
      setSaving(true);
      await onSave(values);
      onClose();
    } catch (err: any) {
      console.error("Error guardando perfil desde modal:", err);
      setErrorMessage(err?.message ?? "Error al guardar. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Editar perfil</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cover + Avatar */}
          <div className="relative">
            <Image
              src={previewCover}
              alt="cover"
              width={800}
              height={300}
              className="w-full h-40 object-cover"
            />
            <label className="absolute top-2 left-2 bg-black/60 p-2 rounded-full cursor-pointer hover:bg-black/80">
              <Camera size={16} />
              <input
                className="hidden"
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e, "cover")}
              />
            </label>

            <div className="absolute -bottom-12 left-4">
              <div className="relative w-24 h-24">
                <Image
                  src={previewImage}
                  alt="avatar"
                  width={100}
                  height={100}
                  className="rounded-full border-4 border-white object-cover"
                />
                <label className="absolute bottom-0 right-0 bg-black/60 p-1 rounded-full cursor-pointer hover:bg-black/80">
                  <Camera size={14} />
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e, "avatar")}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="mt-14 px-4 pb-6 space-y-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={160}
                placeholder="Biografía"
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="text-xs text-gray-500 text-right">{bio.length}/160</p>
            </div>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer"
            >
              <option value="">Selecciona tu ubicación</option>
              <option value="México">México</option>
              <option value="Peru">Perú</option>
              <option value="Argentina">Argentina</option>
              <option value="Colombia">Colombia</option>
              <option value="Chile">Chile</option>
            </select>

            {errorMessage && <div className="text-red-500 text-sm">{errorMessage}</div>}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Cropper modal */}
      {cropMode && (
        <motion.div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Recortar {cropMode === "avatar" ? "avatar" : "portada"}
            </h3>
            <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-800">
              <Cropper
                image={cropMode === "avatar" ? previewImage : previewCover}
                crop={crop}
                zoom={zoom}
                aspect={cropMode === "avatar" ? 1 / 1 : 3 / 1}
                cropShape={cropMode === "avatar" ? "round" : "rect"}
                objectFit="contain"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, cropped) => setCroppedArea(cropped)}
              />
            </div>
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setCropMode(null)}
                className="px-4 py-2 rounded-lg border dark:border-gray-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={applyCrop}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 cursor-pointer"
              >
                <Check size={16} /> Aplicar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
