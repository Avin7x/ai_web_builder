import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";

export async function auth(req, res, next) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      error: "Not authenticated",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Session expired or invalid. Please sign in again.",
    });
  }
}