const Message = require("../models/message.model");
const User = require("../models/user.model");

// NOTE: You need to export getReceiverSocketId from your socket setup or server.js 
// to use it here for real-time emitting.

export const sendMessage = async (req, res) => {
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
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: userToChatId },
        { sender: userToChatId, receiver: senderId },
      ],
    }).sort({ createdAt: 1 }); // Sort by oldest first

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};