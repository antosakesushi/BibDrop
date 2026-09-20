import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRequired, setInviteRequired] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.authConfig()
      .then((cfg) => setInviteRequired(Boolean(cfg.inviteRequired)))
      .catch(() => setInviteRequired(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, inviteCode.trim() || undefined);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 360, margin: "60px auto" }}>
      <h1 style={{ fontSize: 22 }}>Sign up</h1>
      {inviteRequired && (
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          This hosted pilot needs an invite code.
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder={inviteRequired ? "Invite code" : "Invite code (if you have one)"}
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          required={inviteRequired}
          autoComplete="off"
          style={inputStyle}
        />
        {error && <p style={{ color: "var(--status-urgent)", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 16 }}>
        Already have an account? <Link to="/login" style={{ color: "var(--accent-primary)" }}>Log in</Link>
      </p>
    </div>
  );
}

const inputStyle = {
  background: "var(--bg-card)",
  color: "var(--text-primary)",
  border: "1px solid #333",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
};
