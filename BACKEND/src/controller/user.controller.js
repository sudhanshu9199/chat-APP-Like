const userModel = require("../models/user.model");
const messageModel = require("../models/message.model");
const imageKit = require("../services/imagekit.service");

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
          seen: false,
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
    console.error("Error fetching participants:", err);
    res.status(500).json({
      message: "Failed to load participants",
    });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user._id;

    let avatarUrl = undefined;
    if (req.file) {
      try {
        const uploadResponse = await imageKit.upload({
          file: req.file.buffer.toString("base64"),
          fileName: `user-${userId}-${Date.now()}`,
          folder: "ChatAvatars",
        });
        avatarUrl = uploadResponse.url;
      } catch (uploadErr) {
        console.error("ImageKit upload error:", uploadErr);
        return res.status(500).json({
          message: "Failed to upload image",
        });
      }
    }

    const updateData = {};
    if (avatarUrl) {
      updateData.avatar = avatarUrl;
    }

    if(Object.keys(updateData).length === 0) {
      const user = await userModel.findById(userId);
      return res.status(200).json({
        message: 'No changes made',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          about: user.about,
        }
      });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        about: updatedUser.about,
      },
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({
      message: 'Internal server error'
    })
  }
}

module.exports = { getParticipants, updateProfile };
