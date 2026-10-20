// message.controller.js
const mongoose = require("mongoose");
const Message = require("../models/message.model");
const User = require("../models/user.model");
const aiService = require("../services/ai.service.js");

/**
 * 2026 WhatsApp Post Office Method (Store-and-Forward + Browser Storage)
 * - If Receiver is ONLINE: Passes straight through socket.io (0 MongoDB DB writes, 0 cost).
 * - If Receiver is OFFLINE: Temporarily held in MongoDB queue (delivered: false) with 14-day TTL auto-purge.
 * - As soon as Receiver arrives: Handed over, then immediately deleted from MongoDB (0 MB storage leak).
 */
exports.sendMessage = async (req, res) => {
  try {
    const { text, clientMsgId } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Message text is required" });
    }

    // Check if receiver is online via active socket in memory map
    const receiverSocketId = global.io?.userSocketMap?.[receiverId];

    if (receiverSocketId) {
      // 1. WhatsApp Post Office: Recipient is ONLINE!
      // Generate clean message object with a valid MongoDB ObjectId
      const ephemeralMessage = {
        _id: new mongoose.Types.ObjectId(),
        clientMsgId: clientMsgId || undefined,
        sender: senderId,
        receiver: receiverId,
        text: text.trim(),
        seen: false,
        delivered: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Stream straight to receiver screen over live socket — Zero DB storage!
      global.io.to(receiverSocketId).emit("newMessage", ephemeralMessage);

      // Return to sender so sender commits to local browser IndexedDB
      return res.status(201).json(ephemeralMessage);
    } else {
      // 2. WhatsApp Post Office: Recipient is OFFLINE!
      // Temporarily hold message in MongoDB queue until recipient connects
      const offlineMessage = await Message.create({
        sender: senderId,
        receiver: receiverId,
        text: text.trim(),
        delivered: false,
        expireAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day TTL auto-purge
      });

      return res.status(201).json(offlineMessage);
    }
  } catch (error) {
    console.error("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Fetch pending undelivered messages from server post office.
 * Once collected by recipient, immediately purged from MongoDB.
 */
exports.getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const currentUserId = req.user._id;

    // In Store-and-Forward: find any pending offline messages waiting for this user from sender
    const pendingMessages = await Message.find({
      sender: userToChatId,
      receiver: currentUserId,
    }).sort({ createdAt: 1 });

    // Once fetched by receiver, purge them from MongoDB to maintain ₹0 storage!
    if (pendingMessages.length > 0) {
      const idsToDelete = pendingMessages.map((msg) => msg._id);
      await Message.deleteMany({ _id: { $in: idsToDelete } });
      console.log(`[PostOffice] Purged ${idsToDelete.length} delivered messages from MongoDB for ₹0 storage.`);
    }

    res.status(200).json(pendingMessages);
  } catch (error) {
    console.error("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * AI Suggest Replies (Groq Llama 3)
 * Supports client-supplied IndexedDB context (req.body.messages) so AI works seamlessly
 * even when 0 messages are stored in MongoDB!
 */
exports.suggestReplies = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    let recentMessages = req.body?.messages;

    if (!Array.isArray(recentMessages) || recentMessages.length === 0) {
      // Fallback to DB if client did not supply IndexedDB context
      recentMessages = await Message.find({
        $or: [
          { sender: senderId, receiver: userToChatId },
          { sender: userToChatId, receiver: senderId },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(6);
      recentMessages.reverse();
    } else {
      recentMessages = recentMessages.slice(-6);
    }

    const conversationHistory = recentMessages
      .map((msg) => {
        const msgSenderId = (msg.sender?._id || msg.sender)?.toString();
        const role = msgSenderId === senderId.toString() ? "Me" : "Other";
        return `${role}: ${msg.text}`;
      })
      .join("\n");

    if (!conversationHistory.trim()) {
      return res.status(200).json(["Hello!", "How's it going?", "Let's connect!"]);
    }

    const repliesArray = await aiService.generateReplySuggestions(conversationHistory);
    res.status(200).json(repliesArray);
  } catch (err) {
    console.error("Error in suggestReplies controller: ", err.message);
    res.status(500).json({
      error: "Failed to generate AI suggestions",
      details: err.message,
    });
  }
};

/**
 * AI Summarize Chat (Gemini 3 Flash)
 * Supports client-supplied IndexedDB context (req.body.messages) so AI works seamlessly
 * even when 0 messages are stored in MongoDB!
 */
exports.summarizeChat = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    let recentMessages = req.body?.messages;

    if (!Array.isArray(recentMessages) || recentMessages.length === 0) {
      // Fallback to DB if client did not supply IndexedDB context
      recentMessages = await Message.find({
        $or: [
          { sender: senderId, receiver: userToChatId },
          { sender: userToChatId, receiver: senderId },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(15);
      recentMessages.reverse();
    } else {
      recentMessages = recentMessages.slice(-15);
    }

    if (!recentMessages || recentMessages.length === 0) {
      return res.status(200).json({ summary: "No recent messages to summarize." });
    }

    const formattedHistory = recentMessages
      .map((msg) => {
        const msgSenderId = (msg.sender?._id || msg.sender)?.toString();
        const role = msgSenderId === senderId.toString() ? "Me" : "Other";
        return `${role}: ${msg.text}`;
      })
      .join("\n");

    const summary = await aiService.generateChatSummary(formattedHistory);
    res.status(200).json({ summary });
  } catch (err) {
    console.error("Error in summarizeChat controller: ", err.message);
    res.status(500).json({ error: "Failed to generate AI summary", details: err.message });
  }
};

