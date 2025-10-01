// scripts/check-hashtagfollow.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 1) Intento con to_regclass casteado a text
    const reg = await prisma.$queryRawUnsafe(`SELECT to_regclass('public."HashtagFollow"')::text AS reg;`);
    const regVal = reg && reg[0] ? reg[0].reg : null;
    if (regVal) {
      console.log('to_regclass ->', regVal);
      const cnt = await prisma.$queryRawUnsafe('SELECT count(*)::int AS cnt FROM "HashtagFollow";');
      console.log('HashtagFollow existe. Filas ->', cnt && cnt[0] ? cnt[0].cnt : '(no disponible)');
      return;
    }

    // 2) Fallback: buscar en pg_class (sensible a mayúsculas si se creó con comillas)
    const existsPgClass = await prisma.$queryRawUnsafe(
      `SELECT EXISTS(SELECT 1 FROM pg_class WHERE relname = 'HashtagFollow' AND relkind = 'r') AS found;`
    );
    if (existsPgClass && existsPgClass[0] && existsPgClass[0].found) {
      console.log('pg_class -> tabla "HashtagFollow" encontrada.');
      const cnt = await prisma.$queryRawUnsafe('SELECT count(*)::int AS cnt FROM "HashtagFollow";');
      console.log('HashtagFollow existe. Filas ->', cnt && cnt[0] ? cnt[0].cnt : '(no disponible)');
      return;
    }

    // 3) Último fallback: information_schema (tabla names lowercased if was not quoted)
    const existsInfo = await prisma.$queryRawUnsafe(
      `SELECT EXISTS(
         SELECT 1 FROM information_schema.tables
         WHERE table_schema='public' AND table_name = 'hashtagfollow'
       ) AS found;`
    );
    if (existsInfo && existsInfo[0] && existsInfo[0].found) {
      console.log('info_schema -> tabla "hashtagfollow" (lowercase) encontrada.');
      // intentar contar con double quotes y sin
      try {
        const cnt = await prisma.$queryRawUnsafe('SELECT count(*)::int AS cnt FROM hashtagfollow;');
        console.log('hashtagfollow existe. Filas ->', cnt && cnt[0] ? cnt[0].cnt : '(no disponible)');
      } catch (e) {
        const cnt2 = await prisma.$queryRawUnsafe('SELECT count(*)::int AS cnt FROM "hashtagfollow";');
        console.log('hashtagfollow existe (quoted). Filas ->', cnt2 && cnt2[0] ? cnt2[0].cnt : '(no disponible)');
      }
      return;
    }

    console.log('No se encontró ninguna tabla con nombre HashtagFollow (ni en mayúsculas ni en minúsculas).');
  } catch (e) {
    console.error('Error comprobando HashtagFollow:', e.message || e);
  } finally {
    await prisma.$disconnect();
  }
})();
