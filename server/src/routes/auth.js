import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { signToken, requireAuth, cookieOptions } from "../middleware/auth.js";
import { inviteErrorMessage, isInviteRequired, isValidInviteCode } from "../services/invite.js";
import { isAdminEmail } from "../services/admin.js";

export const authRouter = Router();

const COOKIE_NAME = "bibdrop_session";

authRouter.get("/config", (req, res) => {
  res.json({
    inviteRequired: isInviteRequired(),
    softLaunch: process.env.SOFT_LAUNCH === "true",
  });
});

function isValidEmail(email) {
  return typeof email === "string" && /\S+@\S+\.\S+/.test(email);
}

function publicUser(user) {
  return { email: user.email, isAdmin: isAdminEmail(user.email) };
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const { email, password, inviteCode } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    if (!isValidInviteCode(inviteCode)) {
      return res.status(403).json({ error: inviteErrorMessage() });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase(), passwordHash });

    const token = signToken(user._id.toString());
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.status(201).json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const token = signToken(user._id.toString());
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: "Not logged in." });
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});
