// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Guardar instancia en global en dev para evitar múltiples conexiones con HMR
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Registrar middleware de forma defensiva: solo si $use existe y es función
try {
  const maybeUse = (prisma as any)?.$use;
  if (typeof maybeUse === "function") {
    // Middleware seguro que elimina la clave 'existe' en where si el modelo no la tiene
    (prisma as any).$use(async (params: any, next: any) => {
      try {
        if (params?.args && typeof params.args === "object" && params.args.where && params.model) {
          const modelName = params.model;
          const modelMeta = (prisma as any)._dmmf?.modelMap?.[modelName];
          const hasExiste = !!modelMeta?.fields?.some((f: any) => f.name === "existe");

          if (!hasExiste) {
            if (process.env.NODE_ENV === "development") {
              console.log("[prisma.middleware] modelo", modelName, "no tiene 'existe' -> limpiando where");
            }

            const removeExiste = (obj: any) => {
              if (!obj || typeof obj !== "object") return;
              if (Array.isArray(obj)) {
                obj.forEach(removeExiste);
                return;
              }
              if (Object.prototype.hasOwnProperty.call(obj, "existe")) delete obj.existe;
              for (const key of Object.keys(obj)) {
                const val = obj[key];
                if (val && typeof val === "object") removeExiste(val);
              }
            };

            try {
              removeExiste(params.args.where);
            } catch (_err) {
              console.warn("[prisma.middleware] fallo al limpiar where:", err);
            }
          }
        }
      } catch (e) {
        console.warn("[prisma.middleware] error safe-check:", e);
      }
      return next(params);
    });
  } else {
    if (process.env.NODE_ENV === "development") {
      console.warn("[prisma] $use no disponible, middleware omitido.");
    }
  }
} catch (e) {
  console.warn("[prisma] fallo al registrar middleware:", e);
}

export default prisma;
