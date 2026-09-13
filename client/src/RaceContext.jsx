import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./AuthContext";
import { demoRaces } from "./data/demo";
const Context = createContext(null);
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function RaceProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [demo, setDemo] = useState(() =>
    new URLSearchParams(window.location.search).has("demo")
      ? new URLSearchParams(window.location.search).get("demo") === "1"
      : read("bibdrop-demo", false),
  );
  const [monitoring, setMonitoring] = useState({ enabled: false });
  useEffect(() => {
    let active = true;
    api
      .monitoring()
      .then((data) => {
        if (active) setMonitoring(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setError("");
    if (demo) {
      const saved = read("bibdrop-demo-status", {});
      setRaces(demoRaces.map((r) => ({ ...r, ...saved[r.slug] })));
      setLoading(false);
      return;
    }
    if (!user)
      setRaces((old) =>
        old.map((race) => ({
          ...race,
          interestStage: "none",
          entryOutcome: "not_applied",
        })),
      );
    api
      .listRaces()
      .then((data) => {
        if (active) setRaces(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo, user, authLoading, revision]);
  function setMode(value) {
    const url = new URL(window.location.href);
    url.searchParams.delete("demo");
    window.history.replaceState(null, "", url);
    setLoading(true);
    setRaces([]);
    localStorage.setItem("bibdrop-demo", JSON.stringify(value));
    setDemo(value);
  }
  function updateRace(race) {
    setRaces((old) =>
      old.some((r) => r.slug === race.slug)
        ? old.map((r) => (r.slug === race.slug ? { ...r, ...race } : r))
        : [...old, race],
    );
  }
  async function setStage(slug, stage) {
    if (demo) {
      const saved = read("bibdrop-demo-status", {});
      saved[slug] = { ...saved[slug], interestStage: stage };
      localStorage.setItem("bibdrop-demo-status", JSON.stringify(saved));
      updateRace({ slug, interestStage: stage });
      return;
    }
    const race = await api.setInterestStage(slug, stage);
    updateRace(race);
  }
  async function setOutcome(slug, outcome) {
    if (demo) {
      const saved = read("bibdrop-demo-status", {});
      saved[slug] = { ...saved[slug], entryOutcome: outcome };
      localStorage.setItem("bibdrop-demo-status", JSON.stringify(saved));
      updateRace({ slug, entryOutcome: outcome });
      return;
    }
    updateRace(await api.setOutcome(slug, outcome));
  }
  return (
    <Context.Provider
      value={{
        monitoring,
        races,
        loading,
        error,
        demo,
        setMode,
        setStage,
        setOutcome,
        updateRace,
        reload: () => setRevision((x) => x + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useRaces = () => useContext(Context);
