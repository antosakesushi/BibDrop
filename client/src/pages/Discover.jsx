import ReactMarkdown from "react-markdown";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useRaces } from "../RaceContext";
import { api } from "../api";
import { RaceCard } from "../components/RaceCard";
import { Icon } from "../components/Icon";
import { LoadState } from "../components/LoadState";
import { safeUrl } from "../lib/races";
const prompts = [
  "A fast autumn marathon in Europe",
  "A race with a smaller field",
  "Help me choose my first marathon",
];
export function Discover() {
  const [params] = useSearchParams();
  const { races, demo, loading, error, updateRace } = useRaces();
  const [input, setInput] = useState(
    params.get("race") ? `Tell me about ${params.get("race")}` : "",
  );
  const [messages, setMessages] = useState([]);
  const [candidates, setCandidates] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState("");
  const [demoFilter, setDemoFilter] = useState("");
  const messagesEnd = useRef(null);
  useEffect(() => {
    if (messages.length || busy)
      messagesEnd.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);
  async function send(text = input) {
    text = text.trim();
    if (!text || busy) return;
    setBusy(true);
    setFailure("");
    const previousMessages = messages;
    const history = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    try {
      let result;
      if (demo) {
        const combined = (demoFilter + " " + text).toLowerCase();
        setDemoFilter(combined);
        let found = races;
        if (/europe|germany|berlin/.test(combined))
          found = found.filter((r) =>
            ["Germany", "UK", "Spain"].includes(r.country),
          );
        if (/autumn|fall/.test(combined))
          found = found.filter((r) => r.season === "fall");
        if (/small/.test(text.toLowerCase()))
          result = {
            reply:
              "The demo catalog has no verified small-field race to recommend. In live mode I would research more options and keep your earlier preferences. Try a race name or compare the current results.",
            candidates: [],
          };
        else {
          const named = races.filter(
            (r) =>
              text.toLowerCase().includes(r.city.toLowerCase()) ||
              text.toLowerCase().includes(r.name.toLowerCase()),
          );
          if (named.length) found = named;
          result = {
            reply: found.length
              ? "Here are sample profiles to explore. These fixtures demonstrate the conversation and shortlist; their dates and metrics are not verified. Ask a follow-up, open a profile, or choose a race to watch."
              : "No sample races match that combination. Start a new conversation to reset your preferences.",
            candidates: found.map((r) => ({
              ...r,
              matchReason:
                "Example result for your conversation. Live mode researches source-backed matches.",
            })),
          };
        }
      } else result = await api.discoverRaces(text, messages.slice(-10));
      setMessages([...history, { role: "assistant", content: result.reply }]);
      setCandidates(result.candidates);
      setInput("");
    } catch (e) {
      setMessages(previousMessages);
      setInput(text);
      setFailure(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function add(candidate) {
    setAdding(candidate.name);
    setFailure("");
    try {
      const race = await api.confirmDiscoveredRace(candidate);
      updateRace({ ...race, interestStage: race.interestStage || "none" });
      setCandidates((old) =>
        old.map((c) => (c.name === candidate.name ? { ...c, ...race } : c)),
      );
    } catch (e) {
      setFailure(e.message);
    } finally {
      setAdding("");
    }
  }
  if (loading || error) return <LoadState />;
  const filtered = races.filter((r) =>
    (r.name + " " + r.city + " " + r.country)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A RESEARCHER IN YOUR CORNER</p>
          <h1>Where do you want to run?</h1>
          <p className="muted">
            Find a race that fits. Understand what it takes to enter.
          </p>
        </div>
      </div>
      <div className="discover-layout">
        <section className="panel conversation">
          <div className="section-head">
            <div className="icon-heading">
              <span className="soft-icon">
                <Icon name="spark" />
              </span>
              <div>
                <h2>BibDrop Researcher</h2>
                <span className="small muted">
                  {demo
                    ? "Example conversation · no live AI"
                    : "Source-backed race research"}
                </span>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                className="text-button small"
                onClick={() => {
                  setMessages([]);
                  setCandidates(null);
                  setDemoFilter("");
                }}
                disabled={busy}
              >
                New chat
              </button>
            )}
          </div>
          <div className="messages" aria-live="polite">
            <div className="message assistant">
              Tell me what matters: a fast course, a destination, cooler weather
              or a race you’ve always wanted to run. I can help you compare the
              details and investigate entry routes.
            </div>
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                <span className="message-author">
                  {m.role === "user" ? "You" : "Researcher"}
                </span>
                {m.role === "assistant" ? (
                  <ReactMarkdown
                    skipHtml
                    components={{
                      a: ({ href, children }) =>
                        safeUrl(href) ? (
                          <a
                            href={safeUrl(href)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {children}
                          </a>
                        ) : (
                          <span>{children}</span>
                        ),
                      img: () => null,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>
            ))}
            {busy && (
              <div className="message assistant" role="status">
                Checking race sources and preparing your results… This can take
                a few minutes.
              </div>
            )}
            <div ref={messagesEnd} />
          </div>
          {!messages.length && (
            <div className="prompt-list">
              {prompts.map((p) => (
                <button key={p} onClick={() => send(p)} disabled={busy}>
                  {p}
                  <Icon name="arrow" size={15} />
                </button>
              ))}
            </div>
          )}
          {failure && (
            <p className="error" role="alert">
              {failure}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="composer"
          >
            <label className="sr-only" htmlFor="research-input">
              Ask the researcher
            </label>
            <textarea
              id="research-input"
              disabled={busy}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={600}
              placeholder={
                messages.length
                  ? "Ask a follow-up…"
                  : "Ask about races, courses or registration…"
              }
              rows={3}
            />
            <div className="section-head">
              <span className="small muted">
                {input.length}/600 ·{" "}
                {demo ? "Demo" : "Live research uses API credits"}
              </span>
              <button
                className="btn-primary"
                disabled={busy || !input.trim()}
                aria-label="Send research question"
              >
                <Icon name="send" size={18} />
              </button>
            </div>
          </form>
          <p className="small muted">
            Save and watch only when you choose. Research does not register you
            for a race.
          </p>
        </section>
        <section className="discover-results">
          <div className="section-head">
            <h2>
              {candidates
                ? "Your research results"
                : "Explore the race catalog"}
            </h2>
            <span className="count">
              {candidates ? candidates.length : filtered.length}
            </span>
          </div>
          {!candidates && (
            <label className="search-field">
              <Icon name="search" />
              <input
                aria-label="Search catalog by race or city"
                placeholder="Search a race or city"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          )}
          <div className="race-grid two">
            {candidates
              ? candidates.map((c, i) => {
                  const existing = races.find(
                    (r) =>
                      r.slug === c.slug ||
                      r.name.toLowerCase() === c.name.toLowerCase(),
                  );
                  return existing ? (
                    <RaceCard
                      key={existing.slug}
                      race={{ ...existing, matchReason: c.matchReason }}
                    />
                  ) : (
                    <article className="panel candidate" key={i}>
                      <span className="eyebrow">RESEARCH CANDIDATE</span>
                      <h2>{c.name}</h2>
                      <p className="location">
                        <Icon name="pin" />
                        {c.city}, {c.country}
                      </p>
                      <p>{c.matchReason}</p>
                      {safeUrl(c.officialUrl) && (
                        <a
                          href={safeUrl(c.officialUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Official website <Icon name="external" size={14} />
                        </a>
                      )}
                      <button
                        className="btn-primary full"
                        disabled={!!adding}
                        onClick={() => add(c)}
                      >
                        {adding === c.name ? "Opening…" : "Open race profile"}
                        <Icon name="arrow" size={16} />
                      </button>
                      <p className="muted small">
                        Creates a shared race profile. Saving and watching
                        remain your choice.
                      </p>
                    </article>
                  );
                })
              : filtered.map((r) => <RaceCard key={r.slug} race={r} />)}
          </div>
          {(candidates?.length === 0 || (!candidates && !filtered.length)) && (
            <div className="empty">
              <Icon name="search" size={28} />
              <h2>No matches yet</h2>
              <p>
                Try another place or ask the researcher to broaden your options.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
