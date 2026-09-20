export function parseInviteCodes(raw = process.env.INVITE_CODES) {
  return String(raw || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}

export function isInviteRequired({
  softLaunch = process.env.SOFT_LAUNCH,
  codes = parseInviteCodes(),
} = {}) {
  return softLaunch === "true" || codes.length > 0;
}

export function isValidInviteCode(code, { codes = parseInviteCodes(), required = isInviteRequired() } = {}) {
  if (!required) return true;
  if (!codes.length) return false;
  const normalized = String(code || "").trim();
  return codes.includes(normalized);
}

export function inviteErrorMessage() {
  return "This hosted pilot requires a valid invite code.";
}
