// ✅ /pages/api/register.ts
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import fs from "fs";
import { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false, // necesario para formidable
  },
};

// 🔹 Configurar Cloudinary con tus variables .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// 🔹 Función helper para parsear formularios multipart/form-data
const parseForm = (
  req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const { fields, files } = await parseForm(req);

    const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
    const rawUsername = Array.isArray(fields.username) ? fields.username[0] : fields.username;
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
    const password = Array.isArray(fields.password) ? fields.password[0] : fields.password;

    if (!name || !rawUsername || !email || !password) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    const username = rawUsername.trim().toLowerCase();

    if (username.length < 3) {
      return res.status(400).json({ message: "El nombre de usuario es demasiado corto" });
    }

    // 🔹 Evita duplicados exactos
    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({ message: "El nombre de usuario ya está en uso" });
    }

    // 🔹 Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    let imageUrl = "/default-avatar.png";

    // 🔹 Subir imagen si existe
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    if (imageFile && fs.existsSync(imageFile.filepath)) {
      const upload = await cloudinary.uploader.upload(imageFile.filepath, {
        folder: "nubo/users",
      });
      imageUrl = upload.secure_url;
    }

    // 🔹 Crear usuario en base de datos
    await prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        image: imageUrl,
      },
    });

    return res.status(200).json({ message: "Usuario creado correctamente" });
  } catch (error) {
    console.error("❌ Error en /api/register:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}
