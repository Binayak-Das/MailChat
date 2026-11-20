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
import Chat from "./models/Chat.js";

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
  maxHttpBufferSize: 5e7, // 50MB allows image and file attachments
  cors: corsOptions,
});

app.set("io", io);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);

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

// Map of userId -> Set(socketId)
const onlineUsers = new Map();

io.on("connection", (socket) => {
  // Setup user session
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

    // Auto-join all existing chats so user gets immediate room notifications
    try {
      const userChats = await Chat.find({ users: { $elemMatch: { $eq: userId } } }).select("_id");
      userChats.forEach((c) => {
        socket.join(c._id.toString());
      });
    } catch (err) {
      console.error("Error auto-joining user chats:", err);
    }

    socket.emit("connected");
    io.emit("online_users", Array.from(onlineUsers.keys()));
    io.emit("user_presence", { userId, status: "online", onlineUsers: Array.from(onlineUsers.keys()) });
  });

  // Join a specific chat room
  socket.on("join_chat", (room) => {
    if (room) {
      socket.join(room.toString());
    }
  });

  // Leave a specific chat room
  socket.on("leave_chat", (room) => {
    if (room) {
      socket.leave(room.toString());
    }
  });

  // Typing indicators
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

  // Real-time new chat dispatching
  socket.on("new_chat", (newChat) => {
    if (!newChat || !newChat.users) return;
    const chatId = (newChat._id || newChat.id)?.toString();
    if (chatId) {
      socket.join(chatId);
    }
    newChat.users.forEach((user) => {
      const uid = (user._id || user.id || user)?.toString();
      if (uid) {
        io.to(uid).emit("new_chat", newChat);
        io.to(uid).emit("chat_activity", {
          chatId,
          chat: newChat,
          message: newChat.latestMessage || null,
        });
      }
    });
  });

  // Real-time message dispatching
  socket.on("new_message", (newMessageReceived) => {
    const chat = newMessageReceived?.chat;
    if (!chat || !chat.users) return;

    const chatId = (chat._id || chat.id || chat).toString();
    const senderId = (newMessageReceived?.sender?._id || newMessageReceived?.sender?.id || newMessageReceived?.sender)?.toString();

    // Broadcast to chat room
    socket.to(chatId).emit("message_received", newMessageReceived);

    // Also broadcast directly to every member room (ensures group members always receive message & sound alerts)
    chat.users.forEach((user) => {
      if (!user) return;
      const uid = (user._id || user.id || user)?.toString();
      if (uid && uid !== senderId) {
        io.to(uid).emit("message_received", newMessageReceived);

        const lightweightMessage = {
          ...newMessageReceived,
          attachments: newMessageReceived.attachments?.map((a) => ({
            name: a.name,
            size: a.size,
            type: a.type
          })) || []
        };
        io.to(uid).emit("chat_activity", {
          chatId,
          chat: typeof chat === "object" ? chat : null,
          message: lightweightMessage,
        });
      }
    });
  });

  // Real-time reaction dispatching
  socket.on("message_reaction", ({ chatId, message }) => {
    if (chatId) {
      socket.to(chatId.toString()).emit("reaction_updated", message);
    }
  });

  // Real-time group updates (created, renamed, members added/removed)
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

  // Disconnect handling
  socket.on("disconnect", () => {
    if (socket.userId && onlineUsers.has(socket.userId)) {
      const userSockets = onlineUsers.get(socket.userId);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(socket.userId);
      }
      io.emit("online_users", Array.from(onlineUsers.keys()));
      io.emit("user_presence", { userId: socket.userId, status: "offline", onlineUsers: Array.from(onlineUsers.keys()) });
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
