import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 360, margin: "60px auto" }}>
      <h1 style={{ fontSize: 22 }}>Log in</h1>
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        {error && <p style={{ color: "var(--status-urgent)", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 16 }}>
        No account yet? <Link to="/register" style={{ color: "var(--accent-primary)" }}>Sign up</Link>
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
