import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useRaces } from "../RaceContext";
import { api } from "../api";
import { safeUrl } from "../lib/races";
import { Icon } from "../components/Icon";
export function Alerts() {
  const { user } = useAuth(),
    { demo, monitoring } = useRaces();
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    if (!user || demo) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    const refresh = () =>
      api
        .notifications()
        .then((data) => {
          if (active) {
            setItems(data);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      active = false;
    };
  }, [user, demo]);
  async function mark(id) {
    try {
      const item = await api.readNotification(id);
      setItems((old) => old.map((x) => (x._id === id ? item : x)));
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">STAY READY</p>
          <h1>Your registration alerts.</h1>
          <p className="muted">
            Changes to watched races and reminders before confirmed entry dates.
          </p>
        </div>
      </div>
      <div className="callout">
        <Icon name="bell" />
        <p>
          {demo
            ? "Demo mode: no live alerts."
            : monitoring.enabled
              ? "Watching races are checked weekly, daily near an announced window. Reminders appear here 7 days before, 1 day before, and on the date."
              : "Automatic checks are currently paused. Existing alerts remain available."}{" "}
          Email delivery is not enabled.
        </p>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading ? (
        <p>Loading alerts…</p>
      ) : !user && !demo ? (
        <div className="empty">
          <h2>Keep your races close.</h2>
          <Link className="btn-primary" to="/login">
            Log in to see alerts
          </Link>
        </div>
      ) : !items.length ? (
        <div className="empty">
          <Icon name="bell" />
          <h2>You’re all caught up.</h2>
          <p>
            Watch a race to receive registration updates here when monitoring is
            active.
          </p>
          <Link to="/discover">Find a race</Link>
        </div>
      ) : (
        <div className="alerts-list">
          {items.map((item) => (
            <article className="alert-card" key={item._id}>
              <span className="eyebrow">
                {item.readAt ? "READ" : "NEW"} ·{" "}
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
              <div className="race-actions">
                <Link className="btn-primary" to={`/races/${item.raceSlug}`}>
                  View race
                </Link>
                {safeUrl(item.sourceUrl) && (
                  <a
                    className="btn-secondary"
                    href={safeUrl(item.sourceUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official source
                  </a>
                )}
                {!item.readAt && (
                  <button
                    className="text-button"
                    onClick={() => mark(item._id)}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
