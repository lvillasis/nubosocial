import { prisma } from "@/lib/prisma";

async function main() {
  const user = await prisma.user.findFirst();

  if (!user) {
    console.log("⚠️ No hay usuarios en la base de datos.");
    return;
  }

  await prisma.post.create({
    data: {
      content: "¡Hola mundo desde seed.ts! 🌍",
      authorId: user.id,
    },
  });

  console.log("✅ Post de prueba creado con éxito.");
}

main()
  .catch((e) => console.error(e))
  .finally(() => process.exit());
