/**
 * Integration tests for nyalazone-pm server
 *
 * Run:  node --test tests/server.test.js
 *
 * Covers:
 *  - Registration, approval, authentication
 *  - 20-employee signup scenario
 *  - Project access control (member vs. manager)
 *  - Task access control and scope filtering
 *  - Timezone storage
 *  - Sharing / visibility
 *  - Edge cases and security checks
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";

// ── Helpers ────────────────────────────────────────────────────────────────

function hashPw(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function uid() {
  return randomBytes(4).toString("hex");
}

function makeUser(overrides = {}) {
  return {
    id: `u_${uid()}`,
    name: "Test User",
    email: `user_${uid()}@test.com`,
    password: hashPw("Password123"),
    role: "member",
    timezone: "UTC",
    teamRole: "",
    products: [],
    status: "active",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

async function req(method, url, body, token) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body != null) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  let json;
  try { json = await res.json(); } catch { json = {}; }
  return { status: res.status, body: json };
}

// ── Global test state ──────────────────────────────────────────────────────

let server;
let base;
let testDataDir;

// Seed users (set up in before())
let mgrUser;
let memberA;
let memberB;
let mgrToken;
let tokenA;
let tokenB;

before(async () => {
  // Create temp data directory and seed DB
  testDataDir = mkdtempSync(join(tmpdir(), "nyala-test-"));
  mgrUser = makeUser({ id: "u_mgr", email: "manager@test.com", password: hashPw("MgrPass123"), role: "manager", name: "Test Manager" });
  memberA = makeUser({ id: "u_memberA", email: "memberA@test.com", password: hashPw("PassA123"), name: "Member A" });
  memberB = makeUser({ id: "u_memberB", email: "memberB@test.com", password: hashPw("PassB123"), name: "Member B" });

  writeFileSync(join(testDataDir, "db.json"), JSON.stringify({ users: [mgrUser, memberA, memberB], projects: [], tasks: [] }, null, 2));

  // Start server with test data dir
  process.env.DATA_DIR = testDataDir;
  process.env.TEST_MODE = "1";

  const { app } = await import("../server/index.js");
  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  base = `http://localhost:${server.address().port}`;

  // Log in all seed users
  const mgrLogin = await req("POST", `${base}/api/auth/login`, { email: mgrUser.email, password: "MgrPass123" });
  assert.equal(mgrLogin.status, 200, `Manager login failed: ${JSON.stringify(mgrLogin.body)}`);
  mgrToken = mgrLogin.body.token;

  const loginA = await req("POST", `${base}/api/auth/login`, { email: memberA.email, password: "PassA123" });
  assert.equal(loginA.status, 200);
  tokenA = loginA.body.token;

  const loginB = await req("POST", `${base}/api/auth/login`, { email: memberB.email, password: "PassB123" });
  assert.equal(loginB.status, 200);
  tokenB = loginB.body.token;
});

after(() => {
  server?.close();
  rmSync(testDataDir, { recursive: true, force: true });
  delete process.env.DATA_DIR;
  delete process.env.TEST_MODE;
});

// ── Helper: register a new user and have manager approve them ──────────────
async function registerAndApprove(email, password, name = "New Member") {
  const reg = await req("POST", `${base}/api/auth/register`, { email, password, name, companyRole: "Frontend Engineer" });
  assert.equal(reg.status, 200, `Register failed: ${JSON.stringify(reg.body)}`);
  assert.equal(reg.body.pending, true, "Registered user should be pending");

  const pending = await req("GET", `${base}/api/users/pending`, null, mgrToken);
  assert.equal(pending.status, 200);
  const user = pending.body.find((u) => u.email === email);
  assert.ok(user, `User ${email} not found in pending list`);

  const approve = await req("POST", `${base}/api/users/${user.id}/approve`, null, mgrToken);
  assert.equal(approve.status, 200);

  const login = await req("POST", `${base}/api/auth/login`, { email, password });
  assert.equal(login.status, 200, `Login after approval failed: ${JSON.stringify(login.body)}`);
  return { id: user.id, token: login.body.token };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: Registration
// ─────────────────────────────────────────────────────────────────────────────

describe("Auth: Registration", () => {
  test("new user registers → status is pending, cannot log in yet", async () => {
    const email = `pending_${uid()}@test.com`;
    const reg = await req("POST", `${base}/api/auth/register`, { email, password: "Valid123", name: "Pending User", companyRole: "HR" });
    assert.equal(reg.status, 200);
    assert.equal(reg.body.pending, true);

    // Pending user cannot log in before approval
    const login = await req("POST", `${base}/api/auth/login`, { email, password: "Valid123" });
    assert.equal(login.status, 401, "Pending user must not be able to log in before approval");
  });

  test("manager approves pending user → user can now log in", async () => {
    const email = `approve_${uid()}@test.com`;
    const { token } = await registerAndApprove(email, "ApproveMe99");
    assert.ok(token, "Token should be returned after approved login");
  });

  test("manager rejects pending user → user is deleted", async () => {
    const email = `reject_${uid()}@test.com`;
    await req("POST", `${base}/api/auth/register`, { email, password: "RejectMe99", name: "Reject Me", companyRole: "HR" });
    const pending = await req("GET", `${base}/api/users/pending`, null, mgrToken);
    const user = pending.body.find((u) => u.email === email);
    assert.ok(user);

    const reject = await req("POST", `${base}/api/users/${user.id}/reject`, null, mgrToken);
    assert.equal(reject.status, 200);

    // User is gone — login should fail
    const login = await req("POST", `${base}/api/auth/login`, { email, password: "RejectMe99" });
    assert.equal(login.status, 401, "Rejected user must not be able to log in");
  });

  test("duplicate email registration is rejected", async () => {
    const email = `dup_${uid()}@test.com`;
    await req("POST", `${base}/api/auth/register`, { email, password: "Pass123", name: "First", companyRole: "HR" });
    const dup = await req("POST", `${base}/api/auth/register`, { email, password: "Pass456", name: "Second", companyRole: "HR" });
    assert.equal(dup.status, 400, "Duplicate email should return 400");
  });

  test("password shorter than 6 characters is rejected", async () => {
    const res = await req("POST", `${base}/api/auth/register`, { email: `short_${uid()}@test.com`, password: "abc", name: "Short", companyRole: "HR" });
    assert.equal(res.status, 400, "Short password should return 400");
  });

  test("wrong password returns 401", async () => {
    const res = await req("POST", `${base}/api/auth/login`, { email: memberA.email, password: "WrongPassword" });
    assert.equal(res.status, 401);
  });

  test("unknown email returns 401", async () => {
    const res = await req("POST", `${base}/api/auth/login`, { email: "nobody@nowhere.com", password: "AnyPassword" });
    assert.equal(res.status, 401);
  });

  test("protected endpoint without token returns 401", async () => {
    const res = await req("GET", `${base}/api/tasks`, null, null);
    assert.equal(res.status, 401);
  });

  test("protected endpoint with invalid token returns 401", async () => {
    const res = await req("GET", `${base}/api/tasks`, null, "fake-token-xyz");
    assert.equal(res.status, 401);
  });

  test("non-manager cannot access /api/users/pending", async () => {
    const res = await req("GET", `${base}/api/users/pending`, null, tokenA);
    assert.equal(res.status, 403);
  });

  test("non-manager cannot approve a user", async () => {
    const email = `nonapprove_${uid()}@test.com`;
    await req("POST", `${base}/api/auth/register`, { email, password: "Pass123", name: "X", companyRole: "HR" });
    const pending = await req("GET", `${base}/api/users/pending`, null, mgrToken);
    const user = pending.body.find((u) => u.email === email);
    const attempt = await req("POST", `${base}/api/users/${user.id}/approve`, null, tokenA);
    assert.equal(attempt.status, 403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH: Timezone
// ─────────────────────────────────────────────────────────────────────────────

describe("Auth: Timezone", () => {
  test("timezone stored in user profile and returned on /api/auth/me", async () => {
    const tz = "Asia/Kolkata";
    const patch = await req("PATCH", `${base}/api/auth/profile`, { timezone: tz }, tokenA);
    assert.equal(patch.status, 200);

    const me = await req("GET", `${base}/api/auth/me`, null, tokenA);
    assert.equal(me.status, 200);
    assert.equal(me.body.timezone, tz, "Timezone should be persisted and returned");
  });

  test("task due dates are stored as UTC ISO strings regardless of user timezone", async () => {
    // Member A (now in Asia/Kolkata) creates a task with an explicit UTC due date
    const dueDate = "2026-06-01T23:59:59.000Z";
    const create = await req("POST", `${base}/api/tasks/parse`, { text: "Test timezone task", dueDate }, tokenA);
    assert.equal(create.status, 201);
    assert.equal(create.body.dueDate, dueDate, "Due date must be stored exactly as provided ISO UTC string");
  });

  test("different-timezone users see the same UTC due date on a shared task", async () => {
    // Member A: Asia/Kolkata, Member B: UTC — both should see the same ISO date
    await req("PATCH", `${base}/api/auth/profile`, { timezone: "Asia/Kolkata" }, tokenA);
    await req("PATCH", `${base}/api/auth/profile`, { timezone: "UTC" }, tokenB);

    const dueDate = "2026-07-15T00:00:00.000Z";
    const task = await req("POST", `${base}/api/tasks/parse`, {
      text: "Shared timezone test",
      dueDate,
      sharedWith: [memberB.id],
    }, tokenA);
    assert.equal(task.status, 201);
    const taskId = task.body.id;

    // Both users should see the same raw UTC date
    const viewA = await req("GET", `${base}/api/tasks/${taskId}`, null, tokenA);
    const viewB = await req("GET", `${base}/api/tasks/${taskId}`, null, tokenB);
    assert.equal(viewA.body.dueDate, dueDate);
    assert.equal(viewB.body.dueDate, dueDate, "Both users should see identical UTC due date");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Projects: Access Control
// ─────────────────────────────────────────────────────────────────────────────

describe("Projects: Access Control", () => {
  test("manager creates a project successfully", async () => {
    const res = await req("POST", `${base}/api/projects`, { title: "Manager Project", memberIds: [] }, mgrToken);
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
  });

  test("project sections are persisted on create and patch", async () => {
    const create = await req("POST", `${base}/api/projects`, {
      title: "Sectioned Project",
      memberIds: [],
      sections: ["Planning", "Development", "Planning", " "],
    }, mgrToken);
    assert.equal(create.status, 201);
    assert.deepEqual(create.body.sections, ["Planning", "Development"]);

    const patch = await req("PATCH", `${base}/api/projects/${create.body.id}`, {
      sections: ["Review", "Launch", "Review"],
    }, mgrToken);
    assert.equal(patch.status, 200);
    assert.deepEqual(patch.body.sections, ["Review", "Launch"]);

    const list = await req("GET", `${base}/api/projects`, null, mgrToken);
    const persisted = list.body.find((project) => project.id === create.body.id);
    assert.deepEqual(persisted.sections, ["Review", "Launch"]);
  });

  test("member CANNOT delete a project they do not own", async () => {
    // Manager creates a project; member A (not owner) tries to delete it
    const proj = await req("POST", `${base}/api/projects`, { title: "Manager Only Project", memberIds: [] }, mgrToken);
    assert.equal(proj.status, 201);

    const del = await req("DELETE", `${base}/api/projects/${proj.body.id}`, null, tokenA);
    assert.equal(del.status, 403, "Non-owner member must get 403 when deleting a manager's project");
  });

  test("member CANNOT update a project they do not own", async () => {
    const proj = await req("POST", `${base}/api/projects`, { title: "Mgr Patch Test", memberIds: [] }, mgrToken);
    const patch = await req("PATCH", `${base}/api/projects/${proj.body.id}`, { title: "Hacked" }, tokenA);
    assert.equal(patch.status, 403);
  });

  test("member (as owner) CAN delete their own project", async () => {
    const proj = await req("POST", `${base}/api/projects`, { title: "My Own Project", memberIds: [] }, tokenA);
    assert.equal(proj.status, 201);

    const del = await req("DELETE", `${base}/api/projects/${proj.body.id}`, null, tokenA);
    assert.equal(del.status, 200);
  });

  test("manager CAN delete any project including member-owned ones", async () => {
    const proj = await req("POST", `${base}/api/projects`, { title: "Member Created", memberIds: [] }, tokenA);
    assert.equal(proj.status, 201);

    const del = await req("DELETE", `${base}/api/projects/${proj.body.id}`, null, mgrToken);
    assert.equal(del.status, 200, "Manager should be able to delete any project");
  });

  test("deleting a project nullifies projectId on its tasks", async () => {
    const proj = await req("POST", `${base}/api/projects`, { title: "Project With Tasks", memberIds: [] }, mgrToken);
    const task = await req("POST", `${base}/api/tasks`, { title: "In-project task", assigneeId: memberA.id, projectId: proj.body.id }, mgrToken);
    assert.equal(task.status, 201);
    assert.equal(task.body.projectId, proj.body.id);

    await req("DELETE", `${base}/api/projects/${proj.body.id}`, null, mgrToken);

    const tasks = await req("GET", `${base}/api/tasks?scope=team`, null, mgrToken);
    const orphaned = tasks.body.find((t) => t.id === task.body.id);
    assert.ok(orphaned, "Task should still exist after project is deleted");
    assert.equal(orphaned.projectId, null, "Task.projectId should be null after project deletion");
  });

  test("deleting a non-existent project returns 404", async () => {
    const res = await req("DELETE", `${base}/api/projects/nonexistent_id`, null, mgrToken);
    assert.equal(res.status, 404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Projects: Visibility
// ─────────────────────────────────────────────────────────────────────────────

describe("Projects: Visibility", () => {
  test("member sees their own project and projects they are a member of", async () => {
    const own = await req("POST", `${base}/api/projects`, { title: "Own Project", memberIds: [] }, tokenA);
    const withA = await req("POST", `${base}/api/projects`, { title: "Includes A", memberIds: [memberA.id] }, mgrToken);

    const list = await req("GET", `${base}/api/projects`, null, tokenA);
    const ids = list.body.map((p) => p.id);
    assert.ok(ids.includes(own.body.id), "Member should see their own project");
    assert.ok(ids.includes(withA.body.id), "Member should see projects where they are a member");
  });

  test("member does NOT see a project they are not a member of", async () => {
    // Create a project with only member B — member A should not see it
    const onlyB = await req("POST", `${base}/api/projects`, { title: "Only B Project", memberIds: [memberB.id] }, mgrToken);

    const list = await req("GET", `${base}/api/projects`, null, tokenA);
    const ids = list.body.map((p) => p.id);
    assert.ok(!ids.includes(onlyB.body.id), "Member A should NOT see a project they are not a member of");
  });

  test("manager sees all projects", async () => {
    const projA = await req("POST", `${base}/api/projects`, { title: "A's Solo Project", memberIds: [] }, tokenA);
    const projB = await req("POST", `${base}/api/projects`, { title: "B's Solo Project", memberIds: [] }, tokenB);

    const list = await req("GET", `${base}/api/projects`, null, mgrToken);
    const ids = list.body.map((p) => p.id);
    assert.ok(ids.includes(projA.body.id));
    assert.ok(ids.includes(projB.body.id));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tasks: Creation & Assignment
// ─────────────────────────────────────────────────────────────────────────────

describe("Tasks: Creation & Assignment", () => {
  test("manager can create a task assigned to a member", async () => {
    const res = await req("POST", `${base}/api/tasks`, { title: "Mgr-assigned task", assigneeId: memberA.id }, mgrToken);
    assert.equal(res.status, 201);
    assert.equal(res.body.assigneeId, memberA.id);
  });

  test("non-manager CANNOT use POST /api/tasks (manager-only endpoint)", async () => {
    const res = await req("POST", `${base}/api/tasks`, { title: "Sneaky task", assigneeId: memberB.id }, tokenA);
    assert.equal(res.status, 403);
  });

  test("member can create their own task via /api/tasks/parse (self-assigned)", async () => {
    const res = await req("POST", `${base}/api/tasks/parse`, { text: "Finish the report" }, tokenA);
    assert.equal(res.status, 201);
    assert.equal(res.body.assigneeId, memberA.id, "Parse endpoint must assign task to the calling user");
  });

  test("assigning to a non-existent user via parse is silently ignored (assigns to self)", async () => {
    const res = await req("POST", `${base}/api/tasks/parse`, { text: "Task for ghost", assigneeId: "u_ghost_doesnt_exist" }, tokenA);
    assert.equal(res.status, 201);
    // Parse always self-assigns, ignoring assigneeId from body
    assert.equal(res.body.assigneeId, memberA.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tasks: Access Control
// ─────────────────────────────────────────────────────────────────────────────

describe("Tasks: Access Control", () => {
  let taskForA; // created by manager, assigned to A

  before(async () => {
    const res = await req("POST", `${base}/api/tasks`, { title: "Task for A only", assigneeId: memberA.id }, mgrToken);
    taskForA = res.body;
  });

  test("assignee (A) can edit their own task", async () => {
    const res = await req("PATCH", `${base}/api/tasks/${taskForA.id}`, { title: "A edits this" }, tokenA);
    assert.equal(res.status, 200);
  });

  test("unrelated member (B) CANNOT edit another member's task", async () => {
    const res = await req("PATCH", `${base}/api/tasks/${taskForA.id}`, { title: "B hacks this" }, tokenB);
    assert.equal(res.status, 403);
  });

  test("unrelated member (B) CANNOT delete another member's task", async () => {
    const res = await req("DELETE", `${base}/api/tasks/${taskForA.id}`, null, tokenB);
    assert.equal(res.status, 403);
  });

  test("manager CAN edit any task", async () => {
    const res = await req("PATCH", `${base}/api/tasks/${taskForA.id}`, { title: "Manager edits" }, mgrToken);
    assert.equal(res.status, 200);
  });

  test("unrelated member (B) CANNOT view another member's task directly", async () => {
    const res = await req("GET", `${base}/api/tasks/${taskForA.id}`, null, tokenB);
    assert.equal(res.status, 403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tasks: Scope Filtering (security)
// ─────────────────────────────────────────────────────────────────────────────

describe("Tasks: Scope Filtering", () => {
  test("member requesting ?scope=team only gets their own tasks (not team-wide)", async () => {
    // Create a task for B (by manager), then A requests scope=team
    const taskForB = await req("POST", `${base}/api/tasks`, { title: "Only B can see this", assigneeId: memberB.id }, mgrToken);
    assert.equal(taskForB.status, 201);

    const res = await req("GET", `${base}/api/tasks?scope=team&status=outstanding`, null, tokenA);
    assert.equal(res.status, 200);
    const ids = res.body.map((t) => t.id);
    assert.ok(!ids.includes(taskForB.body.id), "Member A must NOT see Member B's task even with scope=team");
  });

  test("manager requesting ?scope=team sees all tasks", async () => {
    const taskForA2 = await req("POST", `${base}/api/tasks`, { title: "Scope team test A", assigneeId: memberA.id }, mgrToken);
    const taskForB2 = await req("POST", `${base}/api/tasks`, { title: "Scope team test B", assigneeId: memberB.id }, mgrToken);

    const res = await req("GET", `${base}/api/tasks?scope=team&status=outstanding`, null, mgrToken);
    assert.equal(res.status, 200);
    const ids = res.body.map((t) => t.id);
    assert.ok(ids.includes(taskForA2.body.id), "Manager should see A's tasks");
    assert.ok(ids.includes(taskForB2.body.id), "Manager should see B's tasks");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tasks: Sharing
// ─────────────────────────────────────────────────────────────────────────────

describe("Tasks: Sharing", () => {
  test("task shared with B is visible to B", async () => {
    const task = await req("POST", `${base}/api/tasks/parse`, { text: "Shared with B", sharedWith: [memberB.id] }, tokenA);
    assert.equal(task.status, 201);

    const view = await req("GET", `${base}/api/tasks/${task.body.id}`, null, tokenB);
    assert.equal(view.status, 200, "Shared member should be able to view the task");
  });

  test("task shared with B is editable by B", async () => {
    const task = await req("POST", `${base}/api/tasks/parse`, { text: "B can edit this", sharedWith: [memberB.id] }, tokenA);

    const edit = await req("PATCH", `${base}/api/tasks/${task.body.id}`, { title: "B edited it" }, tokenB);
    assert.equal(edit.status, 200, "Shared member should be able to edit the task");
  });

  test("unshared task is NOT visible to unrelated user", async () => {
    const task = await req("POST", `${base}/api/tasks/parse`, { text: "Private to A" }, tokenA);

    const view = await req("GET", `${base}/api/tasks/${task.body.id}`, null, tokenB);
    assert.equal(view.status, 403, "Unshared task must not be visible to other members");
  });

  test("shared task appears in both users' task list", async () => {
    const task = await req("POST", `${base}/api/tasks/parse`, { text: "Show up for both", sharedWith: [memberB.id] }, tokenA);

    const listA = await req("GET", `${base}/api/tasks?scope=mine&status=outstanding`, null, tokenA);
    const listB = await req("GET", `${base}/api/tasks?scope=mine&status=outstanding`, null, tokenB);

    const idsA = listA.body.map((t) => t.id);
    const idsB = listB.body.map((t) => t.id);
    assert.ok(idsA.includes(task.body.id), "Task should appear in A's list (creator)");
    assert.ok(idsB.includes(task.body.id), "Task should appear in B's list (shared)");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tasks: Soft Delete & Restore
// ─────────────────────────────────────────────────────────────────────────────

describe("Tasks: Soft Delete & Restore", () => {
  test("soft-deleting a task removes it from active list", async () => {
    const task = await req("POST", `${base}/api/tasks/parse`, { text: "To be deleted" }, tokenA);
    const taskId = task.body.id;

    await req("DELETE", `${base}/api/tasks/${taskId}`, null, tokenA);

    const list = await req("GET", `${base}/api/tasks?scope=mine&status=outstanding`, null, tokenA);
    const ids = list.body.map((t) => t.id);
    assert.ok(!ids.includes(taskId), "Soft-deleted task should not appear in active list");
  });

  test("soft-deleted task appears in deleted list", async () => {
    const task = await req("POST", `${base}/api/tasks/parse`, { text: "Check deleted list" }, tokenA);
    await req("DELETE", `${base}/api/tasks/${task.body.id}`, null, tokenA);

    const deleted = await req("GET", `${base}/api/tasks/deleted`, null, tokenA);
    const ids = deleted.body.map((t) => t.id);
    assert.ok(ids.includes(task.body.id), "Deleted task should appear in deleted list");
  });

  test("restoring a task brings it back to active list", async () => {
    const task = await req("POST", `${base}/api/tasks/parse`, { text: "Restore me" }, tokenA);
    await req("DELETE", `${base}/api/tasks/${task.body.id}`, null, tokenA);
    await req("PATCH", `${base}/api/tasks/${task.body.id}/restore`, null, tokenA);

    const list = await req("GET", `${base}/api/tasks?scope=mine&status=outstanding`, null, tokenA);
    const ids = list.body.map((t) => t.id);
    assert.ok(ids.includes(task.body.id), "Restored task should appear back in active list");
  });

  test("unrelated member (B) cannot delete A's task", async () => {
    const task = await req("POST", `${base}/api/tasks/parse`, { text: "B should not delete this" }, tokenA);
    const del = await req("DELETE", `${base}/api/tasks/${task.body.id}`, null, tokenB);
    assert.equal(del.status, 403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 20-Employee Signup Scenario
// ─────────────────────────────────────────────────────────────────────────────

describe("20-Employee Signup", () => {
  test("20 employees can register sequentially (all arrive pending)", async () => {
    const employees = Array.from({ length: 20 }, (_, i) => ({
      email: `emp${i}_${uid()}@company.com`,
      password: "EmpPass123",
      name: `Employee ${i + 1}`,
    }));

    for (const emp of employees) {
      const reg = await req("POST", `${base}/api/auth/register`, { ...emp, companyRole: "Frontend Engineer" });
      assert.equal(reg.status, 200, `Registration failed for ${emp.email}: ${JSON.stringify(reg.body)}`);
      assert.equal(reg.body.pending, true);
    }

    const pending = await req("GET", `${base}/api/users/pending`, null, mgrToken);
    const pendingEmails = pending.body.map((u) => u.email);
    for (const emp of employees) {
      assert.ok(pendingEmails.includes(emp.email), `${emp.email} should be in pending list`);
    }
  });

  test("manager can approve all 20 and they can all log in", async () => {
    const employees = Array.from({ length: 20 }, (_, i) => ({
      email: `batch_${uid()}_${i}@company.com`,
      password: "BatchPass99",
    }));

    // Register all
    for (const emp of employees) {
      await req("POST", `${base}/api/auth/register`, { ...emp, name: "Batch User", companyRole: "HR" });
    }

    // Approve all
    const pending = await req("GET", `${base}/api/users/pending`, null, mgrToken);
    const toApprove = pending.body.filter((u) => employees.some((e) => e.email === u.email));
    for (const user of toApprove) {
      const r = await req("POST", `${base}/api/users/${user.id}/approve`, null, mgrToken);
      assert.equal(r.status, 200, `Approval failed for user ${user.id}`);
    }

    // All 20 can now log in
    for (const emp of employees) {
      const login = await req("POST", `${base}/api/auth/login`, { email: emp.email, password: emp.password });
      assert.equal(login.status, 200, `Login failed for ${emp.email} after approval`);
      assert.ok(login.body.token, "Token should be returned");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

describe("Edge Cases", () => {
  test("creating a project without a title returns 400", async () => {
    const res = await req("POST", `${base}/api/projects`, { title: "", memberIds: [] }, mgrToken);
    assert.equal(res.status, 400, "Empty project title should be rejected");
  });

  test("accessing a non-existent task returns 404", async () => {
    const res = await req("GET", `${base}/api/tasks/t_doesnotexist_xyz`, null, mgrToken);
    assert.equal(res.status, 404);
  });

  test("accessing a non-existent project returns 404 on patch/delete", async () => {
    const patch = await req("PATCH", `${base}/api/projects/p_ghost`, { title: "x" }, mgrToken);
    assert.equal(patch.status, 404);

    const del = await req("DELETE", `${base}/api/projects/p_ghost`, null, mgrToken);
    assert.equal(del.status, 404);
  });

  test("task status can only be a valid value", async () => {
    const task = await req("POST", `${base}/api/tasks/parse`, { text: "Status test task" }, tokenA);
    const res = await req("PATCH", `${base}/api/tasks/${task.body.id}`, { status: "flying" }, tokenA);
    // Status should either be rejected (400) or silently ignored (200 with no change)
    if (res.status === 200) {
      assert.ok(["todo", "in_progress", "done"].includes(res.body.status), "Invalid status must be ignored, not persisted");
    } else {
      assert.equal(res.status, 400);
    }
  });

  test("manager cannot be created via public registration (all registrations are member-only)", async () => {
    const email = `sneak_mgr_${uid()}@test.com`;
    // Even if a role field is sent, register endpoint hardcodes role="member"
    const reg = await req("POST", `${base}/api/auth/register`, { email, password: "Valid123", name: "Sneaky Mgr", companyRole: "Manager", role: "manager" });
    assert.equal(reg.status, 200);

    const pending = await req("GET", `${base}/api/users/pending`, null, mgrToken);
    const user = pending.body.find((u) => u.email === email);
    assert.ok(user);
    assert.equal(user.role, "member", "Public registration must always create a member, not a manager");
  });

  test("sessions are invalidated on logout", async () => {
    const { token } = await registerAndApprove(`logout_${uid()}@test.com`, "LogoutPass1");

    // Token works before logout
    const before = await req("GET", `${base}/api/auth/me`, null, token);
    assert.equal(before.status, 200);

    await req("POST", `${base}/api/auth/logout`, null, token);

    // Token is invalid after logout
    const after = await req("GET", `${base}/api/auth/me`, null, token);
    assert.equal(after.status, 401, "Token should be invalidated after logout");
  });

  test("change password — old password no longer works", async () => {
    const { token } = await registerAndApprove(`pwchange_${uid()}@test.com`, "OldPass123");

    await req("PATCH", `${base}/api/auth/change-password`, { currentPassword: "OldPass123", newPassword: "NewPass456" }, token);

    // Re-login with old password should fail
    const stale = await req("POST", `${base}/api/auth/login`, { email: `pwchange_${uid()}@test.com`, password: "OldPass123" });
    assert.equal(stale.status, 401);
  });
});
