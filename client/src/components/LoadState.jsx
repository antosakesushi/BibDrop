import { useRaces } from "../RaceContext";
import { Icon } from "./Icon";
export function LoadState() {
  const { loading, error, reload, setMode } = useRaces();
  if (loading)
    return (
      <div className="empty" role="status">
        <Icon name="route" size={32} />
        <h2>Finding your start lines…</h2>
      </div>
    );
  if (error)
    return (
      <div className="empty">
        <Icon name="info" size={32} />
        <h2>The race catalog is unavailable</h2>
        <p className="muted">
          The local API may not be running. Retry, or explore the labelled demo.
        </p>
        <div className="button-row">
          <button className="btn-primary" onClick={reload}>
            Try again
          </button>
          <button className="btn-secondary" onClick={() => setMode(true)}>
            Explore demo
          </button>
        </div>
        <p className="error small" role="alert">
          {error}
        </p>
      </div>
    );
  return null;
}
