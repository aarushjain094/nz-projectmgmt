import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const dataDir = process.env.DATA_DIR || path.join(rootDir, "data");
const dbPath = path.join(dataDir, "db.json");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(publicDir));

ensureDataFiles();
migratePasswords();

// Purge tasks soft-deleted more than 7 days ago
function purgeOldDeletedTasks() {
  try {
    const db = readDb();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const before = db.tasks.length;
    db.tasks = db.tasks.filter((t) => !t.deletedAt || new Date(t.deletedAt) > cutoff);
    if (db.tasks.length !== before) saveDb(db);
  } catch { /* ignore */ }
}

purgeOldDeletedTasks();
const deletedTaskPurgeInterval = setInterval(purgeOldDeletedTasks, 60 * 60 * 1000);
deletedTaskPurgeInterval.unref();

const sessions = new Map();

function invalidateSessionsForUser(userId, exceptToken = null) {
  if (!userId) return;
  for (const [token, sessionUserId] of sessions.entries()) {
    if (sessionUserId === userId && token !== exceptToken) {
      sessions.delete(token);
    }
  }
}

// Simple in-memory rate limiter for auth endpoints
const authAttempts = new Map();
function rateLimit(req, res, next) {
  if (process.env.TEST_MODE) return next();
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const now = Date.now();
  const entry = authAttempts.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000; }
  entry.count += 1;
  authAttempts.set(ip, entry);
  if (entry.count > 20) {
    return res.status(429).json({ error: "Too many requests. Try again in a minute." });
  }
  next();
}

function normalizeDb(db) {
  db.users = Array.isArray(db.users) ? db.users : [];
  db.tasks = Array.isArray(db.tasks) ? db.tasks : [];
  db.projects = Array.isArray(db.projects) ? db.projects : [];

  for (const user of db.users) {
    user.teamRole = typeof user.teamRole === "string" ? user.teamRole : "";
    user.products = Array.isArray(user.products) ? user.products : [];
    user.status = user.status === "pending" ? "pending" : "active";
  }

  for (const project of db.projects) {
    project.description = project.description || "";
    project.scope = project.scope === "team" ? "team" : "personal";
    project.memberIds = Array.isArray(project.memberIds) ? project.memberIds : [];
    project.deadline = typeof project.deadline === "string" ? project.deadline : null;
    project.sections = sanitizeProjectSections(project.sections);
  }

  for (const task of db.tasks) {
    task.sharedWith = Array.isArray(task.sharedWith) ? task.sharedWith : [];
    task.projectId = typeof task.projectId === "string" ? task.projectId : null;
    task.dependsOn = Array.isArray(task.dependsOn) ? task.dependsOn.filter((id) => typeof id === "string") : [];
    task.deletedAt = task.deletedAt || null;
  }

  return db;
}

function sanitizeProjectSections(sections) {
  if (!Array.isArray(sections)) return [];
  return [...new Set(
    sections
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
      .slice(0, 50)
  )];
}

function taskAccessibleTo(task, user, scope = "view") {
  if (!user) return false;
  if (task.assigneeId === user.id || task.createdBy === user.id) return true;
  if (Array.isArray(task.sharedWith) && task.sharedWith.includes(user.id)) {
    return scope === "view" || scope === "edit";
  }
  return false;
}

function projectAccessibleTo(project, user) {
  if (!user || !project) return false;
  if (user.role === "manager") return true;
  return project.ownerId === user.id || project.memberIds.includes(user.id);
}

function projectManageableBy(project, user) {
  if (!user || !project) return false;
  if (user.role === "manager") return true;
  return project.ownerId === user.id;
}

function enrichTask(task, db) {
  const scored = withPriority(task);
  const project = task.projectId ? db.projects.find((p) => p.id === task.projectId) : null;
  return {
    ...scored,
    assigneeName: db.users.find((u) => u.id === task.assigneeId)?.name ?? "Unknown",
    projectName: project?.title ?? null,
    projectClient: project?.client ?? null,
  };
}

app.post("/api/auth/login", rateLimit, (req, res) => {
  const { email, password } = req.body ?? {};
  const db = readDb();
  const user = db.users.find((u) => u.email === email && verifyPassword(password, u.password));
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.status === "pending") {
    return res.status(403).json({ error: "Your account is pending manager approval." });
  }

  const token = crypto.randomUUID();
  sessions.set(token, user.id);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      timezone: user.timezone,
    },
  });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    timezone: user.timezone,
    teamRole: user.teamRole || "",
    products: Array.isArray(user.products) ? user.products : [],
  });
});

app.get("/api/users/pending", requireAuth, requireManager, (req, res) => {
  const db = readDb();
  const pending = db.users
    .filter(u => u.status === "pending")
    .map(u => ({ id: u.id, name: u.name, email: u.email, teamRole: u.teamRole || "", createdAt: u.createdAt }));
  res.json(pending);
});

app.get("/api/users", requireAuth, (_req, res) => {
  const db = readDb();
  res.json(db.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    teamRole: u.teamRole || "",
    products: Array.isArray(u.products) ? u.products : [],
  })));
});

app.patch("/api/users/:id", requireAuth, requireManager, (req, res) => {
  const db = readDb();
  const user = db.users.find((entry) => entry.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { teamRole, products, role } = req.body ?? {};
  if (typeof teamRole === "string") {
    user.teamRole = teamRole.trim().slice(0, 80);
  }
  if (role === "manager" || role === "member") {
    user.role = role;
  }
  if (Array.isArray(products)) {
    user.products = products
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  saveDb(db);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    teamRole: user.teamRole || "",
    products: Array.isArray(user.products) ? user.products : [],
  });
});

// ── Register (self-signup) ────────────────────────────
app.post("/api/auth/register", rateLimit, (req, res) => {
  const { name, email, password, companyRole } = req.body ?? {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const db = readDb();
  if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }
  const validRoles = ["Frontend Engineer", "Backend Engineer", "Manager", "HR", "Operations"];
  const user = {
    id: crypto.randomUUID(),
    name: String(name).trim().slice(0, 80),
    email: String(email).trim().toLowerCase(),
    password: hashPassword(password),
    role: "member",
    timezone: "UTC",
    teamRole: validRoles.includes(companyRole) ? companyRole : "",
    products: [],
    createdAt: new Date().toISOString(),
  };
  user.status = "pending";
  db.users.push(user);
  saveDb(db);
  notifyManagersOfPendingSignup(user, db);
  res.status(201).json({ pending: true });
});

// ── Manager: create team member ───────────────────────
app.post("/api/users", requireAuth, requireManager, (req, res) => {
  const { name, email, role = "member", teamRole = "", tempPassword } = req.body ?? {};
  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }
  const db = readDb();
  if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }
  const password = tempPassword && typeof tempPassword === "string" && tempPassword.length >= 6
    ? tempPassword
    : crypto.randomBytes(5).toString("hex");

  const user = {
    id: crypto.randomUUID(),
    name: String(name).trim().slice(0, 80),
    email: String(email).trim().toLowerCase(),
    password: hashPassword(password),
    role: ["manager", "member"].includes(role) ? role : "member",
    timezone: "UTC",
    teamRole: typeof teamRole === "string" ? teamRole.trim().slice(0, 80) : "",
    products: [],
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  saveDb(db);

  // Send invite email if SMTP configured
  const transport = createTransporter();
  if (transport) {
    transport.sendMail({
      from: process.env.SMTP_FROM || "nyalazone-tool@internal.local",
      to: user.email,
      subject: "[Nyalazone] You've been invited",
      text: `Hi ${user.name},\n\nYou've been added to Nyalazone Project Tracker.\n\nEmail: ${user.email}\nTemp password: ${password}\n\nPlease log in and change your password.\n`,
    }).catch((err) => console.error("Invite email failed:", err?.message));
  } else {
    console.log(`[INVITE] New user ${user.email} — temp password: ${password}`);
  }

  res.status(201).json({
    id: user.id, name: user.name, email: user.email,
    role: user.role, teamRole: user.teamRole, products: user.products,
    tempPassword: transport ? undefined : password,
  });
});

// ── Delete team member (manager only) ────────────────
app.delete("/api/users/:id", requireAuth, requireManager, (req, res) => {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "User not found" });
  if (db.users[idx].id === req.userId) return res.status(400).json({ error: "Cannot delete yourself" });
  db.users.splice(idx, 1);
  saveDb(db);
  res.json({ ok: true });
});

app.post("/api/users/:id/approve", requireAuth, requireManager, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.status = "active";
  saveDb(db);
  res.json({ ok: true });
});

app.post("/api/users/:id/reject", requireAuth, requireManager, (req, res) => {
  const db = readDb();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "User not found" });
  db.users.splice(idx, 1);
  saveDb(db);
  res.json({ ok: true });
});

// ── Forgot password ───────────────────────────────────
app.post("/api/auth/forgot-password", rateLimit, (req, res) => {
  const { email } = req.body ?? {};
  // Always return 200 to avoid email enumeration
  res.json({ ok: true });
  if (!email) return;
  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = token;
  user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  saveDb(db);

  const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/?reset=${token}`;
  const transport = createTransporter();
  if (transport) {
    transport.sendMail({
      from: process.env.SMTP_FROM || "nyalazone-tool@internal.local",
      to: user.email,
      subject: "[Nyalazone] Reset your password",
      text: `Hi ${user.name},\n\nClick the link below to reset your password (valid for 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.\n`,
    }).catch((err) => console.error("Reset email failed:", err?.message));
  } else {
    console.log(`[PASSWORD RESET] Token for ${user.email}: ${resetUrl}`);
  }
});

// ── Reset password (via token) ────────────────────────
app.post("/api/auth/reset-password", (req, res) => {
  const { token, password } = req.body ?? {};
  if (!token || !password) return res.status(400).json({ error: "token and password are required" });
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const db = readDb();
  const user = db.users.find((u) => u.passwordResetToken === token);
  if (!user || !user.passwordResetExpiry || new Date(user.passwordResetExpiry) < new Date()) {
    return res.status(400).json({ error: "Reset link is invalid or has expired" });
  }
  user.password = hashPassword(password);
  user.passwordResetToken = null;
  user.passwordResetExpiry = null;
  invalidateSessionsForUser(user.id);
  saveDb(db);
  res.json({ ok: true });
});

// ── Change password (authenticated) ──────────────────
app.patch("/api/auth/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  if (!user || !verifyPassword(currentPassword, user.password)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  user.password = hashPassword(newPassword);
  invalidateSessionsForUser(user.id);
  saveDb(db);
  res.json({ ok: true });
});

// ── Update own profile (timezone) ─────────────────────
app.patch("/api/auth/profile", requireAuth, (req, res) => {
  const { timezone } = req.body ?? {};
  if (!timezone || typeof timezone !== "string" || !timezone.trim() || timezone.trim().length > 60) {
    return res.status(400).json({ error: "timezone must be a non-empty string (max 60 chars)" });
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.timezone = timezone.trim();
  saveDb(db);
  res.json({ ok: true, timezone: user.timezone });
});

app.get("/api/projects", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const visibleProjects = db.projects
    .filter((project) => projectAccessibleTo(project, user))
    .map((project) => {
      const tasks = db.tasks.filter((task) => task.projectId === project.id && !task.deletedAt);
      const completedTasks = tasks.filter((task) => task.status === "done").length;
      const outstandingTasks = tasks.filter((task) => task.status !== "done").length;
      return {
        ...project,
        canManage: projectManageableBy(project, user),
        memberNames: project.memberIds
          .map((id) => db.users.find((u) => u.id === id)?.name)
          .filter(Boolean),
        taskCount: tasks.length,
        outstandingTaskCount: outstandingTasks,
        completedTaskCount: completedTasks,
      };
    })
    .sort((a, b) => compareDateSafe(a.deadline, b.deadline) || a.title.localeCompare(b.title));

  res.json(visibleProjects);
});

app.post("/api/projects", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const {
    title,
    description = "",
    deadline = null,
    memberIds = [],
    product = null,
    client = null,
    sections = [],
  } = req.body ?? {};

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  const validMembers = Array.isArray(memberIds)
    ? memberIds.filter((id) => id !== user.id && db.users.some((u) => u.id === id))
    : [];

  const project = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: typeof description === "string" ? description.trim() : "",
    ownerId: req.userId,
    scope: "project",
    memberIds: validMembers,
    deadline: typeof deadline === "string" ? deadline : null,
    product: typeof product === "string" ? product || null : null,
    client: typeof client === "string" ? client.trim() || null : null,
    sections: sanitizeProjectSections(sections),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.projects.push(project);
  saveDb(db);
  res.status(201).json(project);
});

app.patch("/api/projects/:id", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const project = db.projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!projectManageableBy(project, user)) return res.status(403).json({ error: "Not authorized" });

  const { title, description, deadline, memberIds, product, client, sections } = req.body ?? {};
  if (typeof title === "string" && title.trim()) project.title = title.trim();
  if (typeof description === "string") project.description = description.trim();
  if (deadline !== undefined) project.deadline = typeof deadline === "string" && deadline ? deadline : null;
  if (Array.isArray(memberIds)) {
    project.memberIds = memberIds.filter((id) => id !== user.id && db.users.some((u) => u.id === id));
  }
  if (product !== undefined) project.product = typeof product === "string" ? product || null : null;
  if (client !== undefined) project.client = typeof client === "string" ? client.trim() || null : null;
  if (sections !== undefined) project.sections = sanitizeProjectSections(sections);
  project.updatedAt = new Date().toISOString();

  saveDb(db);
  res.json(project);
});

app.delete("/api/projects/:id", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const idx = db.projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Project not found" });
  if (!projectManageableBy(db.projects[idx], user)) return res.status(403).json({ error: "Not authorized" });
  db.projects.splice(idx, 1);
  db.tasks.forEach((t) => { if (t.projectId === req.params.id) t.projectId = null; });
  saveDb(db);
  res.json({ ok: true });
});

app.post("/api/tasks/parse", requireAuth, (req, res) => {
  const { text } = req.body ?? {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text is required" });
  }

  const db = readDb();
  const currentUser = db.users.find((u) => u.id === req.userId);
  const {
    department = null,
    product = null,
    manualPriority: explicitPriority,
    dueDate: explicitDue,
    startDate: explicitStart,
    status: explicitStatus,
    sharedWith,
    projectId = null,
    dependsOn = [],
    description = "",
  } = req.body ?? {};
  const parsed = parseNaturalLanguageTask(text, currentUser?.timezone || "UTC");
  const nowIso = new Date().toISOString();
  const project = projectId ? db.projects.find((p) => p.id === projectId) : null;
  if (projectId && !projectAccessibleTo(project, currentUser)) {
    return res.status(403).json({ error: "Project not accessible" });
  }

  const resolvedStartDate = explicitStart || parsed.startDateIso;
  const resolvedDueDate = explicitDue || parsed.dueDateIso;

  const task = {
    id: crypto.randomUUID(),
    title: parsed.title,
    description: typeof description === "string" ? description : "",
    assigneeId: req.userId,
    createdBy: req.userId,
    dueDate: resolvedDueDate,
    startDate: resolvedStartDate,
    status: ["todo", "in_progress"].includes(explicitStatus) ? explicitStatus : "todo",
    manualPriority: ["low", "medium", "high"].includes(explicitPriority) ? explicitPriority : null,
    department: department || null,
    product: product || null,
    sharedWith: Array.isArray(sharedWith) ? sharedWith.filter((id) => db.users.some((u) => u.id === id)) : [],
    projectId: project?.id ?? null,
    section: typeof req.body?.section === "string" && req.body.section.trim() ? req.body.section.trim() : null,
    dependsOn: Array.isArray(dependsOn) ? dependsOn.filter((id) => db.tasks.some((task) => task.id === id)) : [],
    createdAt: nowIso,
    updatedAt: nowIso,
    completedAt: null,
    reminderHistory: [],
    phases: generateDefaultPhases(resolvedStartDate, resolvedDueDate),
  };

  db.tasks.push(task);
  saveDb(db);

  res.status(201).json(enrichTask(task, db));
});

app.get("/api/tasks", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const scope = req.query.scope === "team" && user?.role === "manager" ? "team" : "mine";
  const statusFilter = String(req.query.status || "outstanding");
  const projectIdFilter = typeof req.query.projectId === "string" ? String(req.query.projectId) : "";

  const now = new Date();
  let tasks = db.tasks.filter((t) => {
    if (t.deletedAt) return false;
    if (scope === "team") return true;
    return taskAccessibleTo(t, user);
  });

  if (projectIdFilter) {
    tasks = tasks.filter((t) => t.projectId === projectIdFilter);
  }

  if (statusFilter === "outstanding") {
    tasks = tasks.filter((t) => t.status !== "done");
  } else if (statusFilter === "overdue") {
    tasks = tasks.filter((t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < now);
  } else if (statusFilter === "done") {
    tasks = tasks.filter((t) => t.status === "done");
  } else if (statusFilter === "due_soon") {
    tasks = tasks.filter((t) => isDueSoon(t.dueDate, now) && t.status !== "done");
  }

  const enriched = tasks
    .map((task) => enrichTask(task, db))
    .sort((a, b) => b.priority.score - a.priority.score || compareDateSafe(a.dueDate, b.dueDate));

  res.json(enriched);
});

app.patch("/api/tasks/:id", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (!taskAccessibleTo(task, user, "edit")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const {
    title,
    status,
    dueDate,
    assigneeId,
    manualPriority,
    startDate,
    department,
    product,
    sharedWith,
    projectId,
    dependsOn,
    description,
    section,
  } = req.body ?? {};
  if (typeof title === "string" && title.trim()) {
    task.title = title.trim();
  }
  if (status && ["todo", "in_progress", "done"].includes(status)) {
    task.status = status;
    task.completedAt = status === "done" ? new Date().toISOString() : null;
  }
  if (typeof dueDate === "string" || dueDate === null) {
    if (task.deadlineLocked && user?.role !== "manager") {
      return res.status(403).json({ error: "This deadline was set by a manager and cannot be changed." });
    }
    task.dueDate = dueDate;
    if (user?.role === "manager" && dueDate) task.deadlineLocked = true;
    if (user?.role === "manager" && dueDate === null) task.deadlineLocked = false;
  }
  if (typeof startDate === "string" || startDate === null) {
    task.startDate = startDate;
  }
  if (typeof description === "string") {
    task.description = description;
  }
  if (manualPriority && ["low", "medium", "high"].includes(manualPriority)) {
    task.manualPriority = manualPriority;
  }
  if (assigneeId && user?.role === "manager") {
    const assigneeExists = db.users.some((u) => u.id === assigneeId);
    if (assigneeExists) task.assigneeId = assigneeId;
  }
  if (typeof department === "string" || department === null) {
    task.department = department || null;
  }
  if (typeof product === "string" || product === null) {
    task.product = product || null;
  }
  if (Array.isArray(sharedWith)) {
    task.sharedWith = sharedWith.filter((id) => db.users.some((u) => u.id === id));
  }
  if (typeof projectId === "string" || projectId === null) {
    const project = projectId ? db.projects.find((p) => p.id === projectId) : null;
    if (projectId && !projectAccessibleTo(project, user)) {
      return res.status(403).json({ error: "Project not accessible" });
    }
    task.projectId = project?.id ?? null;
  }
  if (Array.isArray(dependsOn)) {
    const allowedDependencies = new Set(
      db.tasks
        .filter((entry) => entry.id !== task.id)
        .filter((entry) => !task.projectId || entry.projectId === task.projectId)
        .map((entry) => entry.id)
    );
    task.dependsOn = dependsOn.filter((id) => allowedDependencies.has(id));
  }
  if (typeof section === "string" || section === null) {
    task.section = section || null;
  }
  task.updatedAt = new Date().toISOString();
  saveDb(db);
  res.json(enrichTask(task, db));
});

// DELETE bulk permanently delete tasks (must come before /:id to avoid route shadowing)
app.delete("/api/tasks/bulk-permanent", requireAuth, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "ids required" });
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const allowed = ids.filter((id) => {
    const task = db.tasks.find((t) => t.id === id);
    if (!task || !task.deletedAt) return false;
    return task.assigneeId === user.id || task.createdBy === user.id || user.role === "manager";
  });
  db.tasks = db.tasks.filter((t) => !allowed.includes(t.id));
  saveDb(db);
  res.json({ ok: true, deleted: allowed.length });
});

app.delete("/api/tasks/:id", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const idx = db.tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Task not found" });
  const task = db.tasks[idx];
  if (!taskAccessibleTo(task, user, "edit")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  task.deletedAt = new Date().toISOString();
  saveDb(db);
  res.json({ ok: true });
});

// GET deleted tasks for the current user
app.get("/api/tasks/deleted", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const tasks = db.tasks
    .filter((t) => t.deletedAt && (taskAccessibleTo(t, user, "edit") || t.createdBy === user.id))
    .map((t) => enrichTask(t, db));
  res.json(tasks);
});

// PATCH restore a soft-deleted task
app.patch("/api/tasks/:id/restore", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!taskAccessibleTo(task, user, "edit")) return res.status(403).json({ error: "Forbidden" });
  task.deletedAt = null;
  saveDb(db);
  res.json({ ok: true });
});

// DELETE permanently delete a task
app.delete("/api/tasks/:id/permanent", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const idx = db.tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Task not found" });
  const task = db.tasks[idx];
  if (!task.deletedAt) {
    return res.status(400).json({ error: "Task must be soft-deleted before permanent deletion" });
  }
  if (task.assigneeId !== user.id && task.createdBy !== user.id && user.role !== "manager") {
    return res.status(403).json({ error: "Forbidden" });
  }
  db.tasks.splice(idx, 1);
  saveDb(db);
  res.json({ ok: true });
});

app.post("/api/tasks", requireAuth, requireManager, (req, res) => {
  const {
    title,
    assigneeId,
    dueDate,
    manualPriority = null,
    startDate = null,
    department = null,
    product = null,
    projectId = null,
    dependsOn = [],
    description = "",
    sharedWith = [],
    section = null,
  } = req.body ?? {};
  if (!title || !assigneeId) {
    return res.status(400).json({ error: "title and assigneeId are required" });
  }
  const db = readDb();
  const managerUser = db.users.find((u) => u.id === req.userId);
  const assigneeExists = db.users.some((u) => u.id === assigneeId);
  if (!assigneeExists) {
    return res.status(404).json({ error: "Assignee not found" });
  }
  const project = projectId ? db.projects.find((p) => p.id === projectId) : null;
  if (projectId && !projectAccessibleTo(project, managerUser)) {
    return res.status(403).json({ error: "Project not accessible" });
  }

  const nowIso = new Date().toISOString();
  const resolvedStart = startDate || nowIso;
  const resolvedDue = dueDate || addDays(new Date(), 5).toISOString();
  const task = {
    id: crypto.randomUUID(),
    title,
    description,
    assigneeId,
    createdBy: req.userId,
    dueDate: dueDate || null,
    deadlineLocked: false,
    startDate,
    status: "todo",
    manualPriority: ["low", "medium", "high"].includes(manualPriority) ? manualPriority : null,
    department: department || null,
    product: product || null,
    sharedWith: Array.isArray(sharedWith) ? sharedWith.filter((id) => db.users.some((u) => u.id === id)) : [],
    projectId: project?.id ?? null,
    section: typeof section === "string" && section.trim() ? section.trim() : null,
    dependsOn: Array.isArray(dependsOn)
      ? dependsOn.filter((id) => db.tasks.some((task) => task.id === id && (!project?.id || task.projectId === project.id)))
      : [],
    createdAt: nowIso,
    updatedAt: nowIso,
    completedAt: null,
    reminderHistory: [],
    phases: generateDefaultPhases(resolvedStart, resolvedDue),
  };
  db.tasks.push(task);
  saveDb(db);
  res.status(201).json(enrichTask(task, db));
});

app.get("/api/calendar", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const scope = req.query.scope === "team" && user?.role === "manager" ? "team" : "mine";
  const from = req.query.from ? new Date(String(req.query.from)) : startOfDay(new Date());
  const to = req.query.to ? new Date(String(req.query.to)) : addDays(new Date(), 30);

  const events = db.tasks
    .filter((t) => !t.deletedAt)
    .filter((t) => (scope === "team" ? true : taskAccessibleTo(t, user)))
    .filter((t) => t.dueDate)
    .filter((t) => {
      const due = new Date(t.dueDate);
      return due >= from && due <= to;
    })
    .map((t) => {
      const scored = withPriority(t);
      return {
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        startDate: t.startDate,
        status: t.status,
        assigneeId: t.assigneeId,
        assigneeName: db.users.find((u) => u.id === t.assigneeId)?.name ?? "Unknown",
        priorityScore: scored.priority.score,
        importanceLevel: scored.priority.score >= 7 ? "high" : scored.priority.score >= 4 ? "medium" : "low",
      };
    });

  res.json(events);
});

app.get("/api/calendar/export.ics", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const scope = req.query.scope === "team" && user?.role === "manager" ? "team" : "mine";

  const tasks = db.tasks.filter((t) => !t.deletedAt).filter((t) => (scope === "team" ? true : taskAccessibleTo(t, user))).filter((t) => t.dueDate);
  const ics = buildIcs(tasks, db.users);
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=nyalazone-tasks.ics");
  res.send(ics);
});

app.get("/api/gantt", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const scope = req.query.scope === "team" && user?.role === "manager" ? "team" : "mine";
  const tasks = db.tasks
    .filter((t) => !t.deletedAt)
    .filter((t) => (scope === "team" ? true : taskAccessibleTo(t, user)))
    .map((t) => ({
      id: t.id,
      title: t.title,
      startDate: t.startDate || t.createdAt,
      dueDate: t.dueDate || addDays(new Date(t.createdAt), 5).toISOString(),
      assigneeId: t.assigneeId,
      status: t.status,
    }));
  res.json(tasks);
});

app.put("/api/gantt", requireAuth, (req, res) => {
  const updates = Array.isArray(req.body?.tasks) ? req.body.tasks : null;
  if (!updates) {
    return res.status(400).json({ error: "tasks array is required" });
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);

  for (const update of updates) {
    const task = db.tasks.find((t) => t.id === update.id);
    if (!task) {
      continue;
    }
    if (!taskAccessibleTo(task, user, "edit")) {
      continue;
    }
    if (typeof update.startDate === "string") {
      task.startDate = update.startDate;
    }
    if (typeof update.dueDate === "string") {
      task.dueDate = update.dueDate;
    }
    task.updatedAt = new Date().toISOString();
  }
  saveDb(db);
  res.json({ ok: true });
});

app.get("/api/metrics/summary", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  const scope = req.query.scope === "team" && user?.role === "manager" ? "team" : "mine";
  const tasks = db.tasks.filter((t) => (scope === "team" ? true : taskAccessibleTo(t, user)));
  const now = new Date();
  const done = tasks.filter((t) => t.status === "done");
  const overdue = tasks.filter((t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < now).length;
  const onTimeDone = done.filter((t) => t.dueDate && t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate)).length;
  const onTimePct = done.length === 0 ? 0 : Math.round((onTimeDone / done.length) * 100);
  res.json({
    totalTasks: tasks.length,
    doneTasks: done.length,
    overdueTasks: overdue,
    onTimePct,
  });
});

app.get("/api/tasks/:id", requireAuth, (req, res) => {
  const db = readDb();
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  const user = db.users.find((u) => u.id === req.userId);
  if (!taskAccessibleTo(task, user)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(enrichTask(task, db));
});

app.put("/api/tasks/:id/phases", requireAuth, (req, res) => {
  const phases = Array.isArray(req.body?.phases) ? req.body.phases : null;
  if (!phases) return res.status(400).json({ error: "phases array required" });
  const db = readDb();
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  const user = db.users.find((u) => u.id === req.userId);
  if (!taskAccessibleTo(task, user, "edit")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  task.phases = phases.map((p) => ({
    id: p.id || crypto.randomUUID(),
    title: String(p.title || "Phase").slice(0, 80).trim() || "Phase",
    startDate: typeof p.startDate === "string" ? p.startDate : null,
    dueDate: typeof p.dueDate === "string" ? p.dueDate : null,
    status: ["todo", "in_progress", "done"].includes(p.status) ? p.status : "todo",
    createdAt: p.createdAt || new Date().toISOString(),
  }));
  task.updatedAt = new Date().toISOString();
  saveDb(db);
  res.json(task.phases);
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

if (!process.env.TEST_MODE) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export { app };

startReminderScheduler();

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = sessions.get(token);
  next();
}

function requireManager(req, res, next) {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.userId);
  if (!user || user.role !== "manager") {
    return res.status(403).json({ error: "Manager role required" });
  }
  next();
}

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    const nowIso = new Date().toISOString();
    const defaultDb = {
      users: [
        {
          id: "u_manager",
          name: "Aarush Manager",
          email: "manager@nyalazone.internal",
          password: "demo123",
          role: "manager",
          timezone: "Asia/Calcutta",
          teamRole: "Delivery Lead",
          products: ["DMAP", "DDS"],
        },
        {
          id: "u_member",
          name: "Isha Member",
          email: "member@nyalazone.internal",
          password: "demo123",
          role: "member",
          timezone: "Asia/Calcutta",
          teamRole: "Frontend",
          products: ["Leggero.ai"],
        },
      ],
      projects: [
        {
          id: "p_seed_1",
          title: "Client Onboarding Refresh",
          description: "Improve onboarding assets and rollout checklist.",
          ownerId: "u_manager",
          scope: "team",
          memberIds: ["u_member"],
          deadline: addDays(new Date(), 10).toISOString(),
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ],
      tasks: [
        {
          id: "t_seed_1",
          title: "Finalize onboarding copy",
          description: "Finish draft and circulate for review",
          assigneeId: "u_member",
          createdBy: "u_manager",
          projectId: "p_seed_1",
          dueDate: addDays(new Date(), 2).toISOString(),
          startDate: nowIso,
          status: "in_progress",
          manualPriority: "high",
          createdAt: nowIso,
          updatedAt: nowIso,
          completedAt: null,
          reminderHistory: [],
        },
      ],
    };
    fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2), "utf8");
  }
}

function readDb() {
  const raw = fs.readFileSync(dbPath, "utf8");
  return normalizeDb(JSON.parse(raw));
}

function saveDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
}

function parseNaturalLanguageTask(text, _timezone) {
  const cleaned = text.trim().replace(/\.$/, "");
  const lowered = cleaned.toLowerCase();

  const dueDate = extractDueDate(lowered) || addDays(new Date(), 3);
  const title = cleaned
    .replace(/need to|please|can you|must|have to/gi, "")
    .replace(/by\s+\w+.*/i, "")
    .trim();

  return {
    title: title.length > 0 ? capitalizeFirst(title) : "Untitled task",
    dueDateIso: endOfDay(dueDate).toISOString(),
    startDateIso: startOfDay(new Date()).toISOString(),
  };
}

function extractDueDate(text) {
  const now = new Date();
  if (text.includes("tomorrow")) {
    return addDays(now, 1);
  }
  if (text.includes("next week")) {
    return addDays(now, 7);
  }

  const weekdayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  for (const [word, idx] of Object.entries(weekdayMap)) {
    if (text.includes(word)) {
      const daysUntil = (idx - now.getDay() + 7) % 7 || 7;
      return addDays(now, daysUntil);
    }
  }

  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    const parsed = new Date(`${dateMatch[1]}T23:59:59`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function withPriority(task) {
  const now = new Date();
  const due = task.dueDate ? new Date(task.dueDate) : null;
  let urgency = 1;
  if (!due) {
    urgency = 1;
  } else if (due < now) {
    urgency = 5;
  } else {
    const hours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hours <= 24) {
      urgency = 4;
    } else if (hours <= 48) {
      urgency = 3;
    } else {
      urgency = 2;
    }
  }

  const manualMap = { low: 0, medium: 1, high: 2 };
  const manual = manualMap[task.manualPriority] ?? 0;
  const manager = 0;
  const score = urgency + manual;
  return {
    ...task,
    priority: {
      urgency,
      manual,
      manager,
      score,
    },
  };
}

function isDueSoon(dueDate, now = new Date()) {
  if (!dueDate) {
    return false;
  }
  const ms = new Date(dueDate).getTime() - now.getTime();
  return ms > 0 && ms <= 48 * 60 * 60 * 1000;
}

function compareDateSafe(a, b) {
  if (!a && !b) {
    return 0;
  }
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }
  return new Date(a).getTime() - new Date(b).getTime();
}

function buildIcs(tasks, users) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nyalazone//PM Tool//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const t of tasks) {
    const due = new Date(t.dueDate);
    const start = t.startDate ? new Date(t.startDate) : new Date(due.getTime() - 60 * 60 * 1000);
    const assigneeName = users.find((u) => u.id === t.assigneeId)?.name ?? "Unknown";
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${t.id}@nyalazone.internal`);
    lines.push(`DTSTAMP:${toIcsDate(new Date())}`);
    lines.push(`DTSTART:${toIcsDate(start)}`);
    lines.push(`DTEND:${toIcsDate(due)}`);
    lines.push(`SUMMARY:${escapeIcs(`${t.title} (${assigneeName})`)}`);
    lines.push(`DESCRIPTION:${escapeIcs(t.description || "Task due")}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function toIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function startReminderScheduler() {
  const everyMinuteMs = 60 * 1000;
  const reminderInterval = setInterval(async () => {
    const db = readDb();
    const transport = createTransporter();
    if (!transport) {
      return;
    }
    const now = new Date();
    for (const task of db.tasks) {
      if (task.status === "done" || !task.dueDate) {
        continue;
      }
      const assignee = db.users.find((u) => u.id === task.assigneeId);
      if (!assignee?.email) {
        continue;
      }
      const due = new Date(task.dueDate);
      const msUntilDue = due.getTime() - now.getTime();
      const type =
        msUntilDue <= 0
          ? "overdue_daily"
          : msUntilDue <= 24 * 60 * 60 * 1000
            ? "t24h"
            : msUntilDue <= 48 * 60 * 60 * 1000
              ? "t48h"
              : null;
      if (!type) {
        continue;
      }

      task.reminderHistory = Array.isArray(task.reminderHistory) ? task.reminderHistory : [];
      if (alreadySentRecently(task.reminderHistory, type, now)) {
        continue;
      }

      try {
        await transport.sendMail({
          from: process.env.SMTP_FROM || "nyalazone-tool@internal.local",
          to: assignee.email,
          subject: `[Nyalazone] Task reminder: ${task.title}`,
          text: `Task "${task.title}" is due ${due.toLocaleString()}. Please review your task list.`,
        });
        task.reminderHistory.push({ type, at: now.toISOString() });
      } catch (err) {
        console.error("Reminder send failed:", err?.message || err);
      }
    }
    saveDb(db);
  }, everyMinuteMs);
  reminderInterval.unref();
}

// ── Password hashing ─────────────────────────────────

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!stored.includes(":")) return stored === password; // plaintext fallback during migration
  const [salt, hash] = stored.split(":");
  try {
    const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  } catch { return false; }
}

function migratePasswords() {
  const db = readDb();
  let changed = false;
  for (const user of db.users) {
    if (user.password && !user.password.includes(":")) {
      user.password = hashPassword(user.password);
      changed = true;
    }
  }
  if (changed) saveDb(db);
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function notifyManagersOfPendingSignup(user, db) {
  const managers = db.users.filter((entry) => entry.role === "manager" && entry.status !== "pending" && entry.email);
  if (!managers.length) return;

  const reviewUrl = process.env.APP_URL || "http://localhost:3000";
  const subject = `[Nyalazone] Approval needed for ${user.name}`;
  const text = `A new signup is awaiting approval.\n\nName: ${user.name}\nEmail: ${user.email}\nRequested role: ${user.teamRole || "Unspecified"}\nCreated: ${user.createdAt}\n\nReview pending requests: ${reviewUrl}\n`;
  const transport = createTransporter();

  if (transport) {
    transport.sendMail({
      from: process.env.SMTP_FROM || "nyalazone-tool@internal.local",
      to: managers.map((entry) => entry.email).join(", "),
      subject,
      text,
    }).catch((err) => console.error("Pending approval email failed:", err?.message || err));
    return;
  }

  console.log(`[PENDING APPROVAL] ${user.email} awaiting approval. Notify: ${managers.map((entry) => entry.email).join(", ")}`);
}

function alreadySentRecently(history, type, now) {
  const entry = [...history].reverse().find((h) => h.type === type);
  if (!entry) {
    return false;
  }
  const sentAt = new Date(entry.at);
  if (type === "overdue_daily") {
    return now.getTime() - sentAt.getTime() < 24 * 60 * 60 * 1000;
  }
  return true;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function generateDefaultPhases(startDateIso, dueDateIso) {
  const start = new Date(startDateIso);
  const end = new Date(dueDateIso);
  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) return [];
  const nowIso = new Date().toISOString();
  const p1End = new Date(start.getTime() + totalMs * 0.3);
  const p2End = new Date(start.getTime() + totalMs * 0.8);
  return [
    { id: crypto.randomUUID(), title: "Planning", startDate: start.toISOString(), dueDate: p1End.toISOString(), status: "todo", createdAt: nowIso },
    { id: crypto.randomUUID(), title: "Execution", startDate: p1End.toISOString(), dueDate: p2End.toISOString(), status: "todo", createdAt: nowIso },
    { id: crypto.randomUUID(), title: "Review & Wrap-up", startDate: p2End.toISOString(), dueDate: end.toISOString(), status: "todo", createdAt: nowIso },
  ];
}

function capitalizeFirst(value) {
  if (!value) {
    return value;
  }
  return value[0].toUpperCase() + value.slice(1);
}
