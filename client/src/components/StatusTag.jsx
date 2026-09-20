const VARIANT_BY_CONFIDENCE = {
  not_yet_researched: { label: "NOT YET RESEARCHED", className: "status-tag--following" },
  low: { label: "LOW CONFIDENCE", className: "status-tag--warning" },
  medium: { label: "MEDIUM CONFIDENCE", className: "status-tag--warning" },
  high: { label: "HIGH CONFIDENCE", className: "status-tag--tracking" },
};

export function ConfidenceTag({ confidence }) {
  const variant = VARIANT_BY_CONFIDENCE[confidence] || VARIANT_BY_CONFIDENCE.not_yet_researched;
  return <span className={`status-tag ${variant.className}`}>{variant.label}</span>;
}
