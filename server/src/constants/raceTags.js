// Tags used on seeded races (server/src/seed/races.seed.js). Goal.tags
// reuses this vocabulary so a later match/ranking pass can join goals to
// races without a new taxonomy. Creating a goal does not spend Claude.
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
