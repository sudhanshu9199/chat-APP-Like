// server.js
require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");
const http = require("http");
const { Server } = require("socket.io");
const User = require('./src/models/user.model');

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

  const userId = socket.handshake.query.userId;

  if (userId && userId !== "undefined") {
    io.userSocketMap[userId] = socket.id;

    await User.findByIdAndUpdate(userId, { isOnline: true });
  }

  io.emit("getOnlineUsers", Object.keys(io.userSocketMap));

  socket.on('callUser', ({ userToCall, signalData, from, name}) => {
    const socketId = io.userSocketMap[userToCall];
    if (socketId) {
      io.to(socketId).emit('incomingCall', { signal: signalData, from, name });
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

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date()
      });
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
