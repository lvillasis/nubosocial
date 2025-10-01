// scripts/seed-user.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordPlain = 'PasswordSegura123!'; // cámbiala por la que quieras
  const hashed = await bcrypt.hash(passwordPlain, 10);

  const user = await prisma.user.create({
    data: {
      name: 'Usuario Prueba',
      username: 'usuarioprueba',
      email: 'prueba@nubo.test',
      password: hashed,
      role: 'USER',
      image: null,
      coverImage: null,
      bio: 'Cuenta creada por seed',
      location: null,
      isActive: true,
    },
  });

  console.log('Usuario creado:', user.id, user.email);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
