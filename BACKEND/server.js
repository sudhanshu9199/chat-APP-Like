// server.js
require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");
const http = require("http");
const { Server } = require("socket.io");
const User = require('./src/models/user.model');
const Message = require('./src/models/message.model');
const { registerPartyHandlers } = require('./src/services/socket.service');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
global.io = io;

io.userSocketMap = {};

io.on("connection", async (socket) => {
  console.log("A user connected:", socket.id);

  // Register 2026 ConnectX Party Live Co-Experience Room Handlers
  registerPartyHandlers(io, socket);

  const userId = socket.handshake.query.userId;

  if (userId && userId !== "undefined") {
    io.userSocketMap[userId] = socket.id;

    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });

      // ─── WHATSAPP POST OFFICE: DELIVER QUEUED OFFLINE MESSAGES ───
      const pendingMessages = await Message.find({
        receiver: userId,
      }).sort({ createdAt: 1 });

      if (pendingMessages.length > 0) {
        console.log(`[PostOffice] Delivering ${pendingMessages.length} pending queued messages to user ${userId}`);
        socket.emit("sync:pending", pendingMessages);
      }
    } catch (err) {
      console.error("Error setting user online or syncing messages:", err);
    }
  }

  // ─── TWO-PHASE ACKNOWLEDGEMENT & ZERO-COST PURGE HANDLERS ───
  // Client confirms pending messages committed to local IndexedDB -> Purge from MongoDB
  socket.on("sync:ack", async ({ messageIds }) => {
    if (Array.isArray(messageIds) && messageIds.length > 0) {
      try {
        const deleteRes = await Message.deleteMany({
          _id: { $in: messageIds },
          receiver: userId,
        });
        console.log(`[PostOffice] Purged ${deleteRes.deletedCount} delivered messages from MongoDB for ₹0 storage.`);
      } catch (err) {
        console.error("[PostOffice] Error purging acknowledged messages:", err);
      }
    }
  });

  // Client confirms real-time message received & stored locally -> Notify sender of delivery
  socket.on("msg:ack", ({ messageId, senderId }) => {
    const senderSocketId = io.userSocketMap[senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("msg:delivered", { messageId });
    }
  });

  io.emit("getOnlineUsers", Object.keys(io.userSocketMap));

  socket.on('callUser', ({ userToCall, signalData, from, name, callType }) => {
    const socketId = io.userSocketMap[userToCall];
    if (socketId) {
      io.to(socketId).emit('incomingCall', { signal: signalData, from, name, callType });
    }
  });

  socket.on('answerCall', data => {
    const socketId = io.userSocketMap[data.to];
    if (socketId) {
      io.to(socketId).emit('callAccepted', data.signal);
    }
  });

  socket.on('sendIceCandidate', ({ to, candidate }) => {
    const socketId = io.userSocketMap[to];
    if (socketId) {
      io.to(socketId).emit('receiveIceCandidate', candidate);
    }
  });

  socket.on('endCall', ({ to }) => {
    const socketId = io.userSocketMap[to];
    if (socketId) {
      io.to(socketId).emit('callEnded');
    }
  })

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);
    if (userId && io.userSocketMap[userId] === socket.id) {
      delete io.userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(io.userSocketMap));

      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date()
        });
      } catch (err) {
        console.error("Error setting user offline:", err);
      }
    }
  });
});


connectDB()
  .then(() => {
    server.listen(process.env.PORT || 3000, () => {
      console.log(`⚙️  Server is running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => {
    console.error("MONGO db connection failed !!! ", err);
  });
