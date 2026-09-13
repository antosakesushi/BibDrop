import jwt from "jsonwebtoken";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to .env - see .env.example.");
  }
  return secret;
}

export function signToken(userId) {
  return jwt.sign({ userId }, getSecret(), { expiresIn: "30d" });
}

// Requires a valid session - blocks the request with 401 if missing/invalid.
export function requireAuth(req, res, next) {
  const token = req.cookies?.bibdrop_session;
  if (!token) return res.status(401).json({ error: "Not logged in." });
  try {
    const payload = jwt.verify(token, getSecret());
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}

// Attaches req.userId if a valid session exists, but doesn't block the
// request if not - used for routes that work either way (e.g. listing
// races) but behave slightly differently when a user is known.
export function optionalAuth(req, res, next) {
  const token = req.cookies?.bibdrop_session;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, getSecret());
    req.userId = payload.userId;
  } catch (err) {
    // Invalid/expired token on an optional route - just proceed logged-out.
  }
  next();
}
