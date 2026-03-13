const DAY_MS = 24 * 60 * 60 * 1000;

export function createDemoController(now = new Date()) {
  let active = false;
  let persona = "member";
  let data = createDemoData(now);

  function reset() {
    data = createDemoData(now);
    persona = "member";
  }

  return {
    start() {
      active = true;
      reset();
    },
    stop() {
      active = false;
      reset();
    },
    isActive() {
      return active;
    },
    getPersona() {
      return persona;
    },
    switchPersona(nextPersona) {
      if (nextPersona === "manager" || nextPersona === "member") {
        persona = nextPersona;
      }
      return getCurrentUser(data, persona);
    },
    getCurrentUser() {
      return clone(getCurrentUser(data, persona));
    },
    getSteps() {
      return buildDemoSteps();
    },
    handleApiRequest(url, options = {}) {
      return handleDemoApi(data, persona, url, options);
    },
  };
}

export function buildDemoSteps() {
  return [
    {
      id: "welcome",
      title: "Safe product tour",
      body: "This walkthrough runs on demo-only data. Nothing here touches your real tasks or projects.",
      target: null,
      tab: "tasks",
    },
    {
      id: "quick-add",
      title: "Quick add a task",
      body: "The quick-add bar turns plain language into a task with dates, sharing, and project context.",
      target: "#quickAddInput",
      tab: "tasks",
    },
    {
      id: "create-modal",
      title: "Full task creation",
      body: "Use the full modal when you need status, dates, project placement, and sharing controls.",
      target: "#createTaskModal",
      tab: "tasks",
      prepare: "openCreateTask",
    },
    {
      id: "sharing",
      title: "Share with teammates",
      body: "Tasks can be visible to collaborators without changing the assignee.",
      target: "#shareWithList",
      tab: "tasks",
      prepare: "seedCreateTaskForm",
    },
    {
      id: "task-detail",
      title: "Review task details",
      body: "Task details show ownership, project context, and sharing settings in one place.",
      target: "#taskDetailModal",
      tab: "tasks",
      prepare: "createSharedTaskAndOpen",
    },
    {
      id: "reminders",
      title: "Smart reminders",
      body: "Reminders surface overdue work, stale items, and upcoming deadlines.",
      target: "#remindersList",
      tab: "reminders",
    },
    {
      id: "calendar",
      title: "Calendar view",
      body: "Deadlines are also visible on the calendar so users can spot timing conflicts quickly.",
      target: "#calendarGrid",
      tab: "tasks",
    },
    {
      id: "projects",
      title: "Project tracking",
      body: "Projects group tasks, members, and deadlines under a shared delivery plan.",
      target: "#projectGrid",
      tab: "projects",
    },
    {
      id: "planner",
      title: "Project planner",
      body: "Inside a project, sections and the planner help structure work before tasks pile up.",
      target: "#projectDetailModal",
      tab: "projects",
      prepare: "openDemoProject",
    },
    {
      id: "role-switch",
      title: "Manager view",
      body: "The demo now switches to the manager role to show assignment, workload, and approvals.",
      target: null,
      tab: "manager",
      prepare: "switchToManager",
    },
    {
      id: "assign",
      title: "Assign tasks",
      body: "Managers can assign work directly with dates, priority, and project placement.",
      target: "#assignForm",
      tab: "manager",
    },
    {
      id: "workload",
      title: "Team workload",
      body: "Workload cards show outstanding and overdue work across the team.",
      target: "#teamWorkload",
      tab: "manager",
    },
    {
      id: "approvals",
      title: "Pending approvals",
      body: "New account requests wait here until a manager approves or rejects them.",
      target: "#pendingApprovalsList",
      tab: "manager",
    },
    {
      id: "finish",
      title: "What this covers",
      body: "The app supports task intake, sharing, reminders, project planning, and manager oversight without leaving the workspace.",
      target: null,
      tab: "manager",
    },
  ];
}

export function createDemoData(now = new Date()) {
  const base = startOfDay(now);
  const users = [
    {
      id: "demo_manager",
      name: "Morgan Manager",
      email: "manager.demo@nyalazone.internal",
      role: "manager",
      timezone: "Asia/Calcutta",
      teamRole: "Delivery Lead",
      products: ["DMAP", "Leggero.ai"],
      status: "active",
    },
    {
      id: "demo_member",
      name: "Asha Member",
      email: "member.demo@nyalazone.internal",
      role: "member",
      timezone: "Asia/Calcutta",
      teamRole: "Frontend",
      products: ["Leggero.ai"],
      status: "active",
    },
    {
      id: "demo_backend",
      name: "Ben Backend",
      email: "ben.demo@nyalazone.internal",
      role: "member",
      timezone: "UTC",
      teamRole: "Backend",
      products: ["DMAP"],
      status: "active",
    },
    {
      id: "demo_ops",
      name: "Olivia Ops",
      email: "ops.demo@nyalazone.internal",
      role: "member",
      timezone: "UTC",
      teamRole: "Operations",
      products: ["Leggero.ai"],
      status: "active",
    },
  ];

  const projects = [
    {
      id: "demo_project_launch",
      title: "Launch landing page refresh",
      description: "Coordinate launch assets and approvals for the public release.",
      client: "Leggero.ai",
      ownerId: "demo_manager",
      scope: "team",
      memberIds: ["demo_member", "demo_backend", "demo_ops"],
      deadline: isoAt(base, 9),
      sections: ["Planning", "Design", "Launch"],
      createdAt: isoAt(base, -4),
      updatedAt: isoAt(base, -1),
    },
    {
      id: "demo_project_onboarding",
      title: "Customer onboarding audit",
      description: "Review onboarding gaps and document follow-up work.",
      client: "DMAP",
      ownerId: "demo_member",
      scope: "personal",
      memberIds: ["demo_member"],
      deadline: isoAt(base, 14),
      sections: ["Discovery", "Documentation"],
      createdAt: isoAt(base, -6),
      updatedAt: isoAt(base, -2),
    },
  ];

  const tasks = [
    {
      id: "demo_task_overdue",
      title: "Finalize homepage copy",
      description: "Lock the final hero copy before launch.",
      assigneeId: "demo_member",
      createdBy: "demo_manager",
      sharedWith: ["demo_backend"],
      projectId: "demo_project_launch",
      section: "Design",
      department: "Frontend",
      product: "Leggero.ai",
      dueDate: isoAt(base, -1),
      startDate: isoAt(base, -5),
      status: "in_progress",
      manualPriority: "high",
      createdAt: isoAt(base, -5),
      updatedAt: isoAt(base, -1),
      deletedAt: null,
      completedAt: null,
      phases: [],
      reminderHistory: [],
    },
    {
      id: "demo_task_upcoming",
      title: "QA handoff checklist",
      description: "Share the release checklist with QA and ops.",
      assigneeId: "demo_member",
      createdBy: "demo_member",
      sharedWith: ["demo_ops"],
      projectId: "demo_project_launch",
      section: "Launch",
      department: "Operations",
      product: "Leggero.ai",
      dueDate: isoAt(base, 2),
      startDate: isoAt(base, 0),
      status: "todo",
      manualPriority: "medium",
      createdAt: isoAt(base, -1),
      updatedAt: isoAt(base, -1),
      deletedAt: null,
      completedAt: null,
      phases: [],
      reminderHistory: [],
    },
    {
      id: "demo_task_done",
      title: "Review onboarding notes",
      description: "Wrap up the onboarding audit draft.",
      assigneeId: "demo_member",
      createdBy: "demo_member",
      sharedWith: [],
      projectId: "demo_project_onboarding",
      section: "Documentation",
      department: "Frontend",
      product: "DMAP",
      dueDate: isoAt(base, -2),
      startDate: isoAt(base, -6),
      status: "done",
      manualPriority: "low",
      createdAt: isoAt(base, -6),
      updatedAt: isoAt(base, -2),
      deletedAt: null,
      completedAt: isoAt(base, -2),
      phases: [],
      reminderHistory: [],
    },
  ];

  return {
    users,
    projects,
    tasks,
    pendingUsers: [
      {
        id: "demo_pending_1",
        name: "Priya Pending",
        email: "pending.demo@nyalazone.internal",
        teamRole: "QA",
        createdAt: isoAt(base, -1),
      },
    ],
    counters: {
      task: 100,
    },
  };
}

export function handleDemoApi(data, persona, url, options = {}) {
  const currentUser = getCurrentUser(data, persona);
  const parsedUrl = new URL(url, "http://demo.local");
  const method = String(options.method || "GET").toUpperCase();
  const body = parseBody(options.body);
  const pathname = parsedUrl.pathname;

  if (pathname === "/api/auth/me") {
    return clone(currentUser);
  }
  if (pathname === "/api/auth/logout") {
    return { ok: true };
  }
  if (pathname === "/api/users") {
    return clone(data.users);
  }
  if (pathname === "/api/users/pending") {
    return persona === "manager" ? clone(data.pendingUsers) : [];
  }
  if (/^\/api\/users\/[^/]+\/approve$/.test(pathname) && method === "POST") {
    const userId = pathname.split("/")[3];
    data.pendingUsers = data.pendingUsers.filter((entry) => entry.id !== userId);
    return { ok: true };
  }
  if (/^\/api\/users\/[^/]+\/reject$/.test(pathname) && method === "POST") {
    const userId = pathname.split("/")[3];
    data.pendingUsers = data.pendingUsers.filter((entry) => entry.id !== userId);
    return { ok: true };
  }
  if (pathname === "/api/projects") {
    return clone(getVisibleProjects(data, currentUser));
  }
  if (pathname === "/api/tasks/deleted") {
    return clone(filterTasksForUser(data, currentUser, {
      scope: "mine",
      status: "deleted",
    }));
  }
  if (pathname === "/api/calendar") {
    return clone(getCalendarEvents(data, currentUser, parsedUrl.searchParams));
  }
  if (pathname === "/api/gantt") {
    return clone(getTasksForQuery(data, currentUser, parsedUrl.searchParams));
  }
  if (pathname === "/api/tasks" && method === "GET") {
    return clone(getTasksForQuery(data, currentUser, parsedUrl.searchParams));
  }
  if (pathname === "/api/tasks" && method === "POST") {
    if (persona !== "manager") {
      throw new Error("Manager role required");
    }
    const task = createTaskRecord(data, currentUser, body, body.assigneeId || currentUser.id);
    data.tasks.push(task);
    return clone(enrichTask(task, data));
  }
  if (pathname === "/api/tasks/parse" && method === "POST") {
    const task = createTaskRecord(data, currentUser, body, currentUser.id);
    data.tasks.push(task);
    return clone(enrichTask(task, data));
  }
  if (/^\/api\/tasks\/[^/]+\/phases$/.test(pathname) && method === "PUT") {
    const taskId = pathname.split("/")[3];
    const task = data.tasks.find((entry) => entry.id === taskId);
    if (!task) throw new Error("Task not found");
    task.phases = Array.isArray(body.phases) ? body.phases.map((phase, index) => ({
      id: phase.id || `demo_phase_${index}`,
      title: String(phase.title || `Phase ${index + 1}`),
      startDate: phase.startDate || task.startDate,
      dueDate: phase.dueDate || task.dueDate,
      status: phase.status || "todo",
      createdAt: phase.createdAt || new Date().toISOString(),
    })) : [];
    task.updatedAt = new Date().toISOString();
    return clone(task.phases);
  }
  if (/^\/api\/tasks\/[^/]+\/restore$/.test(pathname) && method === "PATCH") {
    const taskId = pathname.split("/")[3];
    const task = data.tasks.find((entry) => entry.id === taskId);
    if (!task) throw new Error("Task not found");
    task.deletedAt = null;
    task.updatedAt = new Date().toISOString();
    return { ok: true };
  }
  if (/^\/api\/tasks\/[^/]+\/permanent$/.test(pathname) && method === "DELETE") {
    const taskId = pathname.split("/")[3];
    data.tasks = data.tasks.filter((entry) => entry.id !== taskId);
    return { ok: true };
  }
  if (pathname === "/api/tasks/bulk-permanent" && method === "DELETE") {
    const ids = new Set(Array.isArray(body.ids) ? body.ids : []);
    data.tasks = data.tasks.filter((entry) => !ids.has(entry.id));
    return { ok: true };
  }
  if (/^\/api\/tasks\/[^/]+$/.test(pathname) && method === "GET") {
    const taskId = pathname.split("/")[3];
    const task = data.tasks.find((entry) => entry.id === taskId);
    if (!task) throw new Error("Task not found");
    return clone(enrichTask(task, data));
  }
  if (/^\/api\/tasks\/[^/]+$/.test(pathname) && method === "PATCH") {
    const taskId = pathname.split("/")[3];
    const task = data.tasks.find((entry) => entry.id === taskId);
    if (!task) throw new Error("Task not found");
    applyTaskPatch(task, body);
    return clone(enrichTask(task, data));
  }
  if (/^\/api\/tasks\/[^/]+$/.test(pathname) && method === "DELETE") {
    const taskId = pathname.split("/")[3];
    const task = data.tasks.find((entry) => entry.id === taskId);
    if (!task) throw new Error("Task not found");
    task.deletedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    return { ok: true };
  }

  throw new Error(`Demo route not implemented: ${method} ${pathname}`);
}

function getTasksForQuery(data, currentUser, searchParams) {
  return filterTasksForUser(data, currentUser, {
    scope: searchParams.get("scope") || "mine",
    status: searchParams.get("status") || "outstanding",
    sort: searchParams.get("sort") || "",
    projectId: searchParams.get("projectId") || "",
  }).map((task) => enrichTask(task, data));
}

function filterTasksForUser(data, currentUser, filters) {
  const now = Date.now();
  const scope = filters.scope === "team" && currentUser.role === "manager" ? "team" : "mine";
  let tasks = data.tasks.filter((task) => {
    if (scope === "team") return !task.deletedAt;
    return isTaskVisibleToUser(task, currentUser);
  });

  if (filters.projectId) {
    tasks = tasks.filter((task) => task.projectId === filters.projectId);
  }

  if (filters.status === "outstanding") {
    tasks = tasks.filter((task) => !task.deletedAt && task.status !== "done" && (!task.dueDate || new Date(task.dueDate).getTime() >= now));
  } else if (filters.status === "overdue") {
    tasks = tasks.filter((task) => !task.deletedAt && task.status !== "done" && task.dueDate && new Date(task.dueDate).getTime() < now);
  } else if (filters.status === "done") {
    tasks = tasks.filter((task) => !task.deletedAt && task.status === "done");
  } else if (filters.status === "deleted") {
    tasks = tasks.filter((task) => Boolean(task.deletedAt) && isTaskVisibleToUser(task, currentUser));
  }

  if (filters.sort === "priority") {
    tasks.sort((a, b) => comparePriority(a, b) || compareDate(a.dueDate, b.dueDate));
  } else {
    tasks.sort((a, b) => compareDate(a.dueDate, b.dueDate));
  }

  return tasks;
}

function getCalendarEvents(data, currentUser, searchParams) {
  const tasks = getTasksForQuery(data, currentUser, searchParams)
    .filter((task) => !task.deletedAt)
    .map((task) => ({
      ...task,
      importanceLevel: priorityImportance(task),
    }));
  const from = new Date(searchParams.get("from") || 0).getTime();
  const to = new Date(searchParams.get("to") || Date.now() + 90 * DAY_MS).getTime();
  return tasks.filter((task) => {
    const due = task.dueDate ? new Date(task.dueDate).getTime() : 0;
    return !Number.isNaN(due) && due >= from && due <= to;
  });
}

function getVisibleProjects(data, currentUser) {
  const visible = data.projects.filter((project) => {
    if (currentUser.role === "manager") return true;
    return project.ownerId === currentUser.id || project.memberIds.includes(currentUser.id);
  });
  return visible.map((project) => {
    const projectTasks = data.tasks.filter((task) => task.projectId === project.id && !task.deletedAt);
    return {
      ...project,
      canManage: currentUser.role === "manager" || project.ownerId === currentUser.id,
      memberNames: project.memberIds
        .map((memberId) => data.users.find((user) => user.id === memberId)?.name)
        .filter(Boolean),
      taskCount: projectTasks.length,
      outstandingTaskCount: projectTasks.filter((task) => task.status !== "done").length,
      completedTaskCount: projectTasks.filter((task) => task.status === "done").length,
    };
  });
}

function applyTaskPatch(task, body) {
  const patchableFields = [
    "title",
    "description",
    "status",
    "manualPriority",
    "department",
    "product",
    "projectId",
    "section",
    "startDate",
    "dueDate",
    "sharedWith",
  ];
  for (const field of patchableFields) {
    if (field in body) {
      task[field] = body[field];
    }
  }
  if (task.status === "done" && !task.completedAt) {
    task.completedAt = new Date().toISOString();
  }
  if (task.status !== "done") {
    task.completedAt = null;
  }
  task.updatedAt = new Date().toISOString();
}

function createTaskRecord(data, currentUser, payload, assigneeId) {
  const taskId = `demo_task_${++data.counters.task}`;
  const nowIso = new Date().toISOString();
  return {
    id: taskId,
    title: String(payload.title || payload.text || "Untitled task").trim() || "Untitled task",
    description: String(payload.description || "").trim(),
    assigneeId,
    createdBy: currentUser.id,
    sharedWith: Array.isArray(payload.sharedWith) ? payload.sharedWith.filter(Boolean) : [],
    projectId: payload.projectId || null,
    section: payload.section || null,
    department: payload.department || null,
    product: payload.product || null,
    dueDate: payload.dueDate || isoAt(new Date(), 3),
    startDate: payload.startDate || new Date().toISOString(),
    status: payload.status || "todo",
    manualPriority: payload.manualPriority || payload.priority || "medium",
    createdAt: nowIso,
    updatedAt: nowIso,
    completedAt: payload.status === "done" ? nowIso : null,
    deletedAt: null,
    phases: [],
    reminderHistory: [],
  };
}

function enrichTask(task, data) {
  const project = task.projectId ? data.projects.find((entry) => entry.id === task.projectId) : null;
  const assignee = data.users.find((user) => user.id === task.assigneeId);
  return {
    ...task,
    assigneeName: assignee?.name || "Unknown",
    projectName: project?.title || null,
    projectClient: project?.client || null,
  };
}

function isTaskVisibleToUser(task, currentUser) {
  return task.assigneeId === currentUser.id
    || task.createdBy === currentUser.id
    || (Array.isArray(task.sharedWith) && task.sharedWith.includes(currentUser.id));
}

function getCurrentUser(data, persona) {
  return data.users.find((user) => user.role === persona) || data.users[0];
}

function comparePriority(a, b) {
  const score = (task) => {
    const manual = { high: 3, medium: 2, low: 1 }[task.manualPriority] || 0;
    const overdue = task.dueDate && new Date(task.dueDate).getTime() < Date.now() ? 4 : 0;
    return overdue + manual;
  };
  return score(b) - score(a);
}

function priorityImportance(task) {
  if (task.manualPriority === "high") return "high";
  if (task.manualPriority === "medium") return "medium";
  return "low";
}

function compareDate(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function isoAt(baseDate, dayOffset) {
  const value = new Date(baseDate.getTime() + dayOffset * DAY_MS);
  value.setHours(12, 0, 0, 0);
  return value.toISOString();
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
