// message.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/aut.middleware');
const { sendMessage, getMessages } = require('../controller/message.controller');

router.get('/:id', authMiddleware, getMessages);
router.post('/send/:id', authMiddleware, sendMessage);

module.exports = router;