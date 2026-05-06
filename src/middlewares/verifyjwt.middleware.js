import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No access token provided",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Access token expired. Please login again."
          : "Invalid access token.",
    });
  }

  // Always fetch fresh user — JWT payload can be stale
  const user = await User.findById(decoded._id).select("-password -refreshToken");

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User no longer exists.",
    });
  }

  // Global block check — blocked users can do NOTHING regardless of role
  if (user.status === "blocked") {
    return res.status(403).json({
      success: false,
      message: "Your account has been blocked. Please contact support.",
    });
  }

  req.user = user;
  next();
});

export default verifyJWT;