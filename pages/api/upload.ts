// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import formidable, { File } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  api_key: process.env.CLOUDINARY_API_KEY ?? "",
  api_secret: process.env.CLOUDINARY_API_SECRET ?? "",
});

export const config = {
  api: { bodyParser: false },
};

function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autorizado" });

  try {
    const { fields, files } = await parseForm(req);
    const file = Array.isArray(files.file) ? files.file[0] : (files.file as File | undefined);

    if (!file || !file.filepath) {
      return res.status(400).json({ error: "No se recibió el archivo" });
    }

    // Normalizar fields.type: puede ser string | string[] | undefined
    let rawType = fields.type;
    const typeStr = Array.isArray(rawType) ? rawType[0] : rawType;
    let type = (typeStr ?? "avatar").toString();

    // validar valores permitidos
    if (type !== "avatar" && type !== "cover") type = "avatar";

    // subir a cloudinary
    const result = await cloudinary.uploader.upload(file.filepath, {
      folder: "nubo_uploads",
      resource_type: "image",
    });

    // eliminar archivo temporal
    fs.unlink(file.filepath, (err) => {
      if (err) console.warn("No se pudo borrar archivo temporal:", err);
    });

    // actualizar usuario en DB (devuelve user actualizado)
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: type === "avatar" ? { image: result.secure_url } : { coverImage: result.secure_url },
      select: { id: true, name: true, image: true, coverImage: true },
    });

    return res.status(200).json({ success: true, url: result.secure_url, user: updatedUser });
  } catch (err: unknown) {
    console.error("❌ Error en upload:", err);
    return res.status(500).json({ error: "Error al subir imagen" });
  }
}
