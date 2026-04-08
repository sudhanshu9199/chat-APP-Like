// auth.routes.js
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controller/auth.controller");
const upload = require("../middleware/multer.middleware");

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // Limit each IP to 5 failed requests per hour
  message:
    "Too many authentication attempts from this IP, please try again after an hour",
});

router.post(
  "/register",
  authLimiter,
  upload.single("avatar"),
  authController.registerUser,
);
router.post("/login", authLimiter, authController.loginUser);
router.post("/google", authLimiter, authController.googleAuth);
router.post("/logout", authController.logoutUser);
module.exports = router;
