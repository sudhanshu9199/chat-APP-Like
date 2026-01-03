const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/aut.middleware');
const upload = require('../middleware/multer.middleware');
const { getParticipants, updateProfile } = require('../controller/user.controller');

router.get('/participants', authMiddleware, getParticipants);
router.put('/update-profile', authMiddleware, upload.single('avatar'), updateProfile)
module.exports = router;