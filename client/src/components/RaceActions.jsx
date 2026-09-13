import { useState } from "react";
import { useRaces } from "../RaceContext";
import { useAuth } from "../AuthContext";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
export function RaceActions({ race, compact = false }) {
  const { demo, setStage, monitoring } = useRaces();
  const { user, login, register } = useAuth();
  const [pending, setPending] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [create, setCreate] = useState(true);
  async function commit(stage) {
    setBusy(true);
    setError("");
    try {
      await setStage(race.slug, stage);
      setDialog(null);
      setPending(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function request(stage) {
    setError("");
    setPending(stage);
    if (!user && !demo) setDialog("auth");
    else if (stage === "watching") setDialog("watch");
    else commit(stage);
  }
  async function authenticate(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await (create ? register : login)(
        form.get("email"),
        form.get("password"),
      );
      if (pending === "watching") setDialog("watch");
      else await commit(pending);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const watched = race.interestStage === "watching",
    saved = race.interestStage === "interested";
  return (
    <>
      <div className={`race-actions ${compact ? "compact" : ""}`}>
        <button
          className={watched ? "btn-secondary" : "btn-primary"}
          disabled={busy}
          onClick={() => request(watched ? "interested" : "watching")}
        >
          <Icon name={watched ? "check" : "bell"} size={17} />
          {watched ? "Watching · stop" : "Watch registration"}
        </button>
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={() => request(saved || watched ? "none" : "interested")}
          aria-label={
            saved || watched
              ? `Remove ${race.name} from my races`
              : `Save ${race.name}`
          }
        >
          <Icon name="bookmark" size={17} />
          {saved || watched ? "Remove" : "Save"}
        </button>
      </div>
      {error && !dialog && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {dialog === "auth" && (
        <Modal
          title={create ? "Save your next start line" : "Welcome back"}
          onClose={() => setDialog(null)}
        >
          <p className="muted">
            {create ? "Create an account" : "Log in"} to keep {race.name} in
            your races.
          </p>
          <form onSubmit={authenticate} className="form">
            <label>
              Email
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete={create ? "new-password" : "current-password"}
                minLength={create ? 8 : undefined}
                required
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="btn-primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : create
                  ? "Create account & continue"
                  : "Log in & continue"}
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setCreate(!create);
              setError("");
            }}
          >
            {create
              ? "Already have an account? Log in"
              : "New here? Create account"}
          </button>
        </Modal>
      )}
      {dialog === "watch" && (
        <Modal title={`Watch ${race.name}`} onClose={() => setDialog(null)}>
          <div className="callout">
            <Icon name="bell" />
            <div>
              <strong>Your registration watchlist</strong>
              <p>
                Add this race to your deadline view. You can stop watching at
                any time.
              </p>
            </div>
          </div>
          <p>
            <strong>
              {!demo && monitoring.enabled
                ? "Registration monitoring is active."
                : "Automatic checks are currently paused."}
            </strong>{" "}
            {!demo && monitoring.enabled
              ? "We check weekly, and daily near an announced registration window. Changes and date reminders appear in your Alerts."
              : "Watching saves this race to your deadline view. Research is available on request; automatic reminders require the monitoring service to be enabled."}
          </p>
          <p className="muted small">
            Alerts do not enter a race for you. Check official sources for exact
            deadlines and requirements. Email delivery is not enabled.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn-primary full"
            disabled={busy}
            onClick={() => commit("watching")}
          >
            {busy ? "Saving…" : "Add to watchlist"}
          </button>
        </Modal>
      )}
    </>
  );
}
