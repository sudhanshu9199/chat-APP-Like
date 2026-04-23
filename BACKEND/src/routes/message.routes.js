// message.routes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/aut.middleware");
const {
  sendMessage,
  getMessages,
  suggestReplies,
} = require("../controller/message.controller");

router.get("/:id", authMiddleware, getMessages);
router.post("/send/:id", authMiddleware, sendMessage);

router.get("/suggest-replies/:id", authMiddleware, suggestReplies);

module.exports = router;
