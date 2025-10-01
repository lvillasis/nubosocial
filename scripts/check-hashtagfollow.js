// scripts/check-hashtagfollow.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Comprueba existencia usando to_regclass (null si no existe)
    const reg = await prisma.$queryRawUnsafe(`SELECT to_regclass('public."HashtagFollow"') AS reg;`);
    if (!reg || !reg[0] || !reg[0].reg) {
      console.log('HashtagFollow NO existe (to_regclass returned null).');
      return;
    }

    // Si existe, obtener conteo
    const cnt = await prisma.$queryRawUnsafe('SELECT count(*)::int AS cnt FROM "HashtagFollow";');
    console.log('HashtagFollow existe. Filas ->', cnt && cnt[0] ? cnt[0].cnt : '(no disponible)');
  } catch (e) {
    console.error('Error comprobando HashtagFollow:', e.message || e);
  } finally {
    await prisma.$disconnect();
  }
})();
