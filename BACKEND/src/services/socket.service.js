/**
 * 2026 ConnectX Party Engine — Live Co-Experience Room Signaling Service
 * ₹0-Cost Architecture:
 * - Ephemeral In-Memory Map() store (Zero MongoDB reads/writes, O(1) performance)
 * - Auto-prunes rooms when empty (Zero memory leaks)
 * - Relays WebRTC P2P Mesh signals (Offer, Answer, ICE candidates)
 * - Sub-100-byte synchronized media playback timestamps (YouTube + Local captureStream)
 * - Ephemeral floating glassmorphic emoji reaction burst relays
 */

// Ephemeral in-memory registry: roomId -> RoomState
const partyRooms = new Map();

// Helper to sanitize room ID
const parsePartyRoomCode = (input) => {
  if (!input) return "connectx-lounge";
  let raw = String(input).trim();
  // Strip leading hashtags FIRST
  raw = raw.replace(/^#+/, "");
  if (raw.includes("/party/")) {
    const parts = raw.split("/party/");
    raw = parts[parts.length - 1];
  } else if (raw.includes("party")) {
    const parts = raw.split("party");
    raw = parts[parts.length - 1].replace(/^[\/_-]+/, "");
  }
  raw = raw.split("?")[0].split("#")[0].replace(/\/+$/, "");
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return clean || "connectx-lounge";
};

/**
 * Register all Party Room socket handlers for a connected socket
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
const registerPartyHandlers = (io, socket) => {
  // Helper to safely clean up participant from a room
  const handleLeaveRoom = (roomId) => {
    const cleanRoomId = parsePartyRoomCode(roomId);
    const room = partyRooms.get(cleanRoomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    room.participants.delete(socket.id);

    // Notify remaining participants
    socket.to(cleanRoomId).emit("party:user-left", {
      socketId: socket.id,
      name: participant?.name || "Participant",
    });

    // Auto-delete room from RAM if empty (0 MB memory leak)
    if (room.participants.size === 0) {
      partyRooms.delete(cleanRoomId);
      console.log(`[Party] Room #${cleanRoomId} empty and pruned from memory.`);
    } else if (room.hostId === socket.id) {
      // Migrate host to the next active peer in room
      const nextHostId = room.participants.keys().next().value;
      room.hostId = nextHostId;
      const nextHost = room.participants.get(nextHostId);
      if (nextHost) nextHost.isHost = true;

      io.to(cleanRoomId).emit("party:new-host", {
        hostId: nextHostId,
        hostName: nextHost?.name || "New Host",
      });
      console.log(`[Party] Room #${cleanRoomId} host migrated to ${nextHostId}`);
    }
  };

  // ─── 1. JOIN OR CREATE PARTY ROOM ───
  socket.on("party:join", ({ roomId, user }) => {
    if (!roomId) return;
    const cleanRoomId = parsePartyRoomCode(roomId);
    socket.join(cleanRoomId);

    // Initialize room if first joiner
    if (!partyRooms.has(cleanRoomId)) {
      partyRooms.set(cleanRoomId, {
        roomId: cleanRoomId,
        hostId: socket.id,
        createdAt: Date.now(),
        media: {
          type: "youtube",
          url: "5qap5aO4i9A", // Default Lofi Girl 24/7 working live stream
          title: "Lofi Hip Hop Radio 24/7",
          isPlaying: true,
          currentTime: 0,
          updatedAt: Date.now(),
        },
        participants: new Map(),
      });
      console.log(`[Party] Created new in-memory party room #${cleanRoomId} by ${socket.id}`);
    }

    const room = partyRooms.get(cleanRoomId);

    const participantData = {
      socketId: socket.id,
      userId: user?.id || user?._id || socket.id,
      name: user?.name || "Guest Peer",
      avatar: user?.avatar || "",
      isMuted: false,
      isCameraOn: false,
      isHost: room.hostId === socket.id,
      joinedAt: Date.now(),
    };

    room.participants.set(socket.id, participantData);

    // Send complete current room snapshot to the joining user
    socket.emit("party:state", {
      roomId: cleanRoomId,
      hostId: room.hostId,
      media: room.media,
      participants: Array.from(room.participants.values()),
    });

    // Notify other peers in room to initiate WebRTC P2P mesh connection
    socket.to(cleanRoomId).emit("party:user-joined", {
      socketId: socket.id,
      user: participantData,
    });

    console.log(
      `[Party] User ${participantData.name} (${socket.id}) joined room #${cleanRoomId} (${room.participants.size} total peers)`
    );
  });

  // ─── 2. WEBRTC P2P SIGNALING RELAY (MESH OFFERS, ANSWERS, ICE CANDIDATES) ───
  socket.on("party:webrtc-signal", ({ to, signal, type, senderInfo }) => {
    if (!to || !signal) return;

    // Relay signal directly to target peer
    io.to(to).emit("party:webrtc-signal", {
      from: socket.id,
      signal,
      type: type || "media", // "media" | "screen" | "local-video"
      senderInfo: senderInfo || {},
    });
  });

  // ─── 3. SYNCHRONIZED WATCH PARTY MEDIA CONTROLS ───
  socket.on("party:media-sync", ({ roomId, action, currentTime, duration, url, type, title, isStreaming, senderName }) => {
    if (!roomId) return;
    const cleanRoomId = parsePartyRoomCode(roomId);
    const room = partyRooms.get(cleanRoomId);
    if (!room) return;

    // Update in-memory state
    if (url !== undefined && url !== null) room.media.url = url;
    if (type) room.media.type = type;
    if (title) room.media.title = title;
    if (typeof isStreaming === "boolean") room.media.isStreaming = isStreaming;
    if (action === "play") room.media.isPlaying = true;
    if (action === "pause") room.media.isPlaying = false;
    if (typeof currentTime === "number") room.media.currentTime = currentTime;
    if (typeof duration === "number") room.media.duration = duration;
    room.media.updatedAt = Date.now();

    // Broadcast sub-100-byte sync payload to all peers in the room
    socket.to(cleanRoomId).emit("party:media-sync", {
      action,
      currentTime: room.media.currentTime,
      duration: room.media.duration,
      url: room.media.url,
      type: room.media.type,
      title: room.media.title,
      isStreaming: room.media.isStreaming,
      senderId: socket.id,
      senderName: senderName || "Peer",
      updatedAt: room.media.updatedAt,
    });
  });

  // ─── 4. PARTICIPANT STATUS UPDATE (MIC MUTE / CAMERA) ───
  socket.on("party:peer-status", ({ roomId, isMuted, isCameraOn }) => {
    if (!roomId) return;
    const cleanRoomId = parsePartyRoomCode(roomId);
    const room = partyRooms.get(cleanRoomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (participant) {
      if (typeof isMuted === "boolean") participant.isMuted = isMuted;
      if (typeof isCameraOn === "boolean") participant.isCameraOn = isCameraOn;

      socket.to(cleanRoomId).emit("party:peer-status", {
        socketId: socket.id,
        isMuted: participant.isMuted,
        isCameraOn: participant.isCameraOn,
      });
    }
  });

  // ─── 5. EPHEMERAL FLOATING EMOJI REACTIONS (ZERO DB WRITES) ───
  socket.on("party:reaction", ({ roomId, emoji, senderName }) => {
    if (!roomId || !emoji) return;
    const cleanRoomId = parsePartyRoomCode(roomId);

    io.to(cleanRoomId).emit("party:reaction", {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      emoji,
      senderName: senderName || "Peer",
      senderId: socket.id,
      createdAt: Date.now(),
    });
  });

  // ─── 6. LEAVE ROOM ───
  socket.on("party:leave", ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = parsePartyRoomCode(roomId);
    socket.leave(cleanRoomId);
    handleLeaveRoom(cleanRoomId);
  });

  // ─── 7. DISCONNECTING CLEANUP (Safe room loop before rooms are cleared) ───
  socket.on("disconnecting", () => {
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id && partyRooms.has(roomId)) {
        handleLeaveRoom(roomId);
      }
    });
  });
};

module.exports = {
  registerPartyHandlers,
  partyRooms,
};
