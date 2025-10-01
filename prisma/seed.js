// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DB...');

  // limpia tablas por si acaso (en dev)
  await prisma.notification.deleteMany().catch(() => {});
  await prisma.like.deleteMany().catch(() => {});
  await prisma.comment.deleteMany().catch(() => {});
  await prisma.post.deleteMany().catch(() => {});
  await prisma.followEvent.deleteMany().catch(() => {});
  await prisma.userLike.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});

  // Usuarios de prueba
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Dev',
      email: 'alice@example.com',
      password: 'password', // en dev está bien — en prod hashea
      username: 'alice',
      image: null,
      coverImage: null,
      bio: 'Soy Alice, me encanta el código',
      location: 'Madrid',
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Tester',
      email: 'bob@example.com',
      password: 'password',
      username: 'bob',
      bio: 'Tester profesional',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      name: 'Charlie',
      email: 'charlie@example.com',
      password: 'password',
      username: 'charlie',
    },
  });

  // Un post de Alice
  const post = await prisma.post.create({
    data: {
      content: '¡Hola mundo! Este es mi primer post de prueba. #dev #hola',
      authorId: alice.id,
      hashtags: ['dev', 'hola'],
      mentions: [],
    },
  });

  // Comentario de Bob en el post de Alice
  const comment = await prisma.comment.create({
    data: {
      content: 'Buen post, Alice! 👏',
      postId: post.id,
      authorId: bob.id,
    },
  });

  // Like de Bob al post de Alice
  await prisma.like.create({
    data: {
      postId: post.id,
      userId: bob.id,
    },
  });

  // Follow event: Bob sigue a Alice
  await prisma.followEvent.create({
    data: {
      userId: alice.id,
      actorId: bob.id,
      type: 'FOLLOW',
    },
  });

  // Opcional: perfil like (user_likes) — Bob "le gusta" perfil de Alice
  await prisma.userLike.create({
    data: {
      userId: alice.id,
      likedById: bob.id,
    },
  });

  // Notificaciones para Alice (ejemplos)
  await prisma.notification.createMany({
    data: [
      {
        userId: alice.id,
        actorId: bob.id,
        type: 'LIKE',
        postId: post.id,
        data: { snippet: post.content.slice(0, 120) },
      },
      {
        userId: alice.id,
        actorId: bob.id,
        type: 'COMMENT',
        postId: post.id,
        commentId: comment.id,
        data: { snippet: comment.content.slice(0, 120) },
      },
      {
        userId: alice.id,
        actorId: bob.id,
        type: 'FOLLOW',
        data: { message: `${bob.name} te ha seguido` },
      },
    ],
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
