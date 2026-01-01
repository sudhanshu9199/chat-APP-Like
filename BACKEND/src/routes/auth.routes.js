// auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');
const upload = require('../middleware/multer.middleware');
router.post('/register', upload.single('avatar'), authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/logout', authController.logoutUser);
module.exports = router;