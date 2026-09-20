// Keep in sync with server/src/constants/raceTags.js — Goal tags reuse the
// seeded race vocabulary so a later match pass can join without a new taxonomy.
export const KNOWN_RACE_TAGS = [
  "bq-friendly",
  "world-major",
  "destination",
  "lottery",
  "qualifying-time-required",
  "charity-heavy",
  "high-demand",
  "scenic",
  "historic",
  "downhill",
];

export const SEASONS = ["spring", "summer", "fall", "winter"];

export const COURSE_TYPES = ["flat_fast", "rolling", "hilly", "point_to_point", "loop"];
