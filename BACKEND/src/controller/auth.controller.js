// auth.controller.js
const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const imageKit = require("../services/imagekit.service");
const axios = require("axios");

async function googleAuth(req, res) {
  const { access_token } = req.body;
  try {
    const { data } = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    const { sub, email, name, picture } = data;
    let user = await userModel.findOne({ email });

    if (!user) {
      user = await userModel.create({
        email,
        name,
        googleId: sub,
        avatar: picture,
        isOnline: true,
        lastSeen: new Date(),
      });
    } else {
      if (!user.googleId) {
        user.googleId = sub;
        if (!user.avatar) user.avatar = picture;
      }
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 2 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Google Auth successful",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        about: user.about,
        token,
      },
    });
  } catch (err) {
    console.error("Google Auth Error:", err);
    return res.status(401).json({ message: "Invalid Google token" });
  }
}

async function registerUser(req, res) {
  const { email, name, password } = req.body;
  if (!password)
    return res.status(400).json({
      message: "Password is required",
    });

  try {
    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }
    let avatarUrl = "";
    if (req.file) {
      try {
        const uploadResponse = await imageKit.upload({
          file: req.file.buffer.toString("base64"),
          fileName: `user-${Date.now()}`,
          folder: "ChatAvatars",
        });
        avatarUrl = uploadResponse.url;
      } catch (uploadError) {
        console.error("ImageKit Error:", uploadError);
        // Optional: return error or continue with empty avatar
      }
    } else {
      console.log("No file received in req.file. Check Postman 'avatar' key.");
    }

    const user = await userModel.create({
      email,
      name,
      password: await bcrypt.hash(password, 10),
      avatar: avatarUrl,
    });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 2 * 24 * 60 * 60 * 1000, // explain this calculation step by step -> 2 days in milliseconds -> 2 days * 24 hours/day * 60 minutes/hour * 60 seconds/minute * 1000 milliseconds/second
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        about: user.about,
        token,
      },
    });
  } catch (err) {
    console.error("Error registering user:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function loginUser(req, res) {
  const { email, password } = req.body;
  try {
    const user = await userModel.findOne({
      email,
    });
    if (!user) {
      return res.status(404).json({
        message: "user not found",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        message:
          "This account uses Google Sign-In. Please click 'Continue with Google'.",
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save(); // This line saves the updated user document back to the database, ensuring that the changes to isOnline and lastSeen are persisted.

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 2 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        about: user.about,
        token,
      },
    });
  } catch (err) {
    console.error("Error logging in user:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function logoutUser(req, res) {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Error logging out:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  googleAuth,
};
