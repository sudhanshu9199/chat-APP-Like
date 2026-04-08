const userModel = require("../models/user.model");
const messageModel = require("../models/message.model");
const imageKit = require("../services/imagekit.service");
const mongoose = require("mongoose");

async function getParticipants(req, res) {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user._id);

    const result = await userModel.aggregate([
      { $match: { _id: { $ne: currentUserId } } },

      {
        $lookup: {
          from: "messages",
          let: { otherUserId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $and: [
                        { $eq: ["$sender", currentUserId] },
                        { $eq: ["$receiver", "$$otherUserId"] },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ["$sender", "$$otherUserId"] },
                        { $eq: ["$receiver", currentUserId] },
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
          ],
          as: "chatHistory",
        },
      },
      {
        $project: {
          id: "$_id",
          name: 1,
          avatar: 1,
          about: 1,
          isOnline: 1,
          lastSeen: 1,
          lastMessage: {
            $cond: {
              if: { $gt: [{ $size: "$chatHistory" }, 0] },
              then: { $arrayElemAt: ["$chatHistory.text", 0] },
              else: "Start a conversation",
            },
          },
          lastMessageAt: {
            $cond: {
              if: { $gt: [{ $size: "$chatHistory" }, 0] },
              then: { $arrayElemAt: ["$chatHistory.createdAt", 0] },
              else: null,
            },
          },

          unreadCount: {
            $size: {
              $filter: {
                input: "$chatHistory",
                as: "msg",
                cond: {
                  $and: [
                    { $eq: ["$$msg.receiver", currentUserId] },
                    { $eq: ["$$msg.seen", false] },
                  ],
                },
              },
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
    ]);

    res.status(200).json({
      message: "Participants fetched successfully",
      participants: result,
    });
  } catch (err) {
    console.error("Error fetching participants:", err);
    res.status(500).json({ message: "Failed to load participants" });
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

    if (Object.keys(updateData).length === 0) {
      const user = await userModel.findById(userId);
      return res.status(200).json({
        message: "No changes made",
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          about: user.about,
        },
      });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true },
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        about: updatedUser.about,
      },
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = { getParticipants, updateProfile };
