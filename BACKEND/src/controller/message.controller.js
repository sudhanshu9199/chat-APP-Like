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

    const systemPrompt = `You are an AI chat assistant. Your job is to suggest three short, natural, and context-aware replies for the user to select.
    Rules:
    1. Replies MUST be under 6 words.
    2. DO NOT use emojis.
    3. Provide diverse a strict JSON array of strings and absolutely nothing else. No markdown formatting, no explanation.
    Example: ["Yes, I agree.", "No, I don't think so.", "What do you mean?"]`;

    const llmResponse = await fetch("YOUR_LLAMA_3_API_ENDPOINT", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Conversation history:\n${conversationHistory}\n\nGenerate 3 replies foe 'Me'.`,
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await llmResponse.json();

    let rawText = data.choices[0].message.content;

    rawText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const repliesArray = JSON.parse(rawText);
    res.status(200).json(repliesArray);
  } catch (err) {
    console.log("Error in suggestReplies controller: ", err.message);
    res.status(500).json({ error: "Failed to generate AI suggestions" });
  }
};
