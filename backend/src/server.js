import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { seedAdmin } from "./utils/seedAdmin.js";
import authRoutes from "./routes/authRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

const server = http.createServer(app);

const io = new Server(server, {
  pingTimeout: 60000,
  maxHttpBufferSize: 5e7,
  cors: corsOptions,
});

const onlineUsers = new Map();

app.set("io", io);
app.set("onlineUsers", onlineUsers);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "online",
    timestamp: new Date().toISOString(),
    service: "MailChat Backend API",
    database: "MongoDB",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route ${req.originalUrl} not found`,
  });
});

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

io.on("connection", (socket) => {
  socket.on("setup", async (userData) => {
    if (!userData) return;
    const userId = (userData._id || userData.id)?.toString();
    if (!userId) return;

    socket.userId = userId;
    socket.join(userId);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    try {
      const userChats = await Chat.find({
        users: { $elemMatch: { $eq: userId } },
      }).select("_id");
      userChats.forEach((c) => {
        socket.join(c._id.toString());
      });

      const pendingMessages = await Message.find({
        chat: { $in: userChats.map((c) => c._id) },
        sender: { $ne: userId },
        deliveredTo: { $ne: userId },
      }).select("_id sender chat");

      if (pendingMessages.length > 0) {
        const msgIds = pendingMessages.map((m) => m._id);
        await Message.updateMany(
          { _id: { $in: msgIds } },
          { $addToSet: { deliveredTo: userId } },
        );
        pendingMessages.forEach((pm) => {
          io.to(pm.sender.toString()).emit("message_delivered", {
            messageId: pm._id,
            userId,
            chatId: pm.chat,
          });
        });
      }
    } catch (err) {
      console.error("Error setting up user session:", err);
    }

    socket.emit("connected");
    io.emit("online_users", Array.from(onlineUsers.keys()));
    io.emit("user_presence", {
      userId,
      status: "online",
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  });

  socket.on("join_chat", (room) => {
    if (room) {
      socket.join(room.toString());
    }
  });

  socket.on("leave_chat", (room) => {
    if (room) {
      socket.leave(room.toString());
    }
  });

  socket.on("typing", ({ room, user }) => {
    if (room) {
      socket.in(room.toString()).emit("typing", { room, user });
    }
  });

  socket.on("stop_typing", ({ room, user }) => {
    if (room) {
      socket.in(room.toString()).emit("stop_typing", { room, user });
    }
  });

  socket.on("new_chat", (newChat) => {
    if (!newChat || !newChat.users) return;
    const chatId = (newChat._id || newChat.id)?.toString();
    if (chatId) {
      socket.join(chatId);
    }
    newChat.users.forEach((user) => {
      const uid = (user._id || user.id || user)?.toString();
      if (uid) {
        if (chatId) {
          io.in(uid).socketsJoin(chatId);
        }
        io.to(uid).emit("new_chat", newChat);
        io.to(uid).emit("chat_updated", newChat);
        io.to(uid).emit("chat_activity", {
          chatId,
          chat: newChat,
          message: newChat.latestMessage || null,
        });
      }
    });
  });

  socket.on("new_message", async (newMessageReceived) => {
    const chat = newMessageReceived?.chat;
    if (!chat || !chat.users) return;

    const chatId = (chat._id || chat.id || chat).toString();
    const senderId = (
      newMessageReceived?.sender?._id ||
      newMessageReceived?.sender?.id ||
      newMessageReceived?.sender
    )?.toString();

    chat.users.forEach((user) => {
      if (!user) return;
      const uid = (user._id || user.id || user)?.toString();
      if (uid) {
        if (chatId) {
          io.in(uid).socketsJoin(chatId);
        }
        if (uid !== senderId) {
          io.to(uid).emit("message_received", newMessageReceived);

          const lightweightMessage = {
            ...newMessageReceived,
            attachments:
              newMessageReceived.attachments?.map((a) => ({
                name: a.name,
                size: a.size,
                type: a.type,
              })) || [],
          };
          io.to(uid).emit("chat_activity", {
            chatId,
            chat: typeof chat === "object" ? chat : null,
            message: lightweightMessage,
          });
        }
      }
    });
    io.to(chatId).emit(
      "chat_updated",
      typeof chat === "object"
        ? { ...chat, latestMessage: newMessageReceived }
        : { _id: chatId, latestMessage: newMessageReceived },
    );
  });

  socket.on(
    "message_delivered_ack",
    async ({ messageId, senderId, chatId }) => {
      if (socket.userId && messageId) {
        try {
          await Message.findByIdAndUpdate(messageId, {
            $addToSet: { deliveredTo: socket.userId },
          });
          if (senderId) {
            io.to(senderId.toString()).emit("message_delivered", {
              messageId,
              userId: socket.userId,
              chatId,
            });
          }
        } catch (err) {
          console.error("Error acknowledging message delivery:", err);
        }
      }
    },
  );

  socket.on("mark_messages_read", async ({ chatId }) => {
    if (!socket.userId || !chatId) return;
    try {
      await Message.updateMany(
        { chat: chatId, readBy: { $ne: socket.userId } },
        {
          $addToSet: {
            readBy: socket.userId,
            deliveredTo: socket.userId,
          },
        },
      );
      io.to(chatId.toString()).emit("messages_read", {
        chatId,
        userId: socket.userId,
      });
    } catch (err) {
      console.error("Error marking messages read in socket:", err);
    }
  });

  socket.on("message_reaction", ({ chatId, message }) => {
    if (chatId) {
      socket.to(chatId.toString()).emit("reaction_updated", message);
    }
  });

  socket.on("message_updated", (message) => {
    const chatId = message?.chat?._id || message?.chat;
    if (chatId) {
      io.to(chatId.toString()).emit("message_updated", message);
    }
  });

  socket.on("message_deleted", ({ messageId, chatId }) => {
    if (chatId) {
      io.to(chatId.toString()).emit("message_deleted", { messageId, chatId });
    }
  });

  socket.on("group_updated", (chat) => {
    if (!chat || !chat.users || !Array.isArray(chat.users)) return;
    const chatId = (chat._id || chat.id)?.toString();
    if (chatId) {
      socket.join(chatId);
    }
    chat.users.forEach((user) => {
      if (!user) return;
      const uid = (user._id || user.id || user)?.toString();
      if (uid) {
        io.to(uid).emit("chat_updated", chat);
        io.to(uid).emit("new_chat", chat);
      }
    });
  });

  socket.on("disconnect", () => {
    if (socket.userId && onlineUsers.has(socket.userId)) {
      const userSockets = onlineUsers.get(socket.userId);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(socket.userId);
      }
      io.emit("online_users", Array.from(onlineUsers.keys()));
      io.emit("user_presence", {
        userId: socket.userId,
        status: "offline",
        onlineUsers: Array.from(onlineUsers.keys()),
      });
    }
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await seedAdmin();
    console.log("✅ Server is LIVE on PORT " + PORT);

    server.listen(PORT);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
