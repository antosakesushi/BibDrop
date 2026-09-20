import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { COURSE_TYPES, KNOWN_RACE_TAGS, SEASONS } from "../constants/raceTags.js";

const inputStyle = {
  background: "var(--bg-card)",
  color: "var(--text-primary)",
  border: "1px solid #333",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

function TagChip({ tag, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(tag)}
      className={selected ? "btn-primary" : "btn-secondary"}
      style={{ fontSize: 12, padding: "6px 12px" }}
    >
      {tag}
    </button>
  );
}

export function Goals() {
  const { user, loading } = useAuth();
  const [goals, setGoals] = useState(null);
  const [home, setHome] = useState(null);
  const [error, setError] = useState(null);
  const [label, setLabel] = useState("");
  const [tags, setTags] = useState([]);
  const [season, setSeason] = useState("");
  const [courseType, setCourseType] = useState("");
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    Promise.all([api.getGoalHome(), api.listGoals()])
      .then(([homeBody, list]) => {
        setHome(homeBody);
        setGoals(list);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setGoals([]);
      setHome({ goals: [], nothingUrgent: true });
      return;
    }
    load();
  }, [user, loading]);

  function toggleTag(tag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const constraints = {};
      if (season) constraints.season = season;
      if (courseType) constraints.courseType = courseType;
      if (region.trim()) constraints.region = region.trim();
      await api.createGoal({
        label,
        tags,
        constraints: Object.keys(constraints).length ? constraints : null,
      });
      setLabel("");
      setTags([]);
      setSeason("");
      setCourseType("");
      setRegion("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id) {
    setError(null);
    try {
      await api.archiveGoal(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRestore(id) {
    setError(null);
    try {
      await api.updateGoal(id, { status: "active" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading…</div>;

  if (!user) {
    return (
      <div style={{ padding: "24px 32px", maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 8 }}>Goals</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          <Link to="/login" style={{ color: "var(--accent-primary)" }}>Log in</Link> to see what to do next for a goal.
          BibDrop tracks deadlines — it does not enter lotteries or pay on your behalf.
        </p>
      </div>
    );
  }

  const activeHome = home?.goals || [];
  const archived = (goals || []).filter((g) => g.status === "archived");
  const headline = activeHome.find((g) => g.next && g.next.kind !== "none")?.next;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>Goals</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        What do you need to do next? Official race sites stay the place you enter or pay.
        BibDrop does not register for you.
      </p>

      {headline ? (
        <div className="card" style={{ marginBottom: 20, border: "1px solid #2a2a2a" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--text-secondary)" }}>NEXT</div>
          <p style={{ marginBottom: 12 }}>{headline.copy}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {headline.officialUrl && (
              <a href={headline.officialUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: "none" }}>
                Official site
              </a>
            )}
            {headline.raceSlug && (
              <Link to={`/races/${headline.raceSlug}`} className="btn-secondary" style={{ textDecoration: "none" }}>
                Open in BibDrop
              </Link>
            )}
          </div>
        </div>
      ) : (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Nothing urgent. Add a goal, or watch a race when you are ready.
        </p>
      )}

      <form onSubmit={handleCreate} className="card" style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--text-secondary)" }}>NEW GOAL</div>
        <input
          type="text"
          placeholder='e.g. "BQ attempt 2027" or "first major"'
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          maxLength={80}
          style={inputStyle}
        />
        <div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>Tags (from the race registry)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {KNOWN_RACE_TAGS.map((tag) => (
              <TagChip key={tag} tag={tag} selected={tags.includes(tag)} onToggle={toggleTag} />
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <select value={season} onChange={(e) => setSeason(e.target.value)} style={inputStyle}>
            <option value="">Any season</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={courseType} onChange={(e) => setCourseType(e.target.value)} style={inputStyle}>
            <option value="">Any course</option>
            {COURSE_TYPES.map((c) => (
              <option key={c} value={c}>{c.replaceAll("_", " ")}</option>
            ))}
          </select>
        </div>
        <input
          type="text"
          placeholder="Region (optional, e.g. USA or Europe)"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          maxLength={80}
          style={inputStyle}
        />
        <button type="submit" className="btn-primary" disabled={saving || !label.trim()} style={{ alignSelf: "flex-start" }}>
          {saving ? "Saving…" : "Save goal"}
        </button>
      </form>

      {error && <p style={{ color: "var(--status-urgent)" }}>{error}</p>}

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Active ({activeHome.length})</h2>
      {goals === null || home === null ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading…</p>
      ) : activeHome.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Nothing urgent. Add a goal above when you are ready.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activeHome.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onArchive={() => handleArchive(goal.id)} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Archived ({archived.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {archived.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onRestore={() => handleRestore(goal.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GoalCard({ goal, onArchive, onRestore }) {
  const next = goal.next;
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 600 }}>{goal.label}</div>
          {goal.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {goal.tags.map((tag) => (
                <span key={tag} className="status-tag status-tag--following">{tag}</span>
              ))}
            </div>
          )}
          {goal.constraints && (goal.constraints.season || goal.constraints.courseType || goal.constraints.region) && (
            <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 8 }}>
              {[goal.constraints.season, goal.constraints.courseType?.replaceAll("_", " "), goal.constraints.region]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>
        {goal.status === "active" ? (
          <button type="button" className="btn-secondary" onClick={onArchive} style={{ fontSize: 13, padding: "6px 14px", flexShrink: 0 }}>
            Archive
          </button>
        ) : (
          <button type="button" className="btn-secondary" onClick={onRestore} style={{ fontSize: 13, padding: "6px 14px", flexShrink: 0 }}>
            Restore
          </button>
        )}
      </div>

      {next && (
        <div style={{ fontSize: 14 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--text-secondary)", marginBottom: 4 }}>NEXT</div>
          <div>{next.copy}</div>
          {next.officialUrl && (
            <a href={next.officialUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)", fontSize: 13, display: "inline-block", marginTop: 6 }}>
              Official site →
            </a>
          )}
        </div>
      )}

      {goal.pathway?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--text-secondary)", marginBottom: 6 }}>MATCHED RACES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {goal.pathway.map((race) => (
              <div key={race.slug} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                <Link to={`/races/${race.slug}`} style={{ color: "var(--text-primary)" }}>{race.name}</Link>
                <span style={{ color: "var(--text-secondary)" }}>{race.interestStage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {goal.fallbacks?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--text-secondary)", marginBottom: 6 }}>
            OTHER REGISTRY RACES
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 0 }}>
            No dated watching window on this pathway. These overlap your tags from the curated list — no extra research was run.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {goal.fallbacks.map((race) => (
              <div key={race.slug} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                <Link to={`/races/${race.slug}`}>{race.name}</Link>
                {race.officialUrl && (
                  <a href={race.officialUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)" }}>Official</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
