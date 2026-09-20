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

export function signCalendarToken(userId) {
  return jwt.sign({ userId, purpose: "ics" }, getSecret(), { expiresIn: "365d" });
}

export function verifyCalendarToken(token) {
  if (!token) {
    const err = new Error("Calendar feed token is missing.");
    err.statusCode = 401;
    throw err;
  }
  try {
    const payload = jwt.verify(token, getSecret());
    if (payload.purpose !== "ics" || !payload.userId) {
      const err = new Error("Not a calendar feed token.");
      err.statusCode = 401;
      throw err;
    }
    return payload.userId;
  } catch (err) {
    if (err.statusCode) throw err;
    const wrapped = new Error("Calendar feed token is invalid or expired.");
    wrapped.statusCode = 401;
    throw wrapped;
  }
}

export function cookieOptions() {
  const production = process.env.NODE_ENV === "production";
  const sameSiteRaw = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  const sameSite = sameSiteRaw === "none" ? "none" : "lax";
  // SameSite=None is required for a Vercel frontend talking directly to a
  // Render API (cross-site). Vercel rewrites to /api keep Lax. Secure is
  // always on in production.
  const secure =
    production || sameSite === "none" || process.env.COOKIE_SECURE === "true";
  return {
    httpOnly: true,
    sameSite,
    secure,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

// Requires a valid session - blocks the request with 401 if missing/invalid.
export function requireAuth(req, res, next) {
  const token = req.cookies?.bibdrop_session;
  if (!token) return res.status(401).json({ error: "Not logged in." });
  try {
    const payload = jwt.verify(token, getSecret());
    if (!payload.userId || payload.purpose === "ics") {
      return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
    }
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
    if (payload.userId && payload.purpose !== "ics") {
      req.userId = payload.userId;
    }
  } catch (err) {
    // Invalid/expired token on an optional route - just proceed logged-out.
  }
  next();
}
