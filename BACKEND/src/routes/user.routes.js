const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/aut.middleware');
const { getParticipants } = require('../controller/user.controller');

router.get('/participants', authMiddleware, getParticipants);
module.exports = router;