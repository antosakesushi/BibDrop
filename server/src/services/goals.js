import { COURSE_TYPES, KNOWN_RACE_TAGS, SEASONS } from "../constants/raceTags.js";

const LABEL_MAX = 80;
const REGION_MAX = 80;

export function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export function serializeGoal(goal) {
  const obj = typeof goal.toObject === "function" ? goal.toObject() : goal;
  return {
    id: String(obj._id),
    label: obj.label,
    tags: obj.tags || [],
    constraints: obj.constraints || null,
    status: obj.status,
    createdAt: obj.createdAt || null,
    updatedAt: obj.updatedAt || null,
  };
}

export function sortGoals(goals) {
  return [...goals].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function normalizeTags(tags) {
  if (tags === undefined) return undefined;
  if (!Array.isArray(tags)) {
    throw httpError(400, "tags must be an array of known race tags.");
  }
  const unique = [];
  for (const tag of tags) {
    if (typeof tag !== "string" || !KNOWN_RACE_TAGS.includes(tag)) {
      throw httpError(400, `Unknown tag "${tag}". Use race tags such as bq-friendly or world-major.`);
    }
    if (!unique.includes(tag)) unique.push(tag);
  }
  return unique;
}

function normalizeConstraints(constraints) {
  if (constraints === undefined) return undefined;
  if (constraints === null) return null;
  if (typeof constraints !== "object" || Array.isArray(constraints)) {
    throw httpError(400, "constraints must be an object with season, region, and/or courseType.");
  }

  const allowed = new Set(["season", "region", "courseType"]);
  for (const key of Object.keys(constraints)) {
    if (!allowed.has(key)) {
      throw httpError(400, `Unknown constraint "${key}".`);
    }
  }

  const next = {};
  if (constraints.season !== undefined && constraints.season !== "") {
    if (!SEASONS.includes(constraints.season)) {
      throw httpError(400, "constraints.season must be spring, summer, fall, or winter.");
    }
    next.season = constraints.season;
  }
  if (constraints.courseType !== undefined && constraints.courseType !== "") {
    if (!COURSE_TYPES.includes(constraints.courseType)) {
      throw httpError(400, "constraints.courseType is not a known course type.");
    }
    next.courseType = constraints.courseType;
  }
  if (constraints.region !== undefined && constraints.region !== "") {
    if (typeof constraints.region !== "string") {
      throw httpError(400, "constraints.region must be a string.");
    }
    const region = constraints.region.trim();
    if (region.length > REGION_MAX) {
      throw httpError(400, `constraints.region must be ${REGION_MAX} characters or fewer.`);
    }
    if (region) next.region = region;
  }

  return Object.keys(next).length ? next : null;
}

/**
 * Validates create/update bodies. Goal writes never call Claude — this is
 * just structured preference data for a later ranking pass.
 */
export function normalizeGoalInput(body, { partial = false } = {}) {
  if (!body || typeof body !== "object") {
    throw httpError(400, "Request body must be a JSON object.");
  }

  const patch = {};

  if (!partial || body.label !== undefined) {
    if (typeof body.label !== "string" || !body.label.trim()) {
      throw httpError(400, "label is required.");
    }
    const label = body.label.trim();
    if (label.length > LABEL_MAX) {
      throw httpError(400, `label must be ${LABEL_MAX} characters or fewer.`);
    }
    patch.label = label;
  }

  if (!partial || body.tags !== undefined) {
    const tags = normalizeTags(partial ? body.tags : body.tags || []);
    if (tags !== undefined) patch.tags = tags;
  }

  if (!partial || body.constraints !== undefined) {
    const constraints = normalizeConstraints(partial ? body.constraints : body.constraints ?? null);
    if (constraints !== undefined) patch.constraints = constraints;
  }

  if (body.status !== undefined) {
    if (!["active", "archived"].includes(body.status)) {
      throw httpError(400, "status must be active or archived.");
    }
    patch.status = body.status;
  } else if (!partial) {
    patch.status = "active";
  }

  return patch;
}

export function isOwnedBy(goal, userId) {
  if (!goal || !userId) return false;
  return String(goal.userId) === String(userId);
}
