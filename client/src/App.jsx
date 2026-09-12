import { Routes, Route, Link } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard.jsx";
import { RaceDetail } from "./pages/RaceDetail.jsx";
import { DeadlinesCalendar } from "./pages/DeadlinesCalendar.jsx";
import { Discover } from "./pages/Discover.jsx";

export default function App() {
  return (
    <div>
      <nav style={{ display: "flex", gap: 20, padding: "16px 32px", borderBottom: "1px solid #262626" }}>
        <Link to="/" style={{ fontWeight: 700, textDecoration: "none" }}>BibDrop</Link>
        <Link to="/deadlines" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Deadlines</Link>
        <Link to="/discover" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Discover</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/races/:slug" element={<RaceDetail />} />
        <Route path="/deadlines" element={<DeadlinesCalendar />} />
        <Route path="/discover" element={<Discover />} />
      </Routes>
    </div>
  );
}
