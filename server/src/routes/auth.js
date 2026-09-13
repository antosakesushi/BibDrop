import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { signToken, requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const COOKIE_NAME = "bibdrop_session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  // secure:true requires HTTPS - fine for local dev over http, but this
  // MUST be true once deployed behind a real domain, or the cookie won't
  // be marked secure and some browsers will reject it under SameSite=None
  // if frontend and backend end up on different domains in production.
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

function isValidEmail(email) {
  return typeof email === "string" && /\S+@\S+\.\S+/.test(email);
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
    });

    const token = signToken(user._id.toString());
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.status(201).json({ email: user.email });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // Deliberately the same error for "no such user" and "wrong password" -
    // don't leak which emails have accounts.
    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const token = signToken(user._id.toString());
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({ email: user.email });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: undefined });
  res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: "Not logged in." });
    res.json({ email: user.email });
  } catch (err) {
    next(err);
  }
});
