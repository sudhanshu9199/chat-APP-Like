const userModel = require("../models/user.model");
const messageModel = require("../models/message.model");

async function getParticipants(req, res) {
  try {
    const currentUserId = req.user._id;
    const users = await userModel
      .find({ _id: { $ne: currentUserId } })
      .select("name avatar about isOnline lastSeen");

    const results = await Promise.all(
      users.map(async (user) => {
        const lastMsg = await messageModel
          .findOne({
            $or: [
              { sender: currentUserId, receiver: user._id },
              { sender: user._id, receiver: currentUserId },
            ],
          })
          .sort({ createdAt: -1 });

          const unreadCount = await messageModel.countDocuments({
            sender: user._id,
            receiver: currentUserId,
            seen: false
          });

        return {
          id: user._id,
          name: user.name,
          avatar: user.avatar,
          about: user.about,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          lastMessage: lastMsg ? lastMsg.text : "Start a conversation",
          lastMessageAt: lastMsg ? lastMsg.createdAt : null,
          unreadCount: unreadCount,
        };
      })
    );

    res.status(200).json({
      message: "Participants fetchhed successfully",
      participants: results,
    });
  } catch (err) {
    console.error('Error fetching participants:', err);
    res.status(500).json({
      message: "Failed to load participants",
    });
  }
}

module.exports = { getParticipants };
