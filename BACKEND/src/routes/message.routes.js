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

router
  .route("/suggest-replies/:id")
  .get(authMiddleware, suggestReplies)
  .post(authMiddleware, suggestReplies);

router
  .route("/summarize/:id")
  .get(authMiddleware, summarizeChat)
  .post(authMiddleware, summarizeChat);

module.exports = router;
