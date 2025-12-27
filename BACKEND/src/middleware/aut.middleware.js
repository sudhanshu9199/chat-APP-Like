const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]; // explain the logic of this line with each terms -> First, it tries to get the token from the cookies (req.cookies.token). If it's not found there, it looks for the token in the Authorization header (req.headers.authorization) and splits the string by space to extract the token part (the second element of the resulting array, hence [1]).
    if (!token) {
      return res.status(401).json({
        message: "Authentication token is missing",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = user; // Attach user info to request object
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}
module.exports = authMiddleware;