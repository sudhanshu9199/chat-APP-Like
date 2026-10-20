const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    seen: {
      type: Boolean,
      default: false,
    },
    delivered: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Ephemeral Queue TTL: Auto-prunes undelivered offline messages after 14 days (0 MB storage leak)
    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true },
);

// TTL index to automatically purge messages when expireAt is reached
messageSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, delivered: 1 });
messageSchema.index({ createdAt: -1 });

const messageModel = mongoose.model("messages", messageSchema);

module.exports = messageModel;

