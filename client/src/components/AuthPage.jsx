import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Icon } from "./Icon";
export function AuthPage({ create = false }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await (create ? register : login)(f.get("email"), f.get("password"));
      navigate("/");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <p className="eyebrow">YOUR NEXT START LINE</p>
        <h1>
          Less checking.
          <br />
          More running.
        </h1>
        <p>Keep your shortlist close and your registration windows in view.</p>
        <div className="auth-points">
          <span>
            <Icon name="bookmark" />
            Your personal race list
          </span>
          <span>
            <Icon name="spark" />
            Research that helps you choose
          </span>
          <span>
            <Icon name="calendar" />
            Entry dates in one place
          </span>
        </div>
        <p className="small">
          Prototype: automatic monitoring and email alerts are not active.
        </p>
      </div>
      <section className="panel auth-form">
        <span className="soft-icon">
          <Icon name="flag" size={26} />
        </span>
        <h2>{create ? "Your next race starts here." : "Welcome back."}</h2>
        <p className="muted">
          {create
            ? "Create an account to save your races."
            : "Log in to return to your shortlist."}
        </p>
        <form className="form" onSubmit={submit}>
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={create ? 8 : undefined}
              autoComplete={create ? "new-password" : "current-password"}
              required
              placeholder={create ? "At least 8 characters" : "Your password"}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="btn-primary full" disabled={busy}>
            {busy ? "Please wait…" : create ? "Create account" : "Log in"}
            <Icon name="arrow" size={17} />
          </button>
        </form>
        <p className="small muted">
          {create ? "Already have an account?" : "New to BibDrop?"}{" "}
          <Link to={create ? "/login" : "/register"}>
            {create ? "Log in" : "Create an account"}
          </Link>
        </p>
        <Link to="/discover" className="text-button">
          Keep exploring first
        </Link>
      </section>
    </div>
  );
}
