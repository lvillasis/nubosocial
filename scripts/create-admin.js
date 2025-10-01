// scripts/create-admin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL;
const pass = process.env.ADMIN_PASS;
const name = process.env.ADMIN_NAME || 'Admin';
const username = process.env.ADMIN_USERNAME || (email ? email.split('@')[0] : 'admin');

if (!email || !pass) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASS environment variables.');
  process.exit(1);
}

(async () => {
  try {
    const hashed = await bcrypt.hash(pass, 12);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('Ya existe un usuario con ese email:', existing.id);
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
      console.log('Rol actualizado a ADMIN.');
      process.exit(0);
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashed,
        role: 'ADMIN',
        emailVerified: new Date(),
        isActive: true,
      },
    });

    console.log('Admin creado:', { id: user.id, email: user.email, username: user.username });
  } catch (err) {
    console.error('Error creando admin:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
