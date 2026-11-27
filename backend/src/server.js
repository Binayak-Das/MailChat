import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";
import Meeting from "./models/Meeting.js";
import { updateUser } from "./utils/userStore.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "https://mail-chat.onrender.com",
  "https://mailchat.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const parsed = new URL(origin);
    if (
      parsed.hostname === "mail-chat.onrender.com" ||
      parsed.hostname === "mailchat.onrender.com" ||
      parsed.hostname.endsWith(".onrender.com") ||
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1"
    ) {
      return true;
    }
  } catch {}
  return true;
};

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, isOriginAllowed(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

const server = http.createServer(app);

const io = new Server(server, {
  pingInterval: 10000,
  pingTimeout: 15000,
  maxHttpBufferSize: 5e7,
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Map();
const activeMeetings = new Map();

app.set("io", io);
app.set("onlineUsers", onlineUsers);
app.set("activeMeetings", activeMeetings);

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
app.use("/api/meetings", meetingRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "online",
    timestamp: new Date().toISOString(),
    service: "MailChat Backend API",
    database: "MongoDB",
    onlineUsersCount: onlineUsers.size,
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

const pruneDeadSockets = () => {
  let changed = false;
  for (const [userId, socketSet] of onlineUsers.entries()) {
    for (const socketId of Array.from(socketSet)) {
      const activeSocket = io.sockets.sockets.get(socketId);
      if (!activeSocket || !activeSocket.connected) {
        socketSet.delete(socketId);
      }
    }
    if (socketSet.size === 0) {
      onlineUsers.delete(userId);
      const now = new Date();
      updateUser(userId, { isOnline: false, lastSeen: now.toISOString() }).catch(() => {});
      io.emit("user_presence", {
        userId,
        status: "offline",
        lastSeen: now,
        onlineUsers: Array.from(onlineUsers.keys()),
      });
      changed = true;
    }
  }
  if (changed) {
    io.emit("online_users", Array.from(onlineUsers.keys()));
  }
};

setInterval(pruneDeadSockets, 15000);

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

    const now = new Date();
    updateUser(userId, { isOnline: true, lastSeen: now.toISOString() }).catch(() => {});

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
      lastSeen: now,
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  });

  socket.on("get_online_users", () => {
    pruneDeadSockets();
    socket.emit("online_users", Array.from(onlineUsers.keys()));
  });

  socket.on("heartbeat", ({ userId } = {}) => {
    const uid = userId || socket.userId;
    if (uid) {
      if (!onlineUsers.has(uid)) {
        onlineUsers.set(uid, new Set());
      }
      onlineUsers.get(uid).add(socket.id);
    }
    socket.emit("heartbeat_ack", { timestamp: Date.now() });
  });

  socket.on("user_logout", async (data) => {
    const uid = (data?.userId || socket.userId)?.toString();
    if (uid && onlineUsers.has(uid)) {
      onlineUsers.delete(uid);
      const now = new Date();
      updateUser(uid, { isOnline: false, lastSeen: now.toISOString() }).catch(() => {});
      io.emit("online_users", Array.from(onlineUsers.keys()));
      io.emit("user_presence", {
        userId: uid,
        status: "offline",
        lastSeen: now,
        onlineUsers: Array.from(onlineUsers.keys()),
      });
    }
  });

  socket.on("user_offline", async (data) => {
    const uid = (data?.userId || socket.userId)?.toString();
    if (uid && onlineUsers.has(uid)) {
      const userSockets = onlineUsers.get(uid);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(uid);
        const now = new Date();
        updateUser(uid, { isOnline: false, lastSeen: now.toISOString() }).catch(() => {});
        io.emit("online_users", Array.from(onlineUsers.keys()));
        io.emit("user_presence", {
          userId: uid,
          status: "offline",
          lastSeen: now,
          onlineUsers: Array.from(onlineUsers.keys()),
        });
      }
    }
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

  // ==========================================
  // GOOGLE MEET / WEBRTC SIGNALING EVENTS
  // ==========================================
  const getOrCreateLiveRoom = (code) => {
    if (!activeMeetings.has(code)) {
      activeMeetings.set(code, {
        participants: new Map(),
        waitingRoom: new Map(),
      });
    }
    return activeMeetings.get(code);
  };

  const leaveMeetingRoom = (code, targetSocket) => {
    if (!code) return;
    const room = activeMeetings.get(code);
    if (!room) return;

    if (room.waitingRoom.has(targetSocket.id)) {
      room.waitingRoom.delete(targetSocket.id);
      io.to(`meet:${code}`).emit("meet:waiting-room-updated", {
        waitingList: Array.from(room.waitingRoom.values()),
      });
    }

    if (room.participants.has(targetSocket.id)) {
      const removed = room.participants.get(targetSocket.id);
      room.participants.delete(targetSocket.id);
      targetSocket.leave(`meet:${code}`);
      io.to(`meet:${code}`).emit("meet:user-left", {
        socketId: targetSocket.id,
        userId: removed.userId,
        name: removed.name,
      });
    }

    if (room.participants.size === 0 && room.waitingRoom.size === 0) {
      activeMeetings.delete(code);
    }
  };

  socket.on("meet:join-room", async ({ meetingCode, user, mediaState }) => {
    const code = (meetingCode || "").trim().toLowerCase();
    if (!code || !user) return;

    try {
      const meeting = await Meeting.findOne({ meetingCode: code });
      if (!meeting) {
        socket.emit("meet:join-error", { message: "Meeting not found." });
        return;
      }
      if (meeting.status === "ended") {
        socket.emit("meet:join-error", { message: "This meeting has already ended." });
        return;
      }

      const userId = (user._id || user.id || socket.userId)?.toString();
      const isHost = meeting.hostId === userId;

      if (meeting.isLocked && !isHost) {
        socket.emit("meet:join-error", { message: "This meeting is locked by the host." });
        return;
      }

      const room = getOrCreateLiveRoom(code);
      const participantInfo = {
        socketId: socket.id,
        userId,
        name: user.name || "Participant",
        email: user.email || "",
        avatar: user.avatar || "",
        role: isHost ? "host" : "participant",
        audio: mediaState?.audio ?? true,
        video: mediaState?.video ?? true,
        isScreenSharing: Boolean(mediaState?.isScreenSharing),
        handRaised: Boolean(mediaState?.handRaised),
        joinedAt: new Date().toISOString(),
      };

      socket.currentMeetCode = code;

      if (meeting.waitingRoomEnabled && !isHost) {
        room.waitingRoom.set(socket.id, participantInfo);
        socket.emit("meet:waiting-admission", {
          meetingCode: code,
          title: meeting.title,
        });
        io.to(`meet:${code}`).emit("meet:waiting-room-updated", {
          waitingList: Array.from(room.waitingRoom.values()),
        });
        return;
      }

      if (meeting.status === "waiting") {
        meeting.status = "active";
        meeting.startedAt = new Date();
      }
      const alreadyRecorded = meeting.participants.some((p) => p.userId === userId);
      if (!alreadyRecorded) {
        meeting.participants.push({
          userId,
          name: participantInfo.name,
          email: participantInfo.email,
          avatar: participantInfo.avatar,
          role: participantInfo.role,
          joinedAt: new Date(),
        });
      }
      await meeting.save();

      const existingParticipants = Array.from(room.participants.values());
      room.participants.set(socket.id, participantInfo);
      socket.join(`meet:${code}`);

      socket.emit("meet:joined", {
        meeting: {
          meetingCode: meeting.meetingCode,
          title: meeting.title,
          hostId: meeting.hostId,
          hostName: meeting.hostName,
          isLocked: meeting.isLocked,
          waitingRoomEnabled: meeting.waitingRoomEnabled,
          allowScreenShare: meeting.allowScreenShare,
          allowChat: meeting.allowChat,
          chatMessages: meeting.chatMessages || [],
          polls: meeting.polls || [],
        },
        self: participantInfo,
        participants: existingParticipants,
        waitingList: Array.from(room.waitingRoom.values()),
      });

      socket.to(`meet:${code}`).emit("meet:user-joined", {
        participant: participantInfo,
      });
    } catch (err) {
      console.error("Error joining meet room:", err);
      socket.emit("meet:join-error", { message: "Failed to join meeting." });
    }
  });

  socket.on("meet:admit-user", async ({ meetingCode, targetSocketId }) => {
    const code = (meetingCode || "").trim().toLowerCase();
    const room = activeMeetings.get(code);
    if (!room) return;
    const waitingUser = room.waitingRoom.get(targetSocketId);
    if (!waitingUser) return;

    const meeting = await Meeting.findOne({ meetingCode: code });
    if (!meeting || meeting.hostId !== socket.userId?.toString()) return;

    room.waitingRoom.delete(targetSocketId);
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      io.to(`meet:${code}`).emit("meet:waiting-room-updated", {
        waitingList: Array.from(room.waitingRoom.values()),
      });
      return;
    }

    const existingParticipants = Array.from(room.participants.values());
    room.participants.set(targetSocketId, waitingUser);
    targetSocket.join(`meet:${code}`);

    targetSocket.emit("meet:joined", {
      meeting: {
        meetingCode: meeting.meetingCode,
        title: meeting.title,
        hostId: meeting.hostId,
        hostName: meeting.hostName,
        isLocked: meeting.isLocked,
        waitingRoomEnabled: meeting.waitingRoomEnabled,
        allowScreenShare: meeting.allowScreenShare,
        allowChat: meeting.allowChat,
        chatMessages: meeting.chatMessages || [],
        polls: meeting.polls || [],
      },
      self: waitingUser,
      participants: existingParticipants,
      waitingList: [],
    });

    targetSocket.to(`meet:${code}`).emit("meet:user-joined", {
      participant: waitingUser,
    });
    io.to(`meet:${code}`).emit("meet:waiting-room-updated", {
      waitingList: Array.from(room.waitingRoom.values()),
    });
  });

  socket.on("meet:deny-user", async ({ meetingCode, targetSocketId }) => {
    const code = (meetingCode || "").trim().toLowerCase();
    const room = activeMeetings.get(code);
    if (!room) return;
    const meeting = await Meeting.findOne({ meetingCode: code });
    if (!meeting || meeting.hostId !== socket.userId?.toString()) return;

    room.waitingRoom.delete(targetSocketId);
    io.to(targetSocketId).emit("meet:join-denied", {
      message: "The host declined your request to join.",
    });
    io.to(`meet:${code}`).emit("meet:waiting-room-updated", {
      waitingList: Array.from(room.waitingRoom.values()),
    });
  });

  socket.on("meet:signal", ({ toSocketId, signal, type }) => {
    if (!toSocketId || !signal) return;
    io.to(toSocketId).emit("meet:signal", {
      fromSocketId: socket.id,
      signal,
      type,
    });
  });

  socket.on("meet:media-state", ({ meetingCode, audio, video, isScreenSharing, handRaised }) => {
    const code = (meetingCode || "").trim().toLowerCase();
    const room = activeMeetings.get(code);
    if (!room) return;
    const p = room.participants.get(socket.id);
    if (!p) return;

    if (typeof audio === "boolean") p.audio = audio;
    if (typeof video === "boolean") p.video = video;
    if (typeof isScreenSharing === "boolean") p.isScreenSharing = isScreenSharing;
    if (typeof handRaised === "boolean") p.handRaised = handRaised;

    socket.to(`meet:${code}`).emit("meet:media-state", {
      socketId: socket.id,
      userId: p.userId,
      audio: p.audio,
      video: p.video,
      isScreenSharing: p.isScreenSharing,
      handRaised: p.handRaised,
    });
  });

  socket.on("meet:reaction", ({ meetingCode, emoji, userName, userId }) => {
    const code = (meetingCode || "").trim().toLowerCase();
    if (!code || !emoji) return;
    io.to(`meet:${code}`).emit("meet:reaction", {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      socketId: socket.id,
      userId: userId || socket.userId,
      userName: userName || "Participant",
      emoji,
    });
  });

  socket.on("meet:chat-message", async ({ meetingCode, content, senderName, senderId }) => {
    const code = (meetingCode || "").trim().toLowerCase();
    if (!code || !content?.trim()) return;
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: (senderId || socket.userId || "").toString(),
      senderName: senderName || "Participant",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };
    io.to(`meet:${code}`).emit("meet:chat-message", msg);
    try {
      await Meeting.updateOne(
        { meetingCode: code },
        { $push: { chatMessages: msg } }
      );
    } catch {}
  });

  socket.on("meet:poll-create", async ({ meetingCode, question, options, createdBy, createdByName }) => {
    const code = (meetingCode || "").trim().toLowerCase();
    if (!code || !question?.trim() || !Array.isArray(options) || options.length < 2) return;
    const poll = {
      id: `poll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      question: question.trim(),
      options: options.map((opt, i) => ({
        id: `opt-${i}-${Date.now()}`,
        text: String(opt).trim(),
        votes: [],
      })),
      createdBy: (createdBy || socket.userId || "").toString(),
      createdByName: createdByName || "Host",
      isClosed: false,
      createdAt: new Date().toISOString(),
    };
    try {
      const updated = await Meeting.findOneAndUpdate(
        { meetingCode: code },
        { $push: { polls: poll } },
        { new: true }
      );
      io.to(`meet:${code}`).emit("meet:polls-updated", {
        polls: updated?.polls || [poll],
      });
    } catch {}
  });

  socket.on("meet:poll-vote", async ({ meetingCode, pollId, optionId, userId }) => {
    const code = (meetingCode || "").trim().toLowerCase();
    const uid = (userId || socket.userId || "").toString();
    if (!code || !pollId || !optionId || !uid) return;
    try {
      const meeting = await Meeting.findOne({ meetingCode: code });
      if (!meeting) return;
      const poll = meeting.polls.find((p) => p.id === pollId);
      if (!poll || poll.isClosed) return;
      poll.options.forEach((opt) => {
        opt.votes = opt.votes.filter((v) => v !== uid);
        if (opt.id === optionId) {
          opt.votes.push(uid);
        }
      });
      await meeting.save();
      io.to(`meet:${code}`).emit("meet:polls-updated", { polls: meeting.polls });
    } catch {}
  });

  socket.on("meet:poll-close", async ({ meetingCode, pollId }) => {
    const code = (meetingCode || "").trim().toLowerCase();
    if (!code || !pollId) return;
    try {
      const meeting = await Meeting.findOne({ meetingCode: code });
      if (!meeting) return;
      const poll = meeting.polls.find((p) => p.id === pollId);
      if (!poll) return;
      poll.isClosed = true;
      await meeting.save();
      io.to(`meet:${code}`).emit("meet:polls-updated", { polls: meeting.polls });
    } catch {}
  });

  socket.on("meet:host-action", async ({ meetingCode, action, targetSocketId }) => {
    const code = (meetingCode || "").trim().toLowerCase();
    const room = activeMeetings.get(code);
    if (!room) return;
    const meeting = await Meeting.findOne({ meetingCode: code });
    if (!meeting || meeting.hostId !== socket.userId?.toString()) return;

    if (action === "mute-all") {
      room.participants.forEach((p, sid) => {
        if (sid !== socket.id) p.audio = false;
      });
      socket.to(`meet:${code}`).emit("meet:force-mute", { by: meeting.hostName });
    } else if (action === "mute-user" && targetSocketId) {
      const p = room.participants.get(targetSocketId);
      if (p) p.audio = false;
      io.to(targetSocketId).emit("meet:force-mute", { by: meeting.hostName });
      io.to(`meet:${code}`).emit("meet:media-state", {
        socketId: targetSocketId,
        audio: false,
      });
    } else if (action === "remove-user" && targetSocketId) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      io.to(targetSocketId).emit("meet:removed", {
        message: "You were removed from the meeting by the host.",
      });
      if (targetSocket) {
        leaveMeetingRoom(code, targetSocket);
        targetSocket.currentMeetCode = null;
      }
    } else if (action === "end-for-all") {
      meeting.status = "ended";
      meeting.endedAt = new Date();
      await meeting.save();
      io.to(`meet:${code}`).emit("meet:ended", {
        meetingCode: code,
        endedBy: meeting.hostName,
      });
      activeMeetings.delete(code);
    }
  });

  socket.on("meet:leave-room", ({ meetingCode }) => {
    const code = (meetingCode || socket.currentMeetCode || "").trim().toLowerCase();
    leaveMeetingRoom(code, socket);
    socket.currentMeetCode = null;
  });

  socket.on("disconnect", async () => {
    if (socket.currentMeetCode) {
      leaveMeetingRoom(socket.currentMeetCode, socket);
      socket.currentMeetCode = null;
    }
    if (socket.userId && onlineUsers.has(socket.userId)) {
      const userSockets = onlineUsers.get(socket.userId);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(socket.userId);
        const now = new Date();
        updateUser(socket.userId, {
          isOnline: false,
          lastSeen: now.toISOString(),
        }).catch(() => {});
        io.emit("online_users", Array.from(onlineUsers.keys()));
        io.emit("user_presence", {
          userId: socket.userId,
          status: "offline",
          lastSeen: now,
          onlineUsers: Array.from(onlineUsers.keys()),
        });
      }
    }
  });
});

const startKeepAlive = () => {
  const serviceUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.SERVER_URL ||
    "https://mailchat-server.onrender.com";
  if (!serviceUrl) return;

  const pingUrl = `${serviceUrl.replace(/\/$/, "")}/api/health`;
  const PING_INTERVAL_MS = 12 * 60 * 1000;

  setInterval(async () => {
    try {
      await fetch(pingUrl);
    } catch {}
  }, PING_INTERVAL_MS);
};

const startServer = async () => {
  try {
    await connectDB();

    // Ensure no users collection remains in MongoDB (users live in Firebase)
    await mongoose.connection.db.collection("users").drop().catch(() => {});
    onlineUsers.clear();

    server.listen(PORT, () => {
      console.log("✅ Server is LIVE on PORT " + PORT);
      startKeepAlive();
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
