// server-socket.js
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { PrismaClient, NotificationType } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware simple de auth: espera token JWT en socket.handshake.auth.token
io.use(async (socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Unauthorized: token missing"));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    socket.userId = payload.sub || payload.userId;
    return next();
  } catch (_err) {
    return next(new Error("Invalid token"));
  }
});

io.on("connection", async (socket) => {
  const userId = socket.userId;
  console.log("Socket connected user:", userId);

  // unirse a rooms de conversaciones del usuario
  try {
    const parts = await prisma.conversationParticipant.findMany({ where: { userId } });
    parts.forEach(p => socket.join(`conversation:${p.conversationId}`));
    socket.join(`user:${userId}`);
  } catch (_err) {
    console.error("Error joining rooms:", err);
  }

  socket.on("send_message", async (payload) => {
    try {
      const { conversationId, content, attachment, replyToId } = payload;

      // verificar que el usuario es participante
      const participant = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId }
      });
      if (!participant) {
        return socket.emit("error", { message: "No eres participante" });
      }

      const message = await prisma.message.create({
        data: { conversationId, senderId: userId, content: content ?? null, attachment: attachment ?? null, replyToId: replyToId ?? null },
        include: { sender: true }
      });

      // emitir el mensaje al room
      io.to(`conversation:${conversationId}`).emit("message", message);

      // actualizar updatedAt
      await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

      // notificaciones para los otros participantes
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId, NOT: { userId } }
      });

      for (const p of participants) {
        const notif = await prisma.notification.create({
          data: {
            userId: p.userId,
            actorId: userId,
            type: NotificationType.MESSAGE,
            data: { conversationId, messageId: message.id, snippet: (message.content || "").slice(0, 200) }
          }
        });
        io.to(`user:${p.userId}`).emit("notification", notif);
      }

    } catch (_err) {
      console.error("send_message error:", err);
      socket.emit("error", { message: "Could not send message" });
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected", userId);
  });
});

const PORT = process.env.SOCKET_PORT || 4000;
server.listen(PORT, () => console.log(`Socket server running on port ${PORT}`));
