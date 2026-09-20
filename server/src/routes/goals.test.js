import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { signToken } from "../middleware/auth.js";
import { createGoalsRouter } from "./goals.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-goal-routes";

function createMemoryGoal() {
  const docs = [];

  function matches(doc, query) {
    return Object.entries(query).every(([key, value]) => String(doc[key]) === String(value));
  }

  return {
    docs,
    async find(query) {
      return docs.filter((doc) => matches(doc, query));
    },
    async findOne(query) {
      return docs.find((doc) => matches(doc, query)) || null;
    },
    async create(data) {
      const now = new Date();
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        userId: data.userId,
        label: data.label,
        tags: data.tags || [],
        constraints: data.constraints,
        status: data.status || "active",
        createdAt: now,
        updatedAt: now,
        async save() {
          this.updatedAt = new Date();
          return this;
        },
        toObject() {
          return {
            _id: this._id,
            userId: this.userId,
            label: this.label,
            tags: this.tags,
            constraints: this.constraints,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
          };
        },
      };
      docs.push(doc);
      return doc;
    },
  };
}

async function withServer(Goal, run) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/goals", createGoalsRouter(Goal));
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ error: err.message || "error" });
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

function authHeaders(userId) {
  return {
    cookie: `bibdrop_session=${signToken(userId)}`,
    "content-type": "application/json",
  };
}

const USER_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const USER_B = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("GET /api/goals", () => {
  it("requires auth", async () => {
    await withServer(createMemoryGoal(), async (base) => {
      const res = await fetch(`${base}/api/goals`);
      assert.equal(res.status, 401);
    });
  });

  it("GET /home requires auth", async () => {
    await withServer(createMemoryGoal(), async (base) => {
      const res = await fetch(`${base}/api/goals/home`);
      assert.equal(res.status, 401);
    });
  });
});

describe("POST /api/goals", () => {
  it("creates a goal for the current user only", async () => {
    const Goal = createMemoryGoal();
    await withServer(Goal, async (base) => {
      const created = await fetch(`${base}/api/goals`, {
        method: "POST",
        headers: authHeaders(USER_A),
        body: JSON.stringify({ label: "BQ attempt 2027", tags: ["bq-friendly"] }),
      });
      assert.equal(created.status, 201);
      const body = await created.json();
      assert.equal(body.label, "BQ attempt 2027");
      assert.equal(body.status, "active");
      assert.deepEqual(body.tags, ["bq-friendly"]);

      const listed = await fetch(`${base}/api/goals`, { headers: authHeaders(USER_A) });
      assert.equal(listed.status, 200);
      const goals = await listed.json();
      assert.equal(goals.length, 1);

      const otherUser = await fetch(`${base}/api/goals`, { headers: authHeaders(USER_B) });
      assert.deepEqual(await otherUser.json(), []);
    });
  });

  it("rejects an empty label", async () => {
    await withServer(createMemoryGoal(), async (base) => {
      const res = await fetch(`${base}/api/goals`, {
        method: "POST",
        headers: authHeaders(USER_A),
        body: JSON.stringify({ label: "   " }),
      });
      assert.equal(res.status, 400);
    });
  });
});

describe("PATCH/DELETE /api/goals/:id ownership", () => {
  it("does not let another user read or mutate a goal", async () => {
    const Goal = createMemoryGoal();
    await withServer(Goal, async (base) => {
      const created = await fetch(`${base}/api/goals`, {
        method: "POST",
        headers: authHeaders(USER_A),
        body: JSON.stringify({ label: "first major", tags: ["world-major"] }),
      });
      const { id } = await created.json();

      const stolenPatch = await fetch(`${base}/api/goals/${id}`, {
        method: "PATCH",
        headers: authHeaders(USER_B),
        body: JSON.stringify({ label: "hijacked" }),
      });
      assert.equal(stolenPatch.status, 404);

      const stolenDelete = await fetch(`${base}/api/goals/${id}`, {
        method: "DELETE",
        headers: authHeaders(USER_B),
      });
      assert.equal(stolenDelete.status, 404);

      const owner = await fetch(`${base}/api/goals`, { headers: authHeaders(USER_A) });
      const goals = await owner.json();
      assert.equal(goals[0].label, "first major");
      assert.equal(goals[0].status, "active");
    });
  });

  it("archives via PATCH and DELETE (soft archive)", async () => {
    const Goal = createMemoryGoal();
    await withServer(Goal, async (base) => {
      const a = await fetch(`${base}/api/goals`, {
        method: "POST",
        headers: authHeaders(USER_A),
        body: JSON.stringify({ label: "keep active", tags: ["bq-friendly"] }),
      });
      const b = await fetch(`${base}/api/goals`, {
        method: "POST",
        headers: authHeaders(USER_A),
        body: JSON.stringify({ label: "archive me", tags: ["destination"] }),
      });
      const archived = await b.json();

      const patched = await fetch(`${base}/api/goals/${archived.id}`, {
        method: "PATCH",
        headers: authHeaders(USER_A),
        body: JSON.stringify({ status: "archived" }),
      });
      assert.equal(patched.status, 200);
      assert.equal((await patched.json()).status, "archived");

      const listed = await fetch(`${base}/api/goals`, { headers: authHeaders(USER_A) });
      const goals = await listed.json();
      assert.deepEqual(
        goals.map((g) => g.label),
        ["keep active", "archive me"]
      );
      assert.equal(goals[1].status, "archived");

      const keep = await a.json();
      const deleted = await fetch(`${base}/api/goals/${keep.id}`, {
        method: "DELETE",
        headers: authHeaders(USER_A),
      });
      assert.equal((await deleted.json()).status, "archived");
    });
  });
});
