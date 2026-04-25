// message.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/aut.middleware");
const {
  sendMessage,
  getMessages,
  suggestReplies,
  summarizeChat,
} = require("../controller/message.controller");

router.get("/:id", authMiddleware, getMessages);
router.post("/send/:id", authMiddleware, sendMessage);

router.get("/suggest-replies/:id", authMiddleware, suggestReplies);
router.get("/summarize/:id", authMiddleware, summarizeChat);

module.exports = router;
