export function validateDiscoveryInput(body = {}) {
  if (
    typeof body.criteria !== "string" ||
    !body.criteria.trim() ||
    body.criteria.length > 600
  )
    return "Enter a race question of 1–600 characters.";
  const messages = body.messages ?? [];
  if (
    !Array.isArray(messages) ||
    messages.length > 10 ||
    messages.some(
      (m) =>
        !m ||
        !["user", "assistant"].includes(m.role) ||
        typeof m.content !== "string" ||
        m.content.length > 6000,
    )
  )
    return "Conversation history is invalid or too long. Start a new chat.";
  return null;
}
export function safeHttpUrl(value) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
