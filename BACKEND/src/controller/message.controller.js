// message.controller.js
const Message = require("../models/message.model");
const User = require("../models/user.model");

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
      { sender: userToChatId, receiver: sendId, seen: false },
      { $set: { seen: true }}
    );

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
