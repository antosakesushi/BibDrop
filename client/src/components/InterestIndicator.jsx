import { StarIcon, BellIcon } from "./Icons.jsx";

const CONFIG = {
  interested: { icon: StarIcon, color: "#AFA9EC", label: "Interested" },
  watching: { icon: BellIcon, color: "#F0997B", label: "Watching for deadlines" },
};

// Deliberately styled as an icon + muted text, not a colored pill like
// ConfidenceTag - this is a personal choice you made, not something the
// agent found, and it should not visually compete with agent-generated
// badges for attention.
export function InterestIndicator({ stage, compact = false }) {
  if (stage === "none" || !CONFIG[stage]) return null;
  const { icon: Icon, color, label } = CONFIG[stage];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color, fontSize: 12 }}>
      <Icon size={13} color={color} />
      {!compact && label}
    </span>
  );
}
