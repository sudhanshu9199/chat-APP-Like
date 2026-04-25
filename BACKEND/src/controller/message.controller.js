// message.controller.js
const Message = require("../models/message.model");
const User = require("../models/user.model");
const aiService = require("../services/ai.service.js");

exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      text,
    });

    // Socket.io Logic
    const receiverSocketId = global.io.userSocketMap?.[receiverId]; // *Accessing map from global if stored there
    if (receiverSocketId) {
      global.io.to(receiverSocketId).emit("newMessage", message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: userToChatId },
        { sender: userToChatId, receiver: senderId },
      ],
    }).sort({ createdAt: 1 }); // Sort by oldest first

    await Message.updateMany(
      { sender: userToChatId, receiver: senderId, seen: false },
      { $set: { seen: true } },
    );

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.suggestReplies = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    const recentMessages = await Message.find({
      $or: [
        { sender: senderId, receiver: userToChatId },
        { sender: userToChatId, receiver: senderId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(6);

    recentMessages.reverse();
    const conversationHistory = recentMessages
      .map((msg) => {
        const role =
          msg.sender.toString() === senderId.toString() ? "Me" : "Other";
        return `${role}: ${msg.text}`;
      })
      .join("\n");

    const repliesArray =
      await aiService.generateReplySuggestions(conversationHistory);
    res.status(200).json(repliesArray);
  } catch (err) {
    console.log("Error in suggestReplies controller: ", err.message);
    res.status(500).json({
      error: "Failed to generate AI suggestions",
      details: err.message,
    });
  }
};

exports.summarizeChat = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    const recentMessages = await Message.find({
      $or: [
        { sender: senderId, receiver: userToChatId },
        { sender: userToChatId, receiver: senderId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(15);

    if (recentMessages.length === 0) {
      return res
        .status(200)
        .json({ summary: "No recent messages to summarize." });
    }
    recentMessages.reverse();

    const formattedHistory = recentMessages;
    map((msg) => {
      const role =
        msg.sender.toString() === senderId.toString() ? "Me" : "Other";
      return `${role}: ${msg.text}`;
    }).join("\n");

    const summary = await aiService.generateChatSummary(formattedHistory);

    res.status(200).json({ summary });
  } catch (err) {
    console.log("Error in summarizeChat controller: ", err.message);
    res
      .status(500)
      .json({ error: "Failed to generate AI summary", details: err.message });
  }
};
