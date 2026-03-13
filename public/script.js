const state = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null"),
  activeTasks: [],
  completedTasks: [],
  deletedTasks: [],
  tab: "my-work",
  reminders: [],
  reminderFilter: "all",
  dismissedReminderIds: [],
  taskDetail: { task: null, phases: [] },
  projectDetail: { project: null, tasks: [], sections: [], activeSection: "", ganttView: "auto" },
  ganttGlobalView: "auto",
  taskFilter: { statusTab: "all", search: "", priority: "", dept: "", product: "", client: "" },
  calendarOffset: 0,
  editingTaskId: null,
  projects: [],
  users: [],
  createTaskPrefillProjectId: null,
  createTaskPrefillSection: null,
  managerFilter: { product: "", projectId: "", role: "", teamRoleFilter: "", teamSort: "role" },
  teamTasks: { outstanding: [], overdue: [], done: [] },
  deletedSelectMode: false,
  deletedSelected: new Set(),
};

const loginView = document.getElementById("loginView");
const mainView = document.getElementById("mainView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const exportIcsBtn = document.getElementById("exportIcsBtn");
const logoutBtn = document.getElementById("logoutBtn");
const welcomeText = document.getElementById("welcomeText");
const topTimezoneSelect = document.getElementById("topTimezoneSelect");

const tasksNavBtn = document.getElementById("tasksNavBtn");
const remindersNavBtn = document.getElementById("remindersNavBtn");
const projectsNavBtn = document.getElementById("projectsNavBtn");
const ganttNavBtn = document.getElementById("ganttNavBtn");
const managerNavBtn = document.getElementById("managerNavBtn");
const myWorkView = document.getElementById("myWorkView");
const remindersView = document.getElementById("remindersView");
const projectsView = document.getElementById("projectsView");
const ganttView = document.getElementById("ganttView");
const managerView = document.getElementById("managerView");
const remindersList = document.getElementById("remindersList");

// Task manager
const taskTableBody = document.getElementById("taskTableBody");
const taskSearch = document.getElementById("taskSearch");
const filterStatus = document.getElementById("filterStatus");
const filterPriority = document.getElementById("filterPriority");
const filterDept = document.getElementById("filterDept");
const addTaskBtn = document.getElementById("addTaskBtn");
const statTotal = document.getElementById("statTotal");
const statCompleted = document.getElementById("statCompleted");
const statInProgress = document.getElementById("statInProgress");
const statOverdue = document.getElementById("statOverdue");
const tabAll = document.getElementById("tabAll");
const tabTodo = document.getElementById("tabTodo");
const tabInProgress = document.getElementById("tabInProgress");
const tabDone = document.getElementById("tabDone");
const tabDeleted = document.getElementById("tabDeleted");

// Create task modal
const createTaskModal = document.getElementById("createTaskModal");
const createTaskForm = document.getElementById("createTaskForm");
const createTaskCloseBtn = document.getElementById("createTaskCloseBtn");
const createTaskCancelBtn = document.getElementById("createTaskCancelBtn");
const autoCategoryHint = document.getElementById("autoCategoryHint");
const shareWithList = document.getElementById("shareWithList");
const createProjectSelect = document.getElementById("createProject");
const createProjectField = document.getElementById("createProjectField");
const createProductField = document.getElementById("createProductField");
const createSectionField = document.getElementById("createSectionField");
const createSectionSelect = document.getElementById("createSection");

// Calendar
const calendarGrid = document.getElementById("calendarGrid");
const calendarRange = document.getElementById("calendarRange");
const calPrevBtn = document.getElementById("calPrevBtn");
const calNextBtn = document.getElementById("calNextBtn");
const calPeriodLabel = document.getElementById("calPeriodLabel");

// Gantt (hidden, kept for compat)
const ganttScale = document.getElementById("ganttScale");
const ganttList = document.getElementById("ganttList");

// Manager
const assignForm = document.getElementById("assignForm");
const assignUser = document.getElementById("assignUser");
const teamWorkload = document.getElementById("teamWorkload");
const assignProject = document.getElementById("assignProject");
const teamSettings = document.getElementById("teamSettings");

// Projects
const projectForm = document.getElementById("projectForm");
const projectMembers = document.getElementById("projectMembers");
const projectMembersSection = document.getElementById("projectMembersSection");
const projectGrid = document.getElementById("projectGrid");
const projectFormStatus = document.getElementById("projectFormStatus");
const projectFormModal = document.getElementById("projectFormModal");
const profileSettingsModal = document.getElementById("profileSettingsModal");
const profileSettingsForm = document.getElementById("profileSettingsForm");
const tzSelect = document.getElementById("tzSelect");
const timezoneOptions = document.getElementById("timezoneOptions");
const psCancelBtn = document.getElementById("psCancelBtn");
const psError = document.getElementById("psError");
const recentlyDeletedToggle = document.getElementById("recentlyDeletedToggle");
const recentlyDeletedList = document.getElementById("recentlyDeletedList");

// Modals
const taskDetailModal = document.getElementById("taskDetailModal");
const tdTitle = document.getElementById("tdTitle");
const tdMeta = document.getElementById("tdMeta");
const tdCloseBtn = document.getElementById("tdCloseBtn");
const tdPhaseGantt = document.getElementById("tdPhaseGantt");
const tdAddPhaseBtn = document.getElementById("tdAddPhaseBtn");
const tdSavePhasesBtn = document.getElementById("tdSavePhasesBtn");
const tdSaveStatus = document.getElementById("tdSaveStatus");
const projectDetailModal = document.getElementById("projectDetailModal");
const pdTitle = document.getElementById("pdTitle");
const pdMeta = document.getElementById("pdMeta");
const pdPlanner = document.getElementById("pdPlanner");
const pdCloseBtn = document.getElementById("pdCloseBtn");
const pdAddTaskBtn = document.getElementById("pdAddTaskBtn");
const pdSaveBtn = document.getElementById("pdSaveBtn");
const pdSaveStatus = document.getElementById("pdSaveStatus");
const projectQuickAddInput = document.getElementById("projectQuickAddInput");
const projectQuickAddFeedback = document.getElementById("projectQuickAddFeedback");
const projectAssignForm = document.getElementById("projectAssignForm");
const projectAssignTitle = document.getElementById("projectAssignTitle");
const projectAssignUser = document.getElementById("projectAssignUser");
const projectAssignDue = document.getElementById("projectAssignDue");
const projectAssignPriority = document.getElementById("projectAssignPriority");
const createStartInput = document.getElementById("createStart");
const createDurationInput = document.getElementById("createDuration");
const createDueInput = document.getElementById("createDue");

init();

async function init() {
  bindEvents();

  // If URL has a reset token, show reset view immediately
  const resetToken = new URLSearchParams(window.location.search).get("reset");
  if (resetToken) {
    showAuthView("resetView");
    return;
  }

  if (state.token) {
    try {
      state.user = await api("/api/auth/me");
      persistAuth();
      setAppVisible(true);
      await loadCurrentTab();
      return;
    } catch {
      clearAuth();
    }
  }
  setAppVisible(false);
}

function bindEvents() {
  loginForm.addEventListener("submit", onLogin);

  // Auth view switching
  document.getElementById("showForgotBtn").addEventListener("click", () => showAuthView("forgotView"));
  document.getElementById("showRegisterBtn").addEventListener("click", () => showAuthView("registerView"));
  document.getElementById("showLoginFromRegisterBtn").addEventListener("click", () => showAuthView("loginView"));
  document.getElementById("showLoginFromForgotBtn").addEventListener("click", () => showAuthView("loginView"));

  // Register
  document.getElementById("registerForm").addEventListener("submit", onRegister);

  // Forgot password
  document.getElementById("forgotForm").addEventListener("submit", onForgotPassword);

  // Reset password
  document.getElementById("resetForm").addEventListener("submit", onResetPassword);

  // Change password modal
  document.getElementById("changePasswordBtn").addEventListener("click", () => {
    document.getElementById("changePasswordModal").classList.remove("hidden");
    document.getElementById("cpError").textContent = "";
    document.getElementById("changePasswordForm").reset();
  });
  document.getElementById("cpCancelBtn").addEventListener("click", () => {
    document.getElementById("changePasswordModal").classList.add("hidden");
  });
  document.getElementById("changePasswordModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("changePasswordModal")) {
      document.getElementById("changePasswordModal").classList.add("hidden");
    }
  });
  document.getElementById("changePasswordForm").addEventListener("submit", onChangePassword);

  // Manager: add team member
  document.getElementById("addMemberForm").addEventListener("submit", onAddMember);

  // Workload filters
  document.getElementById("workloadFilterProduct")?.addEventListener("change", (e) => {
    state.managerFilter.product = e.target.value;
    renderTeamWorkload(state.users, state.teamTasks.outstanding, state.teamTasks.overdue, state.teamTasks.done, state.managerFilter);
  });
  document.getElementById("workloadFilterProject")?.addEventListener("change", (e) => {
    state.managerFilter.projectId = e.target.value;
    renderTeamWorkload(state.users, state.teamTasks.outstanding, state.teamTasks.overdue, state.teamTasks.done, state.managerFilter);
  });
  document.getElementById("workloadFilterRole")?.addEventListener("change", (e) => {
    state.managerFilter.role = e.target.value;
    renderTeamWorkload(state.users, state.teamTasks.outstanding, state.teamTasks.overdue, state.teamTasks.done, state.managerFilter);
  });
  document.getElementById("viewTeamRoleFilter")?.addEventListener("change", (e) => {
    state.managerFilter.teamRoleFilter = e.target.value;
    renderViewTeam(state.users, state.projects, state.managerFilter);
  });
  document.getElementById("viewTeamSort")?.addEventListener("change", (e) => {
    state.managerFilter.teamSort = e.target.value;
    renderViewTeam(state.users, state.projects, state.managerFilter);
  });
  calendarRange.addEventListener("change", () => { state.calendarOffset = 0; loadMyWork(); });
  calPrevBtn.addEventListener("click", () => { state.calendarOffset -= 1; loadCalendar(); });
  calNextBtn.addEventListener("click", () => { state.calendarOffset += 1; loadCalendar(); });
  ganttScale?.addEventListener("change", () => loadGantt());
  assignForm.addEventListener("submit", onAssignTask);
  projectForm.addEventListener("submit", onCreateProject);
  document.getElementById("addProjectBtn").addEventListener("click", () => openProjectModal(null));

  // Projects calendar toggle
  let projCalOffset = 0;
  const projCalPanel = document.getElementById("projectsCalendarPanel");
  const projCalGrid = document.getElementById("projCalGrid");
  const projCalRange = document.getElementById("projCalRange");
  const projCalLabel = document.getElementById("projCalLabel");

  function renderProjectsCalendar() {
    const { from, to } = getRangeBounds(projCalRange.value, projCalOffset);
    projCalLabel.textContent = formatPeriodLabel(projCalRange.value, from, to);
    const range = projCalRange.value;
    const days = range === "quarter"
      ? allDaysInRange(startOfWeekSunday(from), endOfWeekSaturday(to))
      : allDaysInRange(from, to);
    const projectsByDate = {};
    for (const p of state.projects) {
      if (p.deadline) {
        const key = p.deadline.slice(0, 10);
        if (!projectsByDate[key]) projectsByDate[key] = [];
        projectsByDate[key].push(p);
      }
    }
    projCalGrid.innerHTML = days.map((day) => {
      const key = day.toISOString().slice(0, 10);
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const cards = (projectsByDate[key] || []).map((p) => `
        <div class="calendar-item calendar-project-deadline" data-project-id="${p.id}" style="cursor:pointer">
          <strong>📁 ${escapeHtml(p.title)}</strong>
          <p>${p.taskCount || 0} tasks · ${p.completedTaskCount || 0} done</p>
        </div>`).join("");
      return `
        <section class="calendar-day ${isWeekend ? "weekend" : ""}">
          <h4>${formatDayHeading(day)}</h4>
          ${cards || `<p class="muted mini" style="opacity:0.5">—</p>`}
        </section>`;
    }).join("");
  }

  projCalGrid.addEventListener("click", (e) => {
    const item = e.target.closest("[data-project-id]");
    if (item) openProjectDetail(item.getAttribute("data-project-id"));
  });

  document.getElementById("projectsCalendarBtn").addEventListener("click", () => {
    const isHidden = projCalPanel.classList.toggle("hidden");
    if (!isHidden) renderProjectsCalendar();
  });
  document.getElementById("projCalPrev").addEventListener("click", () => { projCalOffset -= 1; renderProjectsCalendar(); });
  document.getElementById("projCalNext").addEventListener("click", () => { projCalOffset += 1; renderProjectsCalendar(); });
  projCalRange.addEventListener("change", () => { projCalOffset = 0; renderProjectsCalendar(); });
  document.getElementById("projectModalCloseBtn").addEventListener("click", closeProjectModal);
  document.getElementById("projectModalCancelBtn").addEventListener("click", closeProjectModal);
  let pfMousedownTarget = null;
  projectFormModal.addEventListener("mousedown", (e) => { pfMousedownTarget = e.target; });
  projectFormModal.addEventListener("click", (e) => { if (e.target === projectFormModal && pfMousedownTarget === projectFormModal) closeProjectModal(); });
  exportIcsBtn.addEventListener("click", exportIcs);

  initializeTimezoneOptions();
  psCancelBtn?.addEventListener("click", closeProfileSettings);
  profileSettingsModal?.addEventListener("click", (e) => {
    if (e.target === profileSettingsModal) closeProfileSettings();
  });
  profileSettingsForm?.addEventListener("submit", onSaveProfileSettings);
  topTimezoneSelect?.addEventListener("change", onTopTimezoneChange);
  createStartInput?.addEventListener("input", syncCreateTaskDates);
  createStartInput?.addEventListener("change", syncCreateTaskDates);
  createDurationInput?.addEventListener("input", syncCreateTaskDates);
  createDurationInput?.addEventListener("change", syncCreateTaskDates);
  createDueInput?.addEventListener("input", onCreateDueInput);
  createDueInput?.addEventListener("change", onCreateDueInput);
  createProjectSelect?.addEventListener("change", () => {
    syncCreateTaskSectionField(createProjectSelect.value || null).catch(() => {});
  });
  recentlyDeletedToggle?.addEventListener("click", () => {
    recentlyDeletedList?.classList.toggle("hidden");
  });

  // Task detail modal
  tdCloseBtn.addEventListener("click", () => taskDetailModal.classList.add("hidden"));
  tdAddPhaseBtn?.addEventListener("click", addPhase);
  tdSavePhasesBtn?.addEventListener("click", savePhases);
  let tdMousedownTarget = null;
  taskDetailModal.addEventListener("mousedown", (e) => { tdMousedownTarget = e.target; });
  taskDetailModal.addEventListener("click", (e) => { if (e.target === taskDetailModal && tdMousedownTarget === taskDetailModal) taskDetailModal.classList.add("hidden"); });
  pdCloseBtn.addEventListener("click", () => projectDetailModal.classList.add("hidden"));
  let pdMousedownTarget = null;
  projectDetailModal.addEventListener("mousedown", (e) => { pdMousedownTarget = e.target; });
  projectDetailModal.addEventListener("click", (e) => { if (e.target === projectDetailModal && pdMousedownTarget === projectDetailModal) projectDetailModal.classList.add("hidden"); });
  pdAddTaskBtn.addEventListener("click", () => {
    const projectId = state.projectDetail.project?.id || null;
    projectDetailModal.classList.add("hidden");
    openCreateTaskModal(projectId);
  });
  pdSaveBtn.addEventListener("click", saveProjectPlan);

  // Gantt collapse toggle
  document.getElementById("ganttCollapseBtn")?.addEventListener("click", () => {
    const body = document.getElementById("ganttBodyCollapsible");
    const btn = document.getElementById("ganttCollapseBtn");
    const collapsed = body.classList.toggle("gantt-collapsed");
    btn.classList.toggle("collapsed", collapsed);
    btn.title = collapsed ? "Expand Gantt" : "Minimize Gantt";
  });

  // Gantt view toggle pills
  document.getElementById("ganttViewPills")?.addEventListener("click", (e) => {
    const pill = e.target.closest(".gantt-view-pill");
    if (!pill) return;
    state.projectDetail.ganttView = pill.dataset.view;
    document.querySelectorAll("#ganttViewPills .gantt-view-pill").forEach((p) => p.classList.toggle("active", p === pill));
    renderProjectPlanner();
  });
  document.getElementById("ganttGlobalViewPills")?.addEventListener("click", (e) => {
    const pill = e.target.closest(".gantt-view-pill");
    if (!pill) return;
    state.ganttGlobalView = pill.dataset.view;
    document.querySelectorAll("#ganttGlobalViewPills .gantt-view-pill").forEach((p) => p.classList.toggle("active", p === pill));
    loadGlobalGantt();
  });
  projectAssignForm?.addEventListener("submit", onProjectAssignTask);

  // Logout / tabs
  logoutBtn.addEventListener("click", async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    clearAuth();
    setAppVisible(false);
  });
  tasksNavBtn.addEventListener("click", () => setActiveTab("tasks"));
  remindersNavBtn.addEventListener("click", () => setActiveTab("reminders"));
  projectsNavBtn.addEventListener("click", () => setActiveTab("projects"));
  ganttNavBtn.addEventListener("click", () => setActiveTab("gantt"));
  managerNavBtn.addEventListener("click", () => setActiveTab("manager"));

  // Reminder filter pills
  document.getElementById("reminderFilterPills")?.addEventListener("click", (e) => {
    const pill = e.target.closest(".reminder-pill");
    if (!pill) return;
    state.reminderFilter = pill.dataset.filter;
    document.querySelectorAll(".reminder-pill").forEach((p) => p.classList.toggle("active", p === pill));
    renderReminders();
  });
  remindersList?.addEventListener("click", (e) => {
    const dismissBtn = e.target.closest("[data-dismiss-reminder]");
    if (!dismissBtn) return;
    dismissReminder(dismissBtn.getAttribute("data-dismiss-reminder"));
  });

  // Create task modal
  addTaskBtn.addEventListener("click", openCreateTaskModal);
  createTaskCloseBtn.addEventListener("click", closeCreateTaskModal);
  createTaskCancelBtn.addEventListener("click", closeCreateTaskModal);
  let ctMousedownTarget = null;
  createTaskModal.addEventListener("mousedown", (e) => { ctMousedownTarget = e.target; });
  createTaskModal.addEventListener("click", (e) => { if (e.target === createTaskModal && ctMousedownTarget === createTaskModal) closeCreateTaskModal(); });
  createTaskForm.addEventListener("submit", onCreateTask);

  // Filters
  taskSearch.addEventListener("input", () => { state.taskFilter.search = taskSearch.value; renderTaskTable(); });
  filterStatus.addEventListener("change", () => {
    const val = filterStatus.value;
    state.taskFilter.statusTab = val || "all";
    syncStatusTabs();
    renderTaskTable();
  });
  filterPriority.addEventListener("change", () => { state.taskFilter.priority = filterPriority.value; renderTaskTable(); });
  filterDept.addEventListener("change", () => { state.taskFilter.dept = filterDept.value; renderTaskTable(); });
  document.getElementById("filterProduct").addEventListener("change", (e) => { state.taskFilter.product = e.target.value; renderTaskTable(); });
  document.getElementById("filterClient").addEventListener("change", (e) => { state.taskFilter.client = e.target.value; renderTaskTable(); });

  // Status tabs
  document.querySelectorAll(".status-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.taskFilter.statusTab = btn.dataset.status;
      filterStatus.value = btn.dataset.status === "all" ? "" : btn.dataset.status;
      syncStatusTabs();
      renderTaskTable();
    });
  });

  // Task table: event delegation for delete, view-detail, complete, status
  taskTableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (btn) {
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (action === "delete") await deleteTask(id);
      else if (action === "view-detail") openTaskDetail(id);
      else if (action === "edit") await openEditModal(id);
      return;
    }
    // Click anywhere on the row (not on interactive elements) opens edit
    const row = e.target.closest(".task-row");
    if (row && !e.target.closest("input, select, button, label")) {
      const id = row.querySelector("[data-action='edit']")?.getAttribute("data-id");
      if (id) await openEditModal(id);
      return;
    }
    const restoreBtn = e.target.closest("[data-restore-id]");
    if (restoreBtn) {
      await api(`/api/tasks/${restoreBtn.dataset.restoreId}/restore`, { method: "PATCH" });
      await loadMyWork();
      return;
    }
    const permDeleteBtn = e.target.closest("[data-perm-delete-id]");
    if (permDeleteBtn) {
      await api(`/api/tasks/${permDeleteBtn.dataset.permDeleteId}/permanent`, { method: "DELETE" });
      await loadMyWork();
      return;
    }
    // Deleted select mode
    if (e.target.id === "deletedEnterSelectBtn") {
      state.deletedSelectMode = true;
      state.deletedSelected.clear();
      renderTaskTable();
      return;
    }
    if (e.target.id === "deletedCancelSelectBtn") {
      state.deletedSelectMode = false;
      state.deletedSelected.clear();
      renderTaskTable();
      return;
    }
    if (e.target.id === "deletedMassDeleteBtn" && state.deletedSelected.size > 0) {
      const ids = Array.from(state.deletedSelected);
      await api("/api/tasks/bulk-permanent", { method: "DELETE", body: JSON.stringify({ ids }) });
      state.deletedSelectMode = false;
      state.deletedSelected.clear();
      await loadMyWork();
      return;
    }
  });
  // Deleted task checkboxes (change event)
  taskTableBody.addEventListener("change", (e) => {
    const cb = e.target.closest(".deleted-select-cb");
    if (cb) {
      const id = cb.dataset.deletedId;
      if (cb.checked) state.deletedSelected.add(id);
      else state.deletedSelected.delete(id);
      renderTaskTable();
      return;
    }
    if (e.target.id === "deletedSelectAll") {
      const filtered = applyTaskFilters();
      if (e.target.checked) filtered.forEach((t) => state.deletedSelected.add(t.id));
      else state.deletedSelected.clear();
      renderTaskTable();
    }
  });
  projectGrid?.addEventListener("click", async (e) => {
    const delBtn = e.target.closest("[data-delete-project]");
    if (delBtn) { await deleteProject(delBtn.getAttribute("data-delete-project")); return; }
    const editBtn = e.target.closest("[data-edit-project]");
    if (editBtn) { openProjectModal(editBtn.getAttribute("data-edit-project")); return; }
    const renameBtn = e.target.closest("[data-rename-project]");
    if (renameBtn) { await handleRenameProjectClick(renameBtn.getAttribute("data-rename-project")); return; }
    const trigger = e.target.closest("[data-project-id]");
    if (!trigger) return;
    openProjectDetail(trigger.getAttribute("data-project-id"));
  });

  document.getElementById("ganttGlobalList")?.addEventListener("click", async (e) => {
    const delBtn = e.target.closest("[data-delete-project]");
    if (delBtn) { await deleteProject(delBtn.getAttribute("data-delete-project")); return; }
    const editProjectBtn = e.target.closest("[data-edit-project]");
    if (editProjectBtn) { await handleRenameProjectClick(editProjectBtn.getAttribute("data-edit-project")); return; }
    const projectOpenBtn = e.target.closest("[data-open-project]");
    if (projectOpenBtn) { await openProjectDetail(projectOpenBtn.getAttribute("data-open-project")); return; }
    const taskOpenBtn = e.target.closest("[data-open-task]");
    if (taskOpenBtn) { await openEditModal(taskOpenBtn.getAttribute("data-open-task")); return; }
    const sectionAddBtn = e.target.closest(".pg-section-add-task-btn");
    if (sectionAddBtn) {
      const projectId = e.target.closest("[data-project-id]")?.getAttribute("data-project-id");
      if (!projectId) return;
      openCreateTaskModal(projectId, sectionAddBtn.dataset.section || null);
    }
  });
  bindProjectQuickAdd();
  taskTableBody.addEventListener("change", async (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.getAttribute("data-action");
    const id = el.getAttribute("data-id");
    if (action === "complete") await updateTaskStatus(id, el.checked ? "done" : "todo");
    else if (action === "status") await updateTaskStatus(id, el.value);
  });
  teamSettings?.addEventListener("click", async (e) => {
    const removeBtn = e.target.closest("[data-action='remove-user']");
    if (removeBtn) {
      const userId = removeBtn.getAttribute("data-user-id");
      const user = state.users.find(u => u.id === userId);
      if (!user) return;
      if (!confirm(`Remove ${user.name} from the team? This cannot be undone.`)) return;
      try {
        await api(`/api/users/${userId}`, { method: "DELETE" });
        const users = await api("/api/users");
        state.users = users;
        renderTeamSettings(users);
        renderAssignees(users);
        renderViewTeam(users, state.projects);
      } catch (err) {
        alert(`Failed to remove: ${err.message}`);
      }
      return;
    }

    const editUserBtn = e.target.closest("[data-action='edit-user']");
    if (editUserBtn) {
      const card = editUserBtn.closest("[data-user-card]");
      card.querySelector(".team-setting-view-mode").classList.add("hidden");
      card.querySelector(".team-setting-edit-mode").classList.remove("hidden");
      editUserBtn.classList.add("hidden");
      card.querySelector("[data-action='save-user']").classList.remove("hidden");
      return;
    }

    const button = e.target.closest("[data-action='save-user']");
    if (!button) return;
    const userId = button.getAttribute("data-user-id");
    const card = button.closest("[data-user-card]");
    if (!userId || !card) return;
    const roleSelect = card.querySelector("[data-field='team-role']");
    const teamRole = roleSelect.value === "other"
      ? (card.querySelector("[data-field='team-role-custom']")?.value.trim() || "")
      : roleSelect.value;
    const userRole = card.querySelector("[data-field='user-role']").value;
    const status = card.querySelector("[data-field='status']");
    status.textContent = "Saving...";
    try {
      await api(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ teamRole, role: userRole }),
      });
      status.textContent = "Saved";
      card.querySelector(".team-setting-view-mode").classList.remove("hidden");
      card.querySelector(".team-setting-edit-mode").classList.add("hidden");
      card.querySelector("[data-action='edit-user']").classList.remove("hidden");
      button.classList.add("hidden");
      card.querySelector(".team-setting-role-display").textContent = teamRole || "—";
      card.querySelector(".team-setting-system-role-display").textContent = userRole;
      const users = await api("/api/users");
      state.users = users;
      renderAssignees(users);
    } catch (error) {
      status.textContent = error.message || "Save failed";
    }
  });

  // Calendar item clicks
  calendarGrid.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest("[data-calendar-delete-task]");
    if (deleteBtn) {
      deleteTask(deleteBtn.getAttribute("data-calendar-delete-task"));
      return;
    }
    const projectItem = e.target.closest("[data-project-id]");
    if (projectItem) { openProjectDetail(projectItem.getAttribute("data-project-id")); return; }
    const item = e.target.closest("[data-task-id]");
    if (!item) return;
    openTaskDetail(item.getAttribute("data-task-id"));
  });

  // Quick-add "What needs to be done?"
  const quickAddInput = document.getElementById("quickAddInput");
  const quickAddFeedback = document.getElementById("quickAddFeedback");
  if (quickAddInput) {
    // Live preview of detected date + category + product
    quickAddInput.addEventListener("input", () => {
      const text = quickAddInput.value.trim();
      if (!text) { quickAddFeedback.textContent = ""; return; }
      const { dueDate, dept, product, sharedNames, projectName } = parseQuickAdd(text);
      const parts = [];
      if (dept) parts.push(`Category: ${dept}`);
      if (product) parts.push(`Product: ${product}`);
      if (dueDate) parts.push(`Deadline: ${new Date(dueDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`);
      if (sharedNames.length) parts.push(`Shared: ${sharedNames.join(", ")}`);
      if (projectName) parts.push(`Project: ${projectName}`);
      quickAddFeedback.textContent = parts.length ? parts.join("  ·  ") : "";
    });

    quickAddInput.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter") return;
      const text = quickAddInput.value.trim();
      if (!text) return;
      const parsed = parseQuickAdd(text);
      const { title, dueDate, dept, product } = parsed;
      quickAddInput.value = "";
      quickAddFeedback.textContent = "";
      quickAddInput.disabled = true;
      try {
        await createTaskFromNaturalText(text);
        await loadMyWork();
      } finally {
        quickAddInput.disabled = false;
        quickAddInput.focus();
      }
    });
  }
}

// ── Auth ─────────────────────────────────────────────

async function onLogin(event) {
  event.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value;
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    state.token = result.token;
    state.user = result.user;
    persistAuth();
    setAppVisible(true);
    await loadCurrentTab();
  } catch (error) {
    loginError.textContent = error.message || "Login failed";
  }
}

function showAuthView(viewId) {
  ["loginView", "registerView", "forgotView", "resetView"].forEach((id) => {
    document.getElementById(id)?.classList.toggle("hidden", id !== viewId);
  });
}

async function onRegister(e) {
  e.preventDefault();
  const err = document.getElementById("registerError");
  err.textContent = "";
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regConfirm").value;
  const roleSelect = document.getElementById("regRole").value;
  const companyRole = roleSelect === "other"
    ? document.getElementById("regRoleCustom").value.trim()
    : roleSelect;
  if (password !== confirm) { err.textContent = "Passwords don't match"; return; }
  if (!companyRole) { err.textContent = "Please select or enter your role"; return; }
  try {
    const result = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, companyRole }),
    });
    if (result.pending) {
      document.getElementById("registerForm").reset();
      err.style.color = "#16a34a";
      err.textContent = "Your account request has been submitted. A manager will review and approve it.";
      setTimeout(() => {
        err.textContent = "";
        err.style.color = "";
        showAuthView("loginView");
      }, 3000);
      return;
    }
    state.token = result.token;
    state.user = result.user;
    persistAuth();
    setAppVisible(true);
    await loadCurrentTab();
  } catch (error) {
    err.textContent = error.message || "Registration failed";
  }
}

async function onForgotPassword(e) {
  e.preventDefault();
  const msg = document.getElementById("forgotMsg");
  const email = document.getElementById("forgotEmail").value.trim();
  try {
    await api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    msg.textContent = "If an account exists for that email, a reset link has been sent.";
    msg.style.color = "#16a34a";
  } catch {
    msg.textContent = "Something went wrong. Please try again.";
    msg.style.color = "";
  }
}

async function onResetPassword(e) {
  e.preventDefault();
  const err = document.getElementById("resetError");
  err.textContent = "";
  const password = document.getElementById("resetPassword").value;
  const confirm = document.getElementById("resetConfirm").value;
  if (password !== confirm) { err.textContent = "Passwords don't match"; return; }
  const token = new URLSearchParams(window.location.search).get("reset");
  if (!token) { err.textContent = "Invalid reset link."; return; }
  try {
    await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
    // Clean URL and go to login
    window.history.replaceState({}, "", "/");
    showAuthView("loginView");
    document.getElementById("loginError").textContent = "";
    loginError.textContent = "Password updated — please sign in.";
    loginError.style.color = "#16a34a";
  } catch (error) {
    err.textContent = error.message || "Reset failed. The link may have expired.";
  }
}

async function onChangePassword(e) {
  e.preventDefault();
  const err = document.getElementById("cpError");
  err.textContent = "";
  const currentPassword = document.getElementById("cpCurrent").value;
  const newPassword = document.getElementById("cpNew").value;
  const confirm = document.getElementById("cpConfirm").value;
  if (newPassword !== confirm) { err.textContent = "New passwords don't match"; return; }
  try {
    await api("/api/auth/change-password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    document.getElementById("changePasswordModal").classList.add("hidden");
  } catch (error) {
    err.textContent = error.message || "Failed to update password";
  }
}

async function onAddMember(e) {
  e.preventDefault();
  const status = document.getElementById("addMemberStatus");
  status.textContent = "Adding...";
  const name = document.getElementById("addMemberName").value.trim();
  const email = document.getElementById("addMemberEmail").value.trim();
  const role = document.getElementById("addMemberRole").value;
  const teamRoleSelect = document.getElementById("addMemberTeamRole");
  const teamRole = teamRoleSelect.value === "other"
    ? (document.getElementById("addMemberTeamRoleCustom")?.value.trim() || "")
    : teamRoleSelect.value;
  const tempPassword = document.getElementById("addMemberPassword").value.trim();
  try {
    const result = await api("/api/users", {
      method: "POST",
      body: JSON.stringify({ name, email, role, teamRole, tempPassword: tempPassword || undefined }),
    });
    status.textContent = result.tempPassword
      ? `Added! Temp password: ${result.tempPassword}`
      : "Member added and invite sent.";
    document.getElementById("addMemberForm").reset();
    const users = await api("/api/users");
    state.users = users;
    populateTeamRoleFilters(users);
    renderTeamSettings(users);
    renderAssignees(users);
    renderViewTeam(users, state.projects, state.managerFilter);
  } catch (error) {
    status.textContent = error.message || "Failed to add member";
  }
}

function setAppVisible(isLoggedIn) {
  loginView.classList.toggle("hidden", isLoggedIn);
  mainView.classList.toggle("hidden", !isLoggedIn);
  if (!state.user) return;
  welcomeText.textContent = state.user.name;
  if (topTimezoneSelect) topTimezoneSelect.value = state.user.timezone || "UTC";
  const isManager = state.user.role === "manager";
  managerNavBtn.classList.toggle("hidden", !isManager);
  if (!isManager) setActiveTab("tasks");
}

function initializeTimezoneOptions() {
  if (!timezoneOptions) return;
  const supported = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : [
        "UTC",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "Europe/London",
        "Europe/Paris",
        "Asia/Kolkata",
        "Asia/Tokyo",
        "Australia/Sydney",
        "Pacific/Auckland",
      ];
  timezoneOptions.innerHTML = supported.map((tz) => `<option value="${tz}"></option>`).join("");
  if (topTimezoneSelect) {
    topTimezoneSelect.innerHTML = supported.map((tz) => `<option value="${tz}">${tz}</option>`).join("");
  }
}

function openProfileSettings() {
  if (!profileSettingsModal || !tzSelect) return;
  psError.textContent = "";
  tzSelect.value = state.user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  profileSettingsModal.classList.remove("hidden");
}

function closeProfileSettings() {
  profileSettingsModal?.classList.add("hidden");
}

async function saveTimezone(timezone) {
  const result = await api("/api/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ timezone }),
  });
  state.user = { ...state.user, timezone: result.timezone };
  persistAuth();
  if (topTimezoneSelect) topTimezoneSelect.value = result.timezone;
  return result;
}

async function onSaveProfileSettings(event) {
  event.preventDefault();
  const timezone = tzSelect?.value?.trim();
  if (!timezone) {
    psError.textContent = "Timezone is required.";
    return;
  }
  psError.textContent = "Saving...";
  try {
    await saveTimezone(timezone);
    psError.textContent = "";
    closeProfileSettings();
  } catch (error) {
    psError.textContent = error.message || "Failed to save timezone.";
  }
}

async function onTopTimezoneChange(event) {
  const timezone = event.target.value;
  if (!timezone || timezone === state.user?.timezone) return;
  try {
    await saveTimezone(timezone);
  } catch (error) {
    event.target.value = state.user?.timezone || "UTC";
    alert(error.message || "Failed to save timezone.");
  }
}

function getCreateTaskStartValue() {
  return createStartInput?.value || toDateInputValue(new Date().toISOString());
}

function getCreateTaskDueValue(startDate, duration) {
  if (!startDate || !Number.isFinite(duration) || duration < 1) return "";
  const [year, month, day] = startDate.split("-").map(Number);
  const due = new Date(year, month - 1, day + duration);
  return formatDateInputLocal(due);
}

function syncCreateTaskDates() {
  if (!createDueInput || !createDurationInput) return;
  const duration = Number(createDurationInput.value);
  if (!Number.isFinite(duration) || duration < 1) return;
  createDueInput.value = getCreateTaskDueValue(getCreateTaskStartValue(), duration);
}

function onCreateDueInput() {
  if (!createDueInput || !createDurationInput || !createStartInput) return;
  const start = createStartInput.value;
  const due = createDueInput.value;
  if (start && due) {
    const startMs = new Date(start + "T00:00:00").getTime();
    const dueMs = new Date(due + "T00:00:00").getTime();
    const days = Math.round((dueMs - startMs) / (1000 * 60 * 60 * 24));
    createDurationInput.value = days > 0 ? days : "";
  } else {
    createDurationInput.value = "";
  }
}

function setActiveTab(tab) {
  if (tab === "manager" && state.user?.role !== "manager") return;
  state.tab = tab;
  tasksNavBtn.classList.toggle("active", tab === "tasks");
  remindersNavBtn.classList.toggle("active", tab === "reminders");
  projectsNavBtn.classList.toggle("active", tab === "projects");
  ganttNavBtn.classList.toggle("active", tab === "gantt");
  managerNavBtn.classList.toggle("active", tab === "manager");
  myWorkView.classList.toggle("hidden", tab !== "tasks");
  remindersView.classList.toggle("hidden", tab !== "reminders");
  projectsView.classList.toggle("hidden", tab !== "projects");
  ganttView.classList.toggle("hidden", tab !== "gantt");
  managerView.classList.toggle("hidden", tab !== "manager");
  if (tab === "reminders") {
    loadReminders();
    return;
  }
  if (tab === "projects") {
    loadProjects();
    return;
  }
  if (tab === "gantt") {
    loadGlobalGantt();
    return;
  }
  loadCurrentTab();
}

async function loadCurrentTab() {
  if (state.tab === "manager" && state.user?.role === "manager") {
    await loadManager();
  } else if (state.tab === "reminders") {
    await loadReminders();
  } else if (state.tab === "projects") {
    // handled by setActiveTab
  } else if (state.tab === "gantt") {
    await loadGlobalGantt();
  } else {
    await loadMyWork();
  }
}

async function loadReminders() {
  remindersList.innerHTML = `<p class="muted">Loading reminders...</p>`;
  const isManager = state.user?.role === "manager";
  const scope = isManager ? "team" : "mine";
  const [tasks, projects, pendingUsers] = await Promise.all([
    api(`/api/tasks?scope=${scope}&status=outstanding&sort=priority`),
    api("/api/projects"),
    isManager ? api("/api/users/pending").catch(() => []) : Promise.resolve([]),
  ]);
  state.dismissedReminderIds = getDismissedReminderIds();
  state.reminders = buildSmartNudges(tasks, projects, pendingUsers, state.user)
    .map((nudge) => ({ ...nudge, id: createReminderId(nudge) }))
    .filter((nudge) => !state.dismissedReminderIds.includes(nudge.id));
  state.reminderFilter = "all";

  // Sync pills
  const pillsEl = document.getElementById("reminderFilterPills");
  if (pillsEl) {
    pillsEl.querySelectorAll(".reminder-pill").forEach((p) => {
      p.classList.toggle("active", p.dataset.filter === "all");
    });
    const teamPill = pillsEl.querySelector('[data-filter="team"]');
    if (teamPill) teamPill.style.display = isManager ? "" : "none";
  }

  renderReminders();
}

function buildSmartNudges(tasks, projects, pendingUsers, user) {
  const nudges = [];
  const now = new Date();
  const staleCutoff = 7;
  const isManager = user?.role === "manager";
  const coveredByDeadlineNudge = new Set();

  tasks.forEach((task) => {
    const assignee = task.assigneeName || "Someone";
    if (task.dueDate) {
      const daysUntilDue = Math.ceil((startOfDay(task.dueDate) - startOfDay(now)) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 0) {
        // Overdue
        nudges.push({
          kind: "overdue",
          tag: "urgent",
          severity: 5,
          title: task.title,
          message: isManager
            ? `${assignee}'s task is overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"}`
            : `This task was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"} ago`,
          meta: `${task.projectName || "No project"} · Due ${formatDate(task.dueDate)}`,
        });
        coveredByDeadlineNudge.add(task.id);
      } else if (daysUntilDue <= 3 && task.status === "todo") {
        // Not started but due soon
        nudges.push({
          kind: "unstarted",
          tag: "urgent",
          severity: 4,
          title: task.title,
          message: isManager
            ? `${assignee} hasn't started this task — ${daysUntilDue === 0 ? "due today" : `due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`}`
            : `Not started — ${daysUntilDue === 0 ? "due today" : `due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`}`,
          meta: `${task.projectName || "No project"} · ${formatDate(task.dueDate)}`,
        });
        coveredByDeadlineNudge.add(task.id);
      } else if (daysUntilDue <= 7 && task.status === "in_progress") {
        // Deadline within 7 days
        nudges.push({
          kind: "deadline",
          tag: "urgent",
          severity: daysUntilDue === 0 ? 5 : daysUntilDue <= 2 ? 4 : 3,
          title: task.title,
          message: isManager
            ? `${assignee} has ${daysUntilDue === 0 ? "a deadline today" : `a deadline in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`}`
            : `${daysUntilDue === 0 ? "Due today" : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`}`,
          meta: `${task.projectName || "No project"} · ${formatDate(task.dueDate)}`,
        });
        coveredByDeadlineNudge.add(task.id);
      }
    }

    // Stale task (skip if already covered by a deadline nudge)
    if (!coveredByDeadlineNudge.has(task.id)) {
      const lastTouchedAt = task.updatedAt || task.createdAt;
      const daysSinceTouch = lastTouchedAt
        ? Math.floor((startOfDay(now) - startOfDay(lastTouchedAt)) / (1000 * 60 * 60 * 24))
        : 0;
      if (daysSinceTouch >= staleCutoff) {
        const isHighPriority = task.manualPriority === "high";
        nudges.push({
          kind: "stale",
          tag: null,
          severity: isHighPriority ? 5 : 3,
          title: task.title,
          message: isManager
            ? isHighPriority
              ? `${assignee} hasn't touched this high-priority task in a while`
              : `${assignee} hasn't touched this task in ${daysSinceTouch} days`
            : `You haven't touched ${isHighPriority ? "this high-priority task" : "this task"} in ${daysSinceTouch} days`,
          meta: `${task.projectName || "No project"} · Last updated ${formatDate(lastTouchedAt)}`,
        });
      }
    }
  });

  projects.forEach((project) => {
    // Project deadline nudge
    if (project.deadline) {
      const daysUntilDue = Math.ceil((startOfDay(project.deadline) - startOfDay(now)) / (1000 * 60 * 60 * 24));
      if (daysUntilDue >= 0 && daysUntilDue <= 7) {
        nudges.push({
          kind: "project_deadline",
          tag: "urgent",
          severity: daysUntilDue <= 2 ? 4 : 3,
          title: project.title,
          message: `Project deadline ${daysUntilDue === 0 ? "today" : `in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`}`,
          meta: `${project.taskCount || 0} task${project.taskCount === 1 ? "" : "s"} · Due ${formatDate(project.deadline)}`,
        });
      }
    }

    // Stale project
    const lastTouchedAt = project.updatedAt || project.createdAt;
    const daysSinceTouch = lastTouchedAt
      ? Math.floor((startOfDay(now) - startOfDay(lastTouchedAt)) / (1000 * 60 * 60 * 24))
      : 0;
    if (daysSinceTouch >= staleCutoff) {
      nudges.push({
        kind: "project",
        tag: null,
        severity: 2,
        title: project.title,
        message: `${project.title} hasn't been updated in ${daysSinceTouch} days`,
        meta: `${project.taskCount || 0} task${project.taskCount === 1 ? "" : "s"} · ${project.deadline ? `Due ${formatDate(project.deadline)}` : "No deadline"}`,
      });
    }
  });

  // Manager-only nudges
  if (isManager) {
    // Pending approvals
    if (Array.isArray(pendingUsers) && pendingUsers.length > 0) {
      nudges.push({
        kind: "pending",
        tag: "team",
        severity: 3,
        title: `${pendingUsers.length} user${pendingUsers.length === 1 ? "" : "s"} awaiting approval`,
        message: `${pendingUsers.map((u) => u.name || u.email).join(", ")} ${pendingUsers.length === 1 ? "has" : "have"} requested access`,
        meta: "Go to Manager → Pending Approvals",
      });
    }

    // Unassigned tasks
    const unassignedTasks = tasks.filter((t) => !t.assigneeId && !t.assigneeName);
    if (unassignedTasks.length > 0) {
      nudges.push({
        kind: "unassigned",
        tag: "team",
        severity: 2,
        title: `${unassignedTasks.length} unassigned task${unassignedTasks.length === 1 ? "" : "s"}`,
        message: `Tasks without an owner: ${unassignedTasks.slice(0, 3).map((t) => t.title).join(", ")}${unassignedTasks.length > 3 ? ` +${unassignedTasks.length - 3} more` : ""}`,
        meta: "Assign tasks to keep work moving",
      });
    }

    // Workload: team members with 5+ outstanding tasks
    const tasksByAssignee = {};
    tasks.forEach((t) => {
      if (!t.assigneeId) return;
      if (!tasksByAssignee[t.assigneeId]) tasksByAssignee[t.assigneeId] = { name: t.assigneeName, count: 0 };
      tasksByAssignee[t.assigneeId].count++;
    });
    Object.values(tasksByAssignee).forEach(({ name, count }) => {
      if (count >= 5) {
        nudges.push({
          kind: "workload",
          tag: "team",
          severity: 2,
          title: `${name || "A team member"} has high workload`,
          message: `${name || "This person"} has ${count} outstanding tasks`,
          meta: "Consider redistributing work",
        });
      }
    });
  }

  return nudges
    .sort((a, b) => b.severity - a.severity || a.title.localeCompare(b.title))
    .slice(0, 25);
}

function renderReminders() {
  const filter = state.reminderFilter || "all";
  const filtered = filter === "all"
    ? state.reminders
    : state.reminders.filter((n) => n.tag === filter);

  if (!filtered.length) {
    const msg = filter === "all"
      ? "You're caught up on upcoming deadlines and stale work."
      : "No reminders in this category.";
    remindersList.innerHTML = `
      <div class="task-empty-state">
        <p>${filter === "all" ? "You're all caught up" : "Nothing here"}</p>
        <span class="muted">${msg}</span>
      </div>`;
    return;
  }

  remindersList.innerHTML = filtered.map((nudge) => `
    <article class="reminder-card reminder-${nudge.kind}">
      <div class="reminder-top">
        <div class="reminder-top-main">
          <span class="reminder-kind">${escapeHtml(formatReminderKind(nudge.kind))}</span>
          <h4>${escapeHtml(nudge.title)}</h4>
        </div>
        <button class="reminder-dismiss-btn" data-dismiss-reminder="${escapeHtml(nudge.id)}" type="button" title="Delete reminder">×</button>
      </div>
      <p>${escapeHtml(nudge.message)}</p>
      <span class="muted mini">${escapeHtml(nudge.meta)}</span>
    </article>
  `).join("");
}

function formatReminderKind(kind) {
  const labels = {
    overdue: "Overdue",
    unstarted: "Not Started",
    deadline: "Deadline",
    project_deadline: "Project Deadline",
    stale: "Stale",
    project: "Stale Project",
    pending: "Pending Approval",
    unassigned: "Unassigned",
    workload: "Workload",
  };
  return labels[kind] || "Reminder";
}

function getReminderStorageKey() {
  return `dismissedReminders:${state.user?.id || "anonymous"}`;
}

function getDismissedReminderIds() {
  try {
    const raw = localStorage.getItem(getReminderStorageKey());
    const ids = JSON.parse(raw || "[]");
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function saveDismissedReminderIds(ids) {
  localStorage.setItem(getReminderStorageKey(), JSON.stringify(ids));
}

function createReminderId(nudge) {
  return [nudge.kind, nudge.title, nudge.message, nudge.meta].join("|");
}

function dismissReminder(reminderId) {
  if (!reminderId) return;
  const next = [...new Set([...state.dismissedReminderIds, reminderId])];
  state.dismissedReminderIds = next;
  saveDismissedReminderIds(next);
  state.reminders = state.reminders.filter((reminder) => reminder.id !== reminderId);
  renderReminders();
}

// ── My Work ───────────────────────────────────────────

async function loadMyWork() {
  const { from, to } = getRangeBounds(calendarRange.value, state.calendarOffset);
  const [active, done, events, projects, deleted] = await Promise.all([
    api("/api/tasks?scope=mine&status=outstanding&sort=priority"),
    api("/api/tasks?scope=mine&status=done&sort=priority"),
    api(`/api/calendar?scope=mine&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`),
    api("/api/projects"),
    api("/api/tasks/deleted").catch(() => []),
  ]);
  state.activeTasks = active;
  state.completedTasks = done;
  state.deletedTasks = deleted;
  state.projects = projects;
  populateProjectSelects();
  renderStats();
  if (state.tab === "projects") renderProjects();
  renderTaskTable();
  renderRecentlyDeleted();
  renderCalendar(events, from, to, projects);
  await loadGantt();
}

async function loadCalendar() {
  const { from, to } = getRangeBounds(calendarRange.value, state.calendarOffset);
  const events = await api(`/api/calendar?scope=mine&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
  renderCalendar(events, from, to);
}

function renderRecentlyDeleted() {
  const toggle = recentlyDeletedToggle;
  const list = recentlyDeletedList;
  if (toggle) toggle.textContent = `Recently Deleted (${state.deletedTasks.length})`;
  if (list) list.innerHTML = "";
}

function renderStats() {
  const now = new Date();
  const total = state.activeTasks.length + state.completedTasks.length;
  const completed = state.completedTasks.length;
  const deleted = state.deletedTasks.length;
  const inProgress = state.activeTasks.filter((t) => t.status === "in_progress").length;
  const overdue = state.activeTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;
  const todo = state.activeTasks.filter((t) => t.status === "todo").length;

  statTotal.textContent = total;
  statCompleted.textContent = completed;
  statInProgress.textContent = inProgress;
  statOverdue.textContent = overdue;
  tabAll.textContent = total;
  tabTodo.textContent = todo;
  tabInProgress.textContent = inProgress;
  tabDone.textContent = completed;
  tabDeleted.textContent = deleted;
}

function matchesTaskSearch(task, rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    task.title,
    task.description,
    task.assigneeName,
    task.projectName,
    task.department,
    task.product,
  ].filter(Boolean).join(" ").toLowerCase();

  if (haystack.includes(query)) return true;
  if (!task.dueDate) return false;

  const dueDate = startOfDay(task.dueDate);
  const parsedDateQuery = parseSearchDateQuery(query);
  if (!parsedDateQuery) return false;

  if (parsedDateQuery.type === "exact") {
    return dueDate.getTime() === parsedDateQuery.date.getTime();
  }

  if (parsedDateQuery.type === "month_weekday") {
    return dueDate.getFullYear() === parsedDateQuery.year
      && dueDate.getMonth() === parsedDateQuery.month
      && dueDate.getDay() === parsedDateQuery.weekday;
  }

  return false;
}

function syncStatusTabs() {
  document.querySelectorAll(".status-tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.status === state.taskFilter.statusTab);
  });
}

const SECTION_BAR_COLORS = ["#2f5bd3", "#0f9d7a", "#d97706", "#a855f7", "#dc4c64", "#0891b2"];

function getSectionBarColor(sectionName = "") {
  if (!sectionName) return "#2f5bd3";
  const key = sectionName.toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = ((hash << 5) - hash) + key.charCodeAt(i);
  return SECTION_BAR_COLORS[Math.abs(hash) % SECTION_BAR_COLORS.length];
}

function buildProjectTimelineRows(tasks, sections = []) {
  const sectionMap = new Map();
  tasks.forEach((task, idx) => {
    const sec = task.section || "";
    if (!sectionMap.has(sec)) sectionMap.set(sec, []);
    sectionMap.get(sec).push({ task, idx });
  });

  const allSections = [...new Set([...sections, ...tasks.map((t) => t.section).filter(Boolean)])];
  const rows = [];
  if (allSections.length) {
    for (const secName of allSections) {
      rows.push({ type: "section", title: secName, color: getSectionBarColor(secName) });
      for (const { task, idx } of (sectionMap.get(secName) || [])) {
        rows.push({
          type: "task",
          id: task.id,
          idx,
          title: task.title,
          startDate: task.startDate || task.createdAt,
          dueDate: task.dueDate || addDays(new Date(task.createdAt || new Date()), 5).toISOString(),
          status: task.status,
          color: getSectionBarColor(secName),
        });
      }
    }
    for (const { task, idx } of (sectionMap.get("") || [])) {
      rows.push({
        type: "task",
        id: task.id,
        idx,
        title: task.title,
        startDate: task.startDate || task.createdAt,
        dueDate: task.dueDate || addDays(new Date(task.createdAt || new Date()), 5).toISOString(),
        status: task.status,
        color: getSectionBarColor("unsectioned"),
      });
    }
  } else {
    tasks.forEach((task, idx) => {
      rows.push({
        type: "task",
        id: task.id,
        idx,
        title: task.title,
        startDate: task.startDate || task.createdAt,
        dueDate: task.dueDate || addDays(new Date(task.createdAt || new Date()), 5).toISOString(),
        status: task.status,
        color: getSectionBarColor("default"),
      });
    });
  }

  return { rows, allSections };
}

function applyTaskFilters() {
  if (state.taskFilter.statusTab === "deleted") {
    return (state.deletedTasks || []).filter((task) => {
      if (state.taskFilter.search && !matchesTaskSearch(task, state.taskFilter.search)) return false;
      if (state.taskFilter.priority && task.manualPriority !== state.taskFilter.priority) return false;
      if (state.taskFilter.dept && task.department !== state.taskFilter.dept) return false;
      if (state.taskFilter.product && task.product !== state.taskFilter.product) return false;
      if (state.taskFilter.client && task.projectClient !== state.taskFilter.client) return false;
      return true;
    });
  }
  const all = [...state.activeTasks, ...state.completedTasks];
  return all.filter((task) => {
    if (state.taskFilter.statusTab !== "all") {
      if (state.taskFilter.statusTab === "done" && task.status !== "done") return false;
      if (state.taskFilter.statusTab !== "done" && task.status !== state.taskFilter.statusTab) return false;
    }
    if (state.taskFilter.search) {
      if (!matchesTaskSearch(task, state.taskFilter.search)) return false;
    }
    if (state.taskFilter.priority && task.manualPriority !== state.taskFilter.priority) return false;
    if (state.taskFilter.dept && task.department !== state.taskFilter.dept) return false;
    if (state.taskFilter.product && task.product !== state.taskFilter.product) return false;
    if (state.taskFilter.client && task.projectClient !== state.taskFilter.client) return false;
    return true;
  });
}

function renderTaskTable() {
  const filtered = applyTaskFilters();

  if (state.taskFilter.statusTab === "deleted") {
    renderDeletedTaskTable(filtered);
    return;
  }

  if (!filtered.length) {
    taskTableBody.innerHTML = `
      <div class="task-empty-state">
        <p>No tasks found</p>
        <span class="muted">Create a new task to get started</span>
      </div>`;
    return;
  }

  const now = new Date();
  taskTableBody.innerHTML = filtered.map((task) => {
    const isDone = task.status === "done";
    const isOverdue = !isDone && task.dueDate && new Date(task.dueDate) < now;
    const dueText = task.dueDate ? formatDate(task.dueDate) : "-";
    const deptSlug = task.department ? task.department.toLowerCase() : "";
    const productSlug = task.product ? task.product.toLowerCase().replace(/[.\s]/g, "") : "";
    const statusOpts = ["todo", "in_progress", "done"]
      .map((s) => `<option value="${s}" ${s === task.status ? "selected" : ""}>${capitalizeTaskStatus(s)}</option>`)
      .join("");

    return `
      <div class="task-row ${isDone ? "task-done" : ""} ${isOverdue ? "task-overdue" : ""}">
        <label class="task-row-check">
          <input type="checkbox" data-action="complete" data-id="${task.id}" ${isDone ? "checked" : ""} />
        </label>
        <div class="task-row-main">
          <button class="task-row-title ${isDone ? "done-title" : ""}" data-action="edit" data-id="${task.id}" type="button" title="Click to edit">${escapeHtml(task.title)}</button>
          ${task.assigneeName ? `<span class="task-row-sub">${escapeHtml(task.assigneeName)}</span>` : ""}
        </div>
        ${task.department
          ? `<span class="dept-badge dept-${deptSlug}">${escapeHtml(task.department)}</span>`
          : `<span class="dept-badge-empty"></span>`}
        ${task.product
          ? `<span class="product-badge product-${productSlug}">${escapeHtml(task.product)}</span>`
          : `<span class="product-badge-empty"></span>`}
        <span class="priority-badge priority-${task.manualPriority || "auto"}">${getPriorityLabel(task.manualPriority)}</span>
        <span class="due-badge ${isOverdue ? "due-overdue" : ""}" ${task.deadlineLocked ? 'title="Deadline locked by manager"' : ""}>${dueText}${task.deadlineLocked ? " 🔒" : ""}</span>
        ${Array.isArray(task.sharedWith) && task.sharedWith.length ? `<span class="shared-badge" title="Shared with ${task.sharedWith.length} user(s)">Shared</span>` : `<span class="shared-badge-empty"></span>`}
        <select class="status-select-inline" data-action="status" data-id="${task.id}">${statusOpts}</select>
        <button class="btn small secondary task-phases-btn" data-action="view-detail" data-id="${task.id}" type="button">Details</button>
        <button class="task-delete-btn" data-action="delete" data-id="${task.id}" type="button" title="Delete task">✕</button>
      </div>`;
  }).join("");
}

function renderDeletedTaskTable(tasks) {
  if (!tasks.length) {
    state.deletedSelectMode = false;
    state.deletedSelected.clear();
    taskTableBody.innerHTML = `
      <div class="task-empty-state">
        <p>No recently deleted tasks</p>
        <span class="muted">Deleted tasks stay here for 7 days before being removed automatically.</span>
      </div>`;
    return;
  }

  const selectMode = state.deletedSelectMode;
  const selected = state.deletedSelected;
  const selectedCount = selected.size;
  const allChecked = tasks.length > 0 && tasks.every((t) => selected.has(t.id));

  const toolbar = `
    <div class="deleted-toolbar">
      ${selectMode ? `
        <label class="deleted-select-all-label">
          <input type="checkbox" id="deletedSelectAll" ${allChecked ? "checked" : ""} />
          <span>Select All</span>
        </label>
        <button class="btn alert small" id="deletedMassDeleteBtn" ${selectedCount === 0 ? "disabled" : ""} type="button">
          Delete Selected${selectedCount > 0 ? ` (${selectedCount})` : ""}
        </button>
        <button class="btn ghost small" id="deletedCancelSelectBtn" type="button">Cancel</button>
      ` : `
        <button class="btn secondary small" id="deletedEnterSelectBtn" type="button">Select</button>
      `}
    </div>`;

  const now = new Date();
  const rows = tasks.map((task) => {
    const deletedDate = task.deletedAt ? new Date(task.deletedAt) : null;
    const daysAgo = deletedDate ? Math.floor((now - deletedDate) / (1000 * 60 * 60 * 24)) : 0;
    const daysLeft = deletedDate ? Math.max(0, 7 - daysAgo) : 0;
    return `
      <div class="task-row ${selectMode && selected.has(task.id) ? "task-row-selected" : ""}">
        ${selectMode ? `
          <label class="task-row-check">
            <input type="checkbox" class="deleted-select-cb" data-deleted-id="${task.id}" ${selected.has(task.id) ? "checked" : ""} />
          </label>
        ` : ""}
        <div class="task-row-main">
          <strong class="task-row-title" style="cursor:default;">${escapeHtml(task.title)}</strong>
          <span class="task-row-sub">Deleted ${daysAgo === 0 ? "today" : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`} · Auto-deletes in ${daysLeft} day${daysLeft === 1 ? "" : "s"}</span>
        </div>
        ${!selectMode ? `
          <button class="btn secondary small" data-restore-id="${task.id}" type="button">Restore</button>
          <button class="btn ghost small" data-perm-delete-id="${task.id}" type="button">Delete Forever</button>
        ` : ""}
      </div>`;
  }).join("");

  taskTableBody.innerHTML = toolbar + rows;
}

// ── Auto-categorize ───────────────────────────────────

const CATEGORY_RULES = [
  { dept: "Frontend",   keywords: ["frontend", "front end", "front-end", "ui", "user interface", "user experience", "css", "html", "react", "vue", "angular", "component", "page", "button", "style", "layout", "interface", "ux", "design", "figma", "wireframe", "mockup", "prototype"] },
  { dept: "Backend",    keywords: ["backend", "back end", "back-end", "api", "server", "database", "db", "endpoint", "query", "sql", "route", "auth", "middleware", "node", "express", "ai", "ml", "model", "agent", "llm", "gpt", "claude", "prompt", "machine learning", "artificial intelligence", "data pipeline", "data science"] },
  { dept: "Operations", keywords: ["sop", "operations", "operation", "ops", "workflow", "process", "procedure", "policy", "playbook", "runbook", "checklist", "marketing", "campaign", "social", "seo", "content", "ads", "legal", "contract", "compliance", "finance", "budget", "invoice", "payment", "supply chain", "accounting", "bookkeeping", "accounts payable", "accounts receivable"] },
  { dept: "HR",         keywords: ["hr", "human resources", "human resource", "hire", "hiring", "recruit", "recruitment", "onboard", "onboarding", "employee", "staff", "payroll", "benefits", "culture", "people", "interview", "performance", "training", "talent", "workforce", "headcount"] },
];

// Exact keyword match (used in Create Task modal title auto-detect)
function detectCategory(text) {
  const t = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => t.includes(kw))) return rule.dept;
  }
  return null;
}

// ── Quick-add: fuzzy parse ─────────────────────────────

// Levenshtein distance for fuzzy word matching
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Fuzzy category detection: exact substring OR Levenshtein-close words
function detectCategoryFuzzy(text) {
  const lower = text.toLowerCase();
  // First pass: check multi-word phrases and exact substrings from the full text
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (kw.includes(" ") && lower.includes(kw)) return rule.dept;
    }
  }
  // Second pass: word-by-word fuzzy matching
  const words = lower.split(/[\s,]+/);
  for (const rule of CATEGORY_RULES) {
    for (const word of words) {
      for (const kw of rule.keywords) {
        if (kw.includes(" ")) continue; // already handled above
        if (word === kw) return rule.dept; // exact match regardless of length
      }
      if (word.length < 3) continue; // skip fuzzy for short words
      for (const kw of rule.keywords) {
        if (kw.includes(" ")) continue;
        if (word.length >= 5 && kw.includes(word)) return rule.dept; // substring
        if (kw.length >= 5 && word.includes(kw)) return rule.dept;
        // fuzzy: allow 1 error per 5 chars (min 1)
        const maxDist = Math.max(1, Math.floor(Math.min(word.length, kw.length) / 5));
        if (word.length >= 4 && kw.length >= 4 && levenshtein(word, kw) <= maxDist) return rule.dept;
      }
    }
  }
  return null;
}

// Parse Indian-format date strings (DD/MM or DD/MM/YYYY) and natural phrases.
// Returns YYYY-MM-DD string using local date arithmetic (no UTC shift).
function parseDateString(str) {
  if (!str) return null;
  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  const ty = now.getFullYear(), tm = now.getMonth(), td = now.getDate();
  const localDate = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // m is 0-indexed
  const addLocalDays = (days) => {
    const r = new Date(ty, tm, td + days);
    return localDate(r.getFullYear(), r.getMonth(), r.getDate());
  };
  const lower = str.toLowerCase().trim();

  if (lower === "today") return localDate(ty, tm, td);
  if (lower === "tomorrow") return addLocalDays(1);
  if (lower === "next week") return addLocalDays(7);
  if (lower === "end of week" || lower === "eow") {
    const daysToFri = (5 - now.getDay() + 7) % 7 || 7;
    return addLocalDays(daysToFri);
  }

  const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  // "next friday" → the friday of next week, never this week
  const nextDayMatch = lower.match(/^next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (nextDayMatch) {
    const targetDay = DAYS.indexOf(nextDayMatch[1]);
    const base = new Date(ty, tm, td + 7); // jump forward a full week first
    const diff = (targetDay - base.getDay() + 7) % 7;
    const r = new Date(base.getFullYear(), base.getMonth(), base.getDate() + diff);
    return localDate(r.getFullYear(), r.getMonth(), r.getDate());
  }

  const dayIdx = DAYS.indexOf(lower);
  if (dayIdx !== -1) {
    const diff = (dayIdx - now.getDay() + 7) % 7 || 7;
    return addLocalDays(diff);
  }

  // DD/MM or DD/MM/YYYY — Indian date format (day first, then month)
  const parts = str.split("/");
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10); // 1-indexed
    let year = ty;
    if (parts[2]) {
      year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
    }
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    // If no year given and date is already past, push to next year
    if (!parts[2]) {
      const candidate = new Date(year, month - 1, day);
      const todayMidnight = new Date(ty, tm, td);
      if (candidate < todayMidnight) year += 1;
    }
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  return null;
}

function parseSearchDateQuery(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const weekdayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const nextMonthWeekday = normalized.match(/\bnext month\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (nextMonthWeekday) {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
      type: "month_weekday",
      year: nextMonth.getFullYear(),
      month: nextMonth.getMonth(),
      weekday: weekdayMap[nextMonthWeekday[1]],
    };
  }

  const exactParsed = parseDateString(normalized);
  if (exactParsed) {
    return { type: "exact", date: startOfDay(`${exactParsed}T00:00:00`) };
  }

  const nextWeekday = normalized.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (nextWeekday) {
    return { type: "exact", date: startOfDay(getNextWeekdayDate(weekdayMap[nextWeekday[1]])) };
  }

  return null;
}

// Extract date and category from free-text, return cleaned title
function parseQuickAdd(text) {
  let title = text.trim();
  let dueDate = null;
  let sharedNames = [];
  let projectName = "";

  // Date extraction patterns (in order of specificity)
  const DATE_PATTERNS = [
    // "by 4/3/2026", "due 4/3", "before friday", "until next week"
    /\b(?:by|due|before|until|deadline|on)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    /\b(?:by|due|before|until)\s+(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|tomorrow|today|next\s+week|end\s+of\s+(?:the\s+)?week|eow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    // trailing bare date: "... 4/3"
    /\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)$/,
  ];

  for (const pattern of DATE_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      const parsed = parseDateString(match[1].replace(/\s+/g, " "));
      if (parsed) {
        dueDate = parsed;
        title = title.replace(match[0], " ").replace(/\s{2,}/g, " ").trim();
        break;
      }
    }
  }

  const shareMatch = title.match(/\bshare with\s+(.+?)(?=\s+(?:in|for)\s+project\b|$)/i);
  if (shareMatch) {
    sharedNames = shareMatch[1]
      .split(/,| and /i)
      .map((name) => name.trim().replace(/^@/, ""))
      .filter(Boolean);
    title = title.replace(shareMatch[0], " ").replace(/\s{2,}/g, " ").trim();
  }

  const projectMatch = title.match(/\b(?:in|for)\s+project\s+(.+?)(?=\s+share with\b|$)/i);
  if (projectMatch) {
    projectName = projectMatch[1].trim();
    title = title.replace(projectMatch[0], " ").replace(/\s{2,}/g, " ").trim();
  }

  // Strip trailing punctuation/connectors left after date removal
  title = title.replace(/[,.\s-]+$/, "").trim();

  const dept = detectCategoryFuzzy(text); // detect from original text
  const product = detectProduct(text);

  return { title: title || text, dueDate, dept, product, sharedNames, projectName };
}

function resolveSharedUsers(sharedNames, users) {
  if (!sharedNames.length) return [];
  const normalizedNames = sharedNames.map((name) => name.toLowerCase());
  return users
    .filter((user) => user.id !== state.user?.id)
    .filter((user) => normalizedNames.some((name) => user.name.toLowerCase().includes(name) || user.email.toLowerCase().includes(name)))
    .map((user) => user.id);
}

function resolveProjectByName(projectName, projects) {
  if (!projectName) return null;
  const normalized = projectName.toLowerCase();
  return projects.find((project) => project.title.toLowerCase() === normalized)
    || projects.find((project) => project.title.toLowerCase().includes(normalized));
}

// Detect Nyalazone product names from text using fuzzy matching
const PRODUCT_RULES = [
  { product: "Leggero.ai", keywords: ["leggero", "legero", "leggro", "leggeroai"] },
  { product: "DMAP",       keywords: ["dmap"] },
  { product: "DDS",        keywords: ["dds"] },
  { product: "DCE",        keywords: ["dce"] },
];

function detectProduct(text) {
  // Strip dots/hyphens so "D.C.E." or "d-map" normalise to "dce"/"dmap"
  const normalized = text.toLowerCase().replace(/[.\-_/]/g, "");
  const words = normalized.split(/[\s,]+/);

  for (const rule of PRODUCT_RULES) {
    for (const word of words) {
      if (word.length < 3) continue;
      for (const kw of rule.keywords) {
        if (word === kw) return rule.product;                            // exact
        if (word.includes(kw) || kw.includes(word)) return rule.product; // substring
        // Levenshtein for words long enough to fuzz (avoids false positives on 3-char codes)
        const minLen = Math.min(word.length, kw.length);
        if (minLen >= 5 && levenshtein(word, kw) <= Math.max(1, Math.floor(minLen / 5))) {
          return rule.product;
        }
      }
    }
  }
  return null;
}

// ── Create Task ───────────────────────────────────────

async function getProjectSections(projectId) {
  if (!projectId) return [];
  const localSections = state.projectDetail.project?.id === projectId
    ? [...new Set([
        ...(state.projectDetail.project?.sections || []),
        ...state.projectDetail.sections,
        ...state.projectDetail.tasks.map((task) => task.section).filter(Boolean),
      ])]
    : [];
  if (localSections.length) return localSections.sort((a, b) => a.localeCompare(b));

  const project = state.projects.find((entry) => entry.id === projectId);
  if (project?.sections?.length) {
    return [...new Set(project.sections)].sort((a, b) => a.localeCompare(b));
  }

  const [outstanding, done] = await Promise.all([
    api(`/api/tasks?projectId=${projectId}&status=outstanding`).catch(() => []),
    api(`/api/tasks?projectId=${projectId}&status=done`).catch(() => []),
  ]);
  return [...new Set([...outstanding, ...done].map((task) => task.section).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

async function syncCreateTaskSectionField(projectId, selectedSection = null) {
  if (!createSectionField || !createSectionSelect) return;
  if (!projectId) {
    createSectionField.classList.add("hidden");
    createSectionSelect.innerHTML = `<option value="">No section</option>`;
    createSectionSelect.value = "";
    return;
  }
  const sections = await getProjectSections(projectId);
  createSectionSelect.innerHTML = `<option value="">No section</option>${
    sections.map((section) => `<option value="${escapeHtml(section)}">${escapeHtml(section)}</option>`).join("")
  }`;
  createSectionSelect.value = selectedSection && sections.includes(selectedSection) ? selectedSection : "";
  createSectionField.classList.remove("hidden");
}

async function refreshTaskViews(taskId = null) {
  await loadMyWork();
  await loadProjects();
  if (state.projectDetail.project && !projectDetailModal.classList.contains("hidden")) {
    await openProjectDetail(state.projectDetail.project.id);
  }
  if (state.tab === "gantt") await loadGlobalGantt();
  if (taskId && state.taskDetail.task?.id === taskId && !taskDetailModal.classList.contains("hidden")) {
    await openTaskDetail(taskId);
  }
}

async function openCreateTaskModal(projectIdOverride = null, sectionOverride = null) {
  state.editingTaskId = null;
  state.createTaskPrefillProjectId = projectIdOverride;
  state.createTaskPrefillSection = sectionOverride;
  document.getElementById("createTaskModalTitle").textContent = "Create New Task";
  document.querySelector("#createTaskForm .btn.dark").textContent = "Create Task";
  createDueInput.disabled = false;
  createDueInput.title = "";
  createDurationInput.disabled = false;
  createDurationInput.title = "";
  createTaskForm.reset();
  createStartInput.value = toDateInputValue(new Date().toISOString());
  populateProjectSelects();
  if (projectIdOverride) createProjectSelect.value = projectIdOverride;
  await syncCreateTaskSectionField(projectIdOverride || createProjectSelect.value || null, sectionOverride);
  createProjectField?.classList.remove("hidden");
  createProductField?.classList.remove("hidden");
  autoCategoryHint.textContent = "";
  shareWithList.innerHTML = `<span class="muted mini">Loading…</span>`;
  createTaskModal.classList.remove("hidden");

  // Fetch users to populate share-with list
  try {
    const users = await api("/api/users");
    const others = users.filter((u) => u.id !== state.user?.id);
    if (!others.length) {
      shareWithList.innerHTML = `<span class="muted mini">No other users to share with.</span>`;
    } else {
      shareWithList.innerHTML = buildSharePickerHtml(others, [], "share-checkbox");
      bindSharePicker(shareWithList, others, "share-checkbox");
    }
  } catch {
    shareWithList.innerHTML = `<span class="muted mini">Could not load users.</span>`;
  }

  // Wire up auto-categorize on title input
  const titleInput = document.getElementById("createTitle");
  const deptSelect = document.getElementById("createDept");
  titleInput.oninput = () => {
    const detected = detectCategory(titleInput.value);
    if (detected) {
      deptSelect.value = detected;
      autoCategoryHint.textContent = `Auto-detected: ${detected}`;
    } else {
      autoCategoryHint.textContent = "";
    }
  };
}

function closeCreateTaskModal() {
  createTaskModal.classList.add("hidden");
  state.editingTaskId = null;
  state.createTaskPrefillProjectId = null;
  state.createTaskPrefillSection = null;
  createProjectField?.classList.remove("hidden");
  createProductField?.classList.remove("hidden");
  createSectionField?.classList.add("hidden");
  if (createSectionSelect) {
    createSectionSelect.innerHTML = `<option value="">No section</option>`;
    createSectionSelect.value = "";
  }
  const titleInput = document.getElementById("createTitle");
  if (titleInput) titleInput.oninput = null;
}

async function onCreateTask(event) {
  event.preventDefault();
  const submitBtn = event.target.querySelector('[type="submit"]');
  const origText = submitBtn?.textContent;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Saving…"; }
  const title = document.getElementById("createTitle").value.trim();
  const dept = document.getElementById("createDept").value;
  const priority = document.getElementById("createPriority").value;
  const startDate = getCreateTaskStartValue();
  const dueDate = createDueInput.value;
  const duration = Number(createDurationInput.value || 0);
  const status = document.getElementById("createStatus").value;
  const product = document.getElementById("createProduct").value;
  const description = document.getElementById("createDesc").value.trim();
  const projectId = createProjectSelect.value;
  if (!title) return;
  const effectiveProjectId = projectId || null;
  const effectiveSection = effectiveProjectId ? (createSectionSelect?.value || state.createTaskPrefillSection || null) : null;
  const effectiveProduct = effectiveProjectId ? null : (product || null);
  const resolvedStartDate = `${startDate}T09:00:00.000Z`;
  const resolvedDueDate = dueDate
    ? toEndOfDayIso(dueDate)
    : Number.isFinite(duration) && duration > 0
      ? toEndOfDayIso(getCreateTaskDueValue(startDate, duration))
      : null;

  try {
    if (state.editingTaskId) {
      // Edit mode: PATCH existing task
      const editingTaskId = state.editingTaskId;
      const sharedWith = Array.from(shareWithList.querySelectorAll(".share-checkbox:checked")).map((el) => el.value);
      await api(`/api/tasks/${editingTaskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          department: dept || null,
          product: effectiveProduct,
          description,
          manualPriority: priority,
          startDate: resolvedStartDate,
          dueDate: resolvedDueDate,
          status,
          projectId: effectiveProjectId || null,
          section: effectiveSection,
          sharedWith,
        }),
      });
      closeCreateTaskModal();
      await refreshTaskViews(editingTaskId);
    } else {
      // Create mode
      const sharedWith = Array.from(shareWithList.querySelectorAll(".share-checkbox:checked")).map((el) => el.value);
      await api("/api/tasks/parse", {
        method: "POST",
        body: JSON.stringify({
          text: title,
          department: dept || null,
          product: effectiveProduct,
          description,
          manualPriority: priority,
          startDate: resolvedStartDate,
          dueDate: resolvedDueDate,
          status,
          sharedWith,
          projectId: effectiveProjectId || null,
          section: effectiveSection,
        }),
      });
      const returnProjectId = state.createTaskPrefillProjectId;
      closeCreateTaskModal();
      await refreshTaskViews();
      if (returnProjectId) await openProjectDetail(returnProjectId);
    }
  } catch (err) {
    const errEl = event.target.querySelector(".create-task-error");
    if (errEl) errEl.textContent = err.message || "Failed to save task. Please try again.";
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
  }
}

// ── Edit Task Modal ───────────────────────────────────

async function openEditModal(taskId) {
  const task = await api(`/api/tasks/${taskId}`);
  state.editingTaskId = taskId;

  document.getElementById("createTaskModalTitle").textContent = "Edit Task";
  document.querySelector("#createTaskForm .btn.dark").textContent = "Save Changes";

  // Pre-fill fields
  document.getElementById("createTitle").value = task.title || "";
  document.getElementById("createStatus").value = task.status || "todo";
  document.getElementById("createPriority").value = task.manualPriority || "";
  document.getElementById("createDept").value = task.department || "";
  document.getElementById("createProduct").value = task.product || "";
  createStartInput.value = toDateInputValue(task.startDate) || toDateInputValue(new Date().toISOString());
  createDurationInput.value = "";
  const dueInput = createDueInput;
  dueInput.value = task.dueDate ? task.dueDate.slice(0, 10) : "";
  const deadlineLocked = task.deadlineLocked && state.user?.role !== "manager";
  dueInput.disabled = deadlineLocked;
  createDurationInput.disabled = deadlineLocked;
  createProjectField?.classList.remove("hidden");
  createProductField?.classList.remove("hidden");
  dueInput.title = deadlineLocked ? "Deadline set by manager — cannot be changed" : "";
  populateProjectSelects();
  createProjectSelect.value = task.projectId || "";
  await syncCreateTaskSectionField(task.projectId || null, task.section || null);
  document.getElementById("createDesc").value = task.description || "";
  autoCategoryHint.textContent = "";
  shareWithList.innerHTML = `<span class="muted mini">Loading…</span>`;
  createTaskModal.classList.remove("hidden");

  try {
    const users = await api("/api/users");
    const others = users.filter((u) => u.id !== state.user?.id);
    if (!others.length) {
      shareWithList.innerHTML = `<span class="muted mini">No other users to share with.</span>`;
    } else {
      shareWithList.innerHTML = buildSharePickerHtml(others, task.sharedWith || [], "share-checkbox");
      bindSharePicker(shareWithList, others, "share-checkbox");
    }
  } catch {
    shareWithList.innerHTML = `<span class="muted mini">Could not load users.</span>`;
  }

  // Wire up auto-categorize on title input
  const titleInput = document.getElementById("createTitle");
  const deptSelect = document.getElementById("createDept");
  titleInput.oninput = () => {
    const detected = detectCategory(titleInput.value);
    if (detected) { deptSelect.value = detected; autoCategoryHint.textContent = `Auto-detected: ${detected}`; }
    else { autoCategoryHint.textContent = ""; }
  };
}

// ── Delete Task ───────────────────────────────────────

async function deleteTask(taskId) {
  await api(`/api/tasks/${taskId}`, { method: "DELETE" });
  await loadMyWork();
}

async function renameTask(taskId, currentTitle = "") {
  const nextTitle = window.prompt("Rename task", currentTitle);
  if (nextTitle === null) return;
  const title = nextTitle.trim();
  if (!title || title === currentTitle) return;
  await api(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  await loadMyWork();
  if (state.projectDetail.project) await openProjectDetail(state.projectDetail.project.id);
  if (state.tab === "gantt") await loadGlobalGantt();
  if (state.taskDetail.task?.id === taskId) await openTaskDetail(taskId);
}

async function renameProject(projectId, currentTitle = "") {
  const nextTitle = window.prompt("Rename project", currentTitle);
  if (nextTitle === null) return;
  const title = nextTitle.trim();
  if (!title || title === currentTitle) return;
  await api(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  await loadProjects();
  if (state.tab === "gantt") await loadGlobalGantt();
  if (state.projectDetail.project?.id === projectId) await openProjectDetail(projectId);
}

async function handleRenameProjectClick(projectId) {
  const project = state.projects.find((entry) => entry.id === projectId);
  if (!project) return;
  await renameProject(projectId, project.title || "");
}

async function handleRenameTaskClick(taskId) {
  const task = [...state.activeTasks, ...state.completedTasks, ...(state.deletedTasks || []), ...(state.projectDetail.tasks || [])]
    .find((entry) => entry.id === taskId);
  await renameTask(taskId, task?.title || "");
}

async function deleteProject(projectId) {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return;
  if (!confirm(`Delete project "${project.title}"? This cannot be undone.`)) return;
  try {
    await api(`/api/projects/${projectId}`, { method: "DELETE" });
    await loadProjects();
    if (state.tab === "gantt") await loadGlobalGantt();
  } catch (err) {
    alert(`Failed to delete project: ${err.message}`);
  }
}

// ── Manager ───────────────────────────────────────────

async function loadProjects() {
  const [projects, users] = await Promise.all([
    api("/api/projects"),
    api("/api/users"),
  ]);
  state.projects = projects;
  state.users = users;
  populateProjectSelects();
  renderProjects();
  projectFormStatus.textContent = "";
}

async function loadManager() {
  if (state.user.role !== "manager") return;
  const [users, outstanding, overdue, done, projects, pending] = await Promise.all([
    api("/api/users"),
    api("/api/tasks?scope=team&status=outstanding&sort=priority"),
    api("/api/tasks?scope=team&status=overdue&sort=priority"),
    api("/api/tasks?scope=team&status=done&sort=priority"),
    api("/api/projects"),
    api("/api/users/pending"),
  ]);
  state.users = users;
  state.projects = projects;
  state.teamTasks = { outstanding, overdue, done };
  renderAssignees(users);
  populateProjectSelects();
  populateWorkloadProjectFilter();
  populateTeamRoleFilters(users);
  renderTeamWorkload(users, outstanding, overdue, done, state.managerFilter);
  renderTeamSettings(users);
  renderViewTeam(users, projects, state.managerFilter);
  renderPendingApprovals(pending);
}

async function loadGlobalGantt() {
  const container = document.getElementById("ganttGlobalList");
  document.querySelectorAll("#ganttGlobalViewPills .gantt-view-pill").forEach((p) => {
    p.classList.toggle("active", p.dataset.view === (state.ganttGlobalView || "auto"));
  });
  container.innerHTML = `<p class="muted" style="padding:24px 0">Loading…</p>`;
  const scope = state.user?.role === "manager" ? "team" : "mine";
  const [projects, outstandingTasks, doneTasks, users] = await Promise.all([
    api("/api/projects"),
    api(`/api/tasks?scope=${scope}&status=outstanding`),
    api(`/api/tasks?scope=${scope}&status=done`),
    api("/api/users").catch(() => []),
  ]);
  const allTasks = [...outstandingTasks, ...doneTasks];
  state.projects = projects;
  if (users.length) state.users = users;
  if (!projects.length) {
    container.innerHTML = `<p class="muted" style="padding:24px 0">No projects found.</p>`;
    return;
  }
  const tasksByProject = {};
  for (const task of allTasks) {
    if (task.projectId) {
      if (!tasksByProject[task.projectId]) tasksByProject[task.projectId] = [];
      tasksByProject[task.projectId].push(task);
    }
  }
  container.innerHTML = projects.map((project) => {
    const tasks = tasksByProject[project.id] || [];
    const meta = [
      project.client ? `Client: ${escapeHtml(project.client)}` : null,
      `${tasks.length} task${tasks.length === 1 ? "" : "s"}`,
      project.deadline ? `Due ${formatDate(project.deadline)}` : null,
    ].filter(Boolean).join(" · ");
    if (!tasks.length) {
      const canManage = project.canManage;
      return `<div class="gantt-project-group card" data-project-id="${project.id}">
        <div class="gantt-project-label">
          <div style="flex:1;min-width:0;"><button class="gantt-project-title-btn" data-edit-project="${project.id}" type="button">${escapeHtml(project.title)}</button><span class="muted mini">${meta}</span></div>
          <button class="btn secondary small" data-open-project="${project.id}" type="button">Open</button>
          ${canManage ? `<button class="btn ghost small" data-delete-project="${project.id}" type="button">Delete</button>` : ""}
        </div>
        <p class="muted mini" style="padding:12px 0 4px">No tasks yet — open the project to add tasks.</p>
      </div>`;
    }
    const ganttView = state.ganttGlobalView || "auto";
    const { rangeStart, rangeEnd } = getGanttDateRange(tasks, project.deadline || addDays(new Date(), 7).toISOString(), ganttView);
    const canManage = project.canManage;
    const { rows } = buildProjectTimelineRows(tasks);
    return `<div class="gantt-project-group card" data-project-id="${project.id}">
      <div class="gantt-project-label">
        <div style="flex:1;min-width:0;">
          <button class="gantt-project-title-btn" data-edit-project="${project.id}" type="button">${escapeHtml(project.title)}</button>
          <span class="muted mini">${meta}</span>
        </div>
        <button class="btn secondary small" data-open-project="${project.id}" type="button">Open</button>
        ${canManage ? `<button class="btn ghost small" data-delete-project="${project.id}" type="button">Delete</button>` : ""}
      </div>
      ${buildTimelinePlannerHtml({ rows, rangeStart, rangeEnd, taskOpenMode: true, showTaskDelete: true, viewScale: ganttView === "quarter" ? "quarter" : null })}
    </div>`;
  }).join("");

  container.querySelectorAll(".gantt-project-group[data-project-id]").forEach((group) => {
    const projectId = group.dataset.projectId;
    const tasks = tasksByProject[projectId] || [];
    if (!tasks.length) return;
    const ganttView = state.ganttGlobalView || "auto";
    const { rangeStart, rangeEnd } = getGanttDateRange(tasks, addDays(new Date(), 7).toISOString(), ganttView);
    bindTimelinePlannerInteractions(group, tasks, rangeStart, rangeEnd, {
      onChange: async (task) => {
        await api(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ startDate: task.startDate, dueDate: task.dueDate }),
        });
      },
    });
    group.querySelectorAll(".pg-bar[data-task-id]").forEach((bar) => {
      bar.addEventListener("dblclick", async () => {
        const taskId = bar.dataset.taskId;
        if (!taskId) return;
        await openTaskDetail(taskId);
      });
    });
  });
}

function renderViewTeam(users, projects, filters = { teamRoleFilter: "", teamSort: "role" }) {
  const container = document.getElementById("teamList");
  if (!container) return;
  let members = users.filter((u) => u.role === "member" || u.role === "manager");
  if (filters.teamRoleFilter) {
    members = members.filter((u) => getShareableRoleLabel(u) === filters.teamRoleFilter);
  }
  members = members.sort((a, b) => {
    if (filters.teamSort === "name") return a.name.localeCompare(b.name);
    return getShareableRoleLabel(a).localeCompare(getShareableRoleLabel(b)) || a.name.localeCompare(b.name);
  });
  if (!members.length) {
    container.innerHTML = `<p class="muted mini">No team members yet.</p>`;
    return;
  }
  // Group by role
  const roleGroups = new Map();
  members.forEach((u) => {
    const label = getShareableRoleLabel(u);
    if (!roleGroups.has(label)) roleGroups.set(label, []);
    roleGroups.get(label).push(u);
  });
  container.innerHTML = Array.from(roleGroups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([role, group]) => {
      const cards = group.map((u) => {
        const assigned = projects.filter((p) => (p.memberIds || []).includes(u.id));
        return `<div class="view-team-card" title="${escapeHtml(u.email)}">
          <div class="view-team-identity">
            <div class="view-team-avatar">${escapeHtml((u.name || "?")[0].toUpperCase())}</div>
            <div class="view-team-info">
              <strong>${escapeHtml(u.name)}</strong>
              <p class="muted mini">${escapeHtml(u.email)}</p>
            </div>
          </div>
          ${assigned.length
            ? `<div class="view-team-projects">${assigned.map((p) => `<span class="view-team-project-tag">${escapeHtml(p.title)}</span>`).join("")}</div>`
            : `<p class="muted mini" style="margin:0">No projects</p>`}
        </div>`;
      }).join("");
      return `<div class="view-team-role-group">
        <span class="view-team-role-label">${escapeHtml(role)} (${group.length})</span>
        <div class="view-team-role-row">${cards}</div>
      </div>`;
    }).join("");
}

async function onAssignTask(event) {
  event.preventDefault();
  if (state.user.role !== "manager") return;
  const payload = {
    title: document.getElementById("assignTitle").value.trim(),
    assigneeId: document.getElementById("assignUser").value,
    startDate: toIsoDateTime(document.getElementById("assignStart").value),
    dueDate: toIsoDateTime(document.getElementById("assignDue").value, true),
    manualPriority: document.getElementById("assignPriority").value,
    department: document.getElementById("assignDept").value || null,
    projectId: assignProject.value || null,
  };
  await api("/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  assignForm.reset();
  await loadManager();
}

async function onProjectAssignTask(event) {
  event.preventDefault();
  if (state.user?.role !== "manager" || !state.projectDetail.project) return;
  const title = projectAssignTitle.value.trim();
  if (!title) return;
  await api("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      title,
      assigneeId: projectAssignUser.value,
      dueDate: toIsoDateTime(projectAssignDue.value, true),
      manualPriority: projectAssignPriority.value,
      projectId: state.projectDetail.project.id,
      description: `Assigned inside ${state.projectDetail.project.title}`,
    }),
  });
  projectAssignForm.reset();
  if (projectAssignUser.options.length) projectAssignUser.selectedIndex = 0;
  await openProjectDetail(state.projectDetail.project.id);
  await loadMyWork();
  if (state.user?.role === "manager") await loadManager();
}

function openProjectModal(projectId) {
  const project = projectId ? state.projects.find((p) => p.id === projectId) : null;
  document.getElementById("projectEditId").value = projectId || "";
  document.getElementById("projectModalTitle").textContent = project ? "Edit Project" : "Add Project";
  document.getElementById("projectModalSubmitBtn").textContent = project ? "Save Changes" : "Create Project";
  document.getElementById("projectTitle").value = project?.title || "";
  document.getElementById("projectDescription").value = project?.description || "";
  document.getElementById("projectDeadline").value = project?.deadline ? project.deadline.slice(0, 10) : "";
  document.getElementById("projectProduct").value = project?.product || "";
  document.getElementById("projectClient").value = project?.client || "";
  renderProjectMembers(state.users, project?.memberIds || []);
  projectFormModal.classList.remove("hidden");
  projectFormStatus.textContent = "";
}

function closeProjectModal() {
  projectFormModal.classList.add("hidden");
}

async function onCreateProject(event) {
  event.preventDefault();
  const editId = document.getElementById("projectEditId").value;
  const isEdit = !!editId;
  projectFormStatus.textContent = isEdit ? "Saving..." : "Creating...";
  try {
    const memberIds = Array.from(projectMembers.querySelectorAll(".project-member-checkbox:checked")).map((el) => el.value);
    const payload = {
      title: document.getElementById("projectTitle").value.trim(),
      description: document.getElementById("projectDescription").value.trim(),
      deadline: document.getElementById("projectDeadline").value ? toEndOfDayIso(document.getElementById("projectDeadline").value) : null,
      product: document.getElementById("projectProduct").value || null,
      client: document.getElementById("projectClient").value.trim() || null,
      memberIds,
    };
    if (isEdit) {
      await api(`/api/projects/${editId}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      await api("/api/projects", { method: "POST", body: JSON.stringify(payload) });
    }
    closeProjectModal();
    await loadProjects();
    projectFormStatus.textContent = isEdit ? "Saved." : "Project created.";
  } catch (error) {
    projectFormStatus.textContent = error.message || "Could not save project.";
  }
}

function populateProjectSelects() {
  const options = [`<option value="">None</option>`]
    .concat(state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.title)}</option>`))
    .join("");
  createProjectSelect.innerHTML = options;
  assignProject.innerHTML = options;

  // Populate client filter from projects
  const filterClient = document.getElementById("filterClient");
  if (filterClient) {
    const clients = [...new Set(state.projects.map((p) => p.client).filter(Boolean))].sort();
    const current = filterClient.value;
    filterClient.innerHTML = `<option value="">All Clients</option>` +
      clients.map((c) => `<option value="${escapeHtml(c)}" ${current === c ? "selected" : ""}>${escapeHtml(c)}</option>`).join("");
  }
}

function getShareableRoleLabel(user) {
  return (user.teamRole || user.role || "Team").trim();
}

function getCheckedValues(container, selector) {
  return Array.from(container.querySelectorAll(`${selector}:checked`)).map((el) => el.value);
}

function buildSharePickerHtml(users, selectedIds = [], checkboxClass = "share-checkbox") {
  const selectedSet = new Set(selectedIds);
  const roleGroups = new Map();
  users.forEach((user) => {
    const label = getShareableRoleLabel(user);
    if (!roleGroups.has(label)) roleGroups.set(label, []);
    roleGroups.get(label).push(user);
  });
  const roleActions = Array.from(roleGroups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, members]) => `
      <button class="btn secondary small share-role-btn" data-share-role="${escapeHtml(label)}" type="button">
        ${escapeHtml(label)} (${members.length})
      </button>`)
    .join("");
  const userRows = users.map((user) => `
    <label class="share-user-row">
      <input type="checkbox" class="${checkboxClass}" value="${user.id}" ${selectedSet.has(user.id) ? "checked" : ""} />
      <span class="share-user-name">${escapeHtml(user.name)}</span>
      <span class="share-user-role">${escapeHtml(getShareableRoleLabel(user))}</span>
    </label>`).join("");
  const checklist = `<div class="share-with-list">${userRows}</div>`;
  return `
    <div class="share-picker" data-checkbox-class="${checkboxClass}">
      <div class="share-picker-toolbar">
        <div class="share-role-actions">${roleActions}</div>
        <div class="share-picker-actions">
          <button class="btn ghost small" data-share-select="all" type="button">Select All</button>
          <button class="btn ghost small" data-share-select="none" type="button">Clear</button>
        </div>
      </div>
      ${users.length >= 5
        ? `<details class="share-picker-dropdown">
            <summary>Choose people (${users.length})</summary>
            ${checklist}
          </details>`
        : checklist}
    </div>`;
}

function bindSharePicker(container, users, checkboxClass) {
  container.querySelectorAll("[data-share-role]").forEach((button) => {
    button.addEventListener("click", () => {
      const role = button.getAttribute("data-share-role");
      const roleUserIds = users.filter((user) => getShareableRoleLabel(user) === role).map((user) => user.id);
      container.querySelectorAll(`.${checkboxClass}`).forEach((checkbox) => {
        if (roleUserIds.includes(checkbox.value)) checkbox.checked = true;
      });
    });
  });
  container.querySelectorAll("[data-share-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const shouldCheck = button.getAttribute("data-share-select") === "all";
      container.querySelectorAll(`.${checkboxClass}`).forEach((checkbox) => {
        checkbox.checked = shouldCheck;
      });
    });
  });
}

function renderProjectMembers(users, selectedIds = []) {
  const others = users.filter((user) => user.id !== state.user?.id);
  if (!others.length) {
    projectMembers.innerHTML = `<span class="muted mini">No teammates available.</span>`;
    return;
  }
  projectMembers.innerHTML = buildSharePickerHtml(others, selectedIds, "project-member-checkbox");
  bindSharePicker(projectMembers, others, "project-member-checkbox");
}

function syncProjectScopeVisibility() {
  projectMembersSection.classList.remove("hidden");
}

function renderProjects() {
  if (!state.projects.length) {
    projectGrid.innerHTML = `
      <div class="task-empty-state">
        <p>No projects yet</p>
        <span class="muted">Create a project, then assign or share tasks into it.</span>
      </div>`;
    return;
  }

  projectGrid.innerHTML = state.projects.map((project) => {
    const deadline = project.deadline ? formatDate(project.deadline) : "No deadline";
    const memberText = project.memberNames?.length ? project.memberNames.join(", ") : "Just you";
    const progress = project.taskCount ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
    const productBadge = project.product ? `<span class="product-badge product-${project.product.toLowerCase().replace(/\./g, "")}">${escapeHtml(project.product)}</span>` : "";
    const canManage = project.canManage;
    return `
      <article class="project-card" data-project-id="${project.id}" style="cursor:pointer">
        <div class="project-card-top">
          <div style="flex:1;min-width:0;">
            <button class="project-title-btn" data-rename-project="${project.id}" type="button">${escapeHtml(project.title)}</button>
            ${productBadge}
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <span class="project-progress">${progress}% done</span>
            ${canManage ? `<button class="btn ghost small" data-edit-project="${project.id}" type="button">Edit</button>` : ""}
            ${canManage ? `<button class="btn ghost small" data-delete-project="${project.id}" type="button">Delete</button>` : ""}
          </div>
        </div>
        <p class="muted">${escapeHtml(project.description || "No description added.")}</p>
        <div class="project-meta-grid">
          <span><strong>Deadline:</strong> ${deadline}</span>
          <span><strong>Tasks:</strong> ${project.taskCount}</span>
          <span><strong>Completed:</strong> ${project.completedTaskCount}</span>
          <span><strong>Assigned to:</strong> ${escapeHtml(memberText)}</span>
          ${project.client ? `<span style="grid-column:1/-1"><strong>Client:</strong> ${escapeHtml(project.client)}</span>` : ""}
        </div>
      </article>`;
  }).join("");
}

function renderAssignees(users) {
  const options = users
    .filter((u) => u.role === "member" || u.role === "manager")
    .map((u) => `<option value="${u.id}">${escapeHtml(u.name)} (${u.role})</option>`)
    .join("");
  assignUser.innerHTML = options;
  if (projectAssignUser) projectAssignUser.innerHTML = options;
}

function renderTeamWorkload(users, outstanding, overdue, done, filters = { product: "", projectId: "" }) {
  if (filters.product) {
    outstanding = outstanding.filter(task => task.product === filters.product);
    overdue = overdue.filter(task => task.product === filters.product);
    done = done.filter(task => task.product === filters.product);
  }
  if (filters.projectId) {
    outstanding = outstanding.filter(task => task.projectId === filters.projectId);
    overdue = overdue.filter(task => task.projectId === filters.projectId);
    done = done.filter(task => task.projectId === filters.projectId);
  }
  if (filters.role) {
    const allowedUserIds = new Set(
      users
        .filter((u) => getShareableRoleLabel(u) === filters.role)
        .map((u) => u.id)
    );
    outstanding = outstanding.filter((task) => allowedUserIds.has(task.assigneeId));
    overdue = overdue.filter((task) => allowedUserIds.has(task.assigneeId));
    done = done.filter((task) => allowedUserIds.has(task.assigneeId));
    users = users.filter((u) => allowedUserIds.has(u.id));
  }
  const byAssignee = new Map();
  users.forEach((u) => {
    if (u.role !== "member" && u.role !== "manager") return;
    byAssignee.set(u.id, { user: u, outstanding: [], overdueCount: 0, doneCount: 0 });
  });

  outstanding.forEach((task) => { const b = byAssignee.get(task.assigneeId); if (b) b.outstanding.push(task); });
  overdue.forEach((task) => { const b = byAssignee.get(task.assigneeId); if (b) b.overdueCount += 1; });
  done.forEach((task) => { const b = byAssignee.get(task.assigneeId); if (b) b.doneCount += 1; });

  const cards = Array.from(byAssignee.values())
    .sort((a, b) => b.outstanding.length - a.outstanding.length || b.overdueCount - a.overdueCount)
    .map((entry) => {
      const taskItems = entry.outstanding.length
        ? entry.outstanding.map((task) => {
            const dueText = task.dueDate ? formatDate(task.dueDate) : "No deadline";
            return `<li><strong>${escapeHtml(task.title)}</strong><span>${dueText} | ${capitalizeTaskStatus(task.status)}</span></li>`;
          }).join("")
        : `<li class="muted">No outstanding tasks.</li>`;
      const cardId = `ec-${entry.user.id}`;
      return `
        <article class="employee-card">
          <div class="team-setting-head">
            <h4>${escapeHtml(entry.user.name)}</h4>
            <span class="share-user-role">${escapeHtml(getShareableRoleLabel(entry.user))}</span>
          </div>
          <p class="muted">${escapeHtml(entry.user.email)}</p>
          <div class="employee-metrics">
            <span>Outstanding: ${entry.outstanding.length}</span>
            <span>Overdue: ${entry.overdueCount}</span>
            <span>Done: ${entry.doneCount}</span>
            ${entry.outstanding.length > 0 ? `<button class="employee-tasks-toggle" data-target="${cardId}" type="button" title="Show tasks">›</button>` : ""}
          </div>
          <ul class="employee-task-list" id="${cardId}">${taskItems}</ul>
        </article>`;
    }).join("");

  teamWorkload.innerHTML = cards || `<p class="muted">No team members found.</p>`;

  teamWorkload.querySelectorAll(".employee-tasks-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const list = document.getElementById(btn.dataset.target);
      const expanded = list.classList.toggle("expanded");
      btn.classList.toggle("expanded", expanded);
      btn.title = expanded ? "Hide tasks" : "Show tasks";
    });
  });
}

function renderTeamSettings(users) {
  const editable = users.filter((user) => user.role === "member" || user.role === "manager");
  teamSettings.innerHTML = editable.map((user) => `
    <article class="team-setting-card" data-user-card="true" data-user-id="${user.id}">
      <div class="team-setting-head">
        <div>
          <h4>${escapeHtml(user.name)}</h4>
          <p class="muted mini">${escapeHtml(user.email)}</p>
        </div>
        <span class="share-user-role team-setting-system-role-display">${escapeHtml(user.role)}</span>
      </div>
      <div class="team-setting-view-mode">
        <span class="muted mini">Job title:</span>
        <span class="team-setting-role-display">${escapeHtml(user.teamRole || "—")}</span>
      </div>
      <div class="team-setting-edit-mode hidden">
        <label>Job title</label>
        ${(() => {
          const known = ["Frontend", "Backend", "HR", "Operations", "Business"];
          const cur = user.teamRole || "";
          const isKnown = known.includes(cur);
          const sel = isKnown ? cur : (cur ? "other" : "");
          const custom = isKnown ? "" : cur;
          return `
        <select data-field="team-role" onchange="const c=this.closest('[data-user-card]').querySelector('[data-field=team-role-custom]');c.classList.toggle('hidden',this.value!=='other')">
          <option value="">— select —</option>
          ${known.map(r => `<option value="${r}"${sel === r ? " selected" : ""}>${r}</option>`).join("")}
          <option value="other"${sel === "other" ? " selected" : ""}>Other...</option>
        </select>
        <input data-field="team-role-custom" type="text" value="${escapeHtml(custom)}" placeholder="Enter role..." style="margin-top:6px" class="${sel === "other" ? "" : "hidden"}" />`;
        })()}
        <label style="margin-top:6px">System access</label>
        <select data-field="user-role">
          <option value="member" ${user.role === "member" ? "selected" : ""}>Member</option>
          <option value="manager" ${user.role === "manager" ? "selected" : ""}>Manager</option>
        </select>
      </div>
      <div class="team-setting-actions">
        <button class="btn ghost small" data-action="remove-user" data-user-id="${user.id}" type="button">Remove</button>
        <span class="muted mini" data-field="status"></span>
        <button class="btn secondary small" data-action="edit-user" data-user-id="${user.id}" type="button">Edit</button>
        <button class="btn primary small hidden" data-action="save-user" data-user-id="${user.id}" type="button">Save</button>
      </div>
    </article>
  `).join("");
}

function populateWorkloadProjectFilter() {
  const sel = document.getElementById("workloadFilterProject");
  if (!sel) return;
  const existing = Array.from(sel.options).map(o => o.value);
  state.projects.forEach(p => {
    if (!existing.includes(p.id)) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.title;
      sel.appendChild(opt);
    }
  });
}

function populateTeamRoleFilters(users) {
  const roles = [...new Set(
    users
      .filter((u) => u.role === "member" || u.role === "manager")
      .map((u) => getShareableRoleLabel(u))
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  [
    { id: "workloadFilterRole", current: state.managerFilter.role, defaultLabel: "All Roles" },
    { id: "viewTeamRoleFilter", current: state.managerFilter.teamRoleFilter, defaultLabel: "All Roles" },
  ].forEach(({ id, current, defaultLabel }) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = `<option value="">${defaultLabel}</option>` + roles.map((role) =>
      `<option value="${escapeHtml(role)}" ${current === role ? "selected" : ""}>${escapeHtml(role)}</option>`
    ).join("");
  });
  const sortSelect = document.getElementById("viewTeamSort");
  if (sortSelect) sortSelect.value = state.managerFilter.teamSort || "role";
}

function renderPendingApprovals(pending) {
  const container = document.getElementById("pendingApprovalsList");
  if (!container) return;
  if (!pending.length) {
    container.innerHTML = `<p class="muted mini">No pending requests.</p>`;
    return;
  }
  container.innerHTML = pending.map(u => `
    <div class="pending-approval-row">
      <div class="pending-approval-info">
        <strong>${escapeHtml(u.name)}</strong>
        <span class="muted mini">${escapeHtml(u.email)}</span>
        ${u.teamRole ? `<span class="share-user-role">${escapeHtml(u.teamRole)}</span>` : ""}
      </div>
      <div class="pending-approval-actions">
        <button class="btn primary small" data-approve-user="${u.id}" type="button">Approve</button>
        <button class="btn ghost small" data-reject-user="${u.id}" type="button">Reject</button>
      </div>
    </div>
  `).join("");
  container.querySelectorAll("[data-approve-user]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await api(`/api/users/${btn.dataset.approveUser}/approve`, { method: "POST" });
      await loadManager();
    });
  });
  container.querySelectorAll("[data-reject-user]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Reject and delete this account request?")) return;
      await api(`/api/users/${btn.dataset.rejectUser}/reject`, { method: "POST" });
      await loadManager();
    });
  });
}

// ── Calendar ──────────────────────────────────────────

function renderCalendar(events, from, to, projects = []) {
  calPeriodLabel.textContent = formatPeriodLabel(calendarRange.value, from, to);

  const range = calendarRange.value;
  const days = range === "quarter"
    ? allDaysInRange(startOfWeekSunday(from), endOfWeekSaturday(to))
    : allDaysInRange(from, to);
  const grouped = groupBy(events, (event) => event.dueDate.slice(0, 10));

  // Group project deadlines by date
  const projectsByDate = {};
  for (const p of projects) {
    if (p.deadline) {
      const key = localDateKey(new Date(p.deadline.slice(0, 10) + "T12:00:00"));
      if (!projectsByDate[key]) projectsByDate[key] = [];
      projectsByDate[key].push(p);
    }
  }

  if (!days.length) {
    calendarGrid.innerHTML = `<p class="muted mini">No days in range.</p>`;
    return;
  }

  calendarGrid.innerHTML = days.map((day) => {
    const key = localDateKey(day);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const taskCards = (grouped[key] || []).map((event) => {
      const importanceClass = `importance-${event.importanceLevel || "low"}`;
      return `
        <div class="calendar-item ${importanceClass} ${event.status === "done" ? "done" : ""}" data-task-id="${event.id}" style="cursor:pointer" title="Click to view details">
          <button class="calendar-item-delete task-delete-btn" data-calendar-delete-task="${event.id}" type="button" title="Delete task">✕</button>
          <strong>${escapeHtml(event.title)}</strong>
          <p>${escapeHtml(event.assigneeName)} | ${capitalizeTaskStatus(event.status)}</p>
        </div>`;
    }).join("");
    const projectCards = (projectsByDate[key] || []).map((p) => `
      <div class="calendar-item calendar-project-deadline" data-project-id="${p.id}" style="cursor:pointer" title="Project deadline">
        <strong>📁 ${escapeHtml(p.title)}</strong>
        <p>Project deadline</p>
      </div>`).join("");
    const cards = projectCards + taskCards;
    return `
      <section class="calendar-day ${cards ? "has-items" : ""} ${isWeekend ? "weekend" : ""}">
        <h4>${formatDayHeading(day)}</h4>
        ${cards || `<p class="muted mini" style="opacity:0.5">—</p>`}
      </section>`;
  }).join("");
}

function exportIcs() {
  window.open("/api/calendar/export.ics?scope=mine", "_blank");
}

// ── Gantt (hidden) ────────────────────────────────────

async function loadGantt() {
  if (!state.user || !ganttList) return;
  const scope = state.user.role === "manager" && state.tab === "manager" ? "team" : "mine";
  const tasks = await api(`/api/gantt?scope=${scope}`);
  renderGantt(tasks);
}

function renderGantt(tasks) {
  if (!ganttList) return;
  if (!tasks.length) {
    ganttList.innerHTML = "";
    return;
  }
  const scaleValue = ganttScale?.value ?? "week";
  const scaleDays = scaleValue === "quarter" ? 90 : scaleValue === "month" ? 30 : 7;
  const rangeStart = startOfDay(new Date());
  const rangeEnd = addDays(rangeStart, scaleDays - 1);
  const totalMs = rangeEnd.getTime() - rangeStart.getTime() || 1;

  ganttList.innerHTML = tasks.map((task) => {
    const start = startOfDay(new Date(task.startDate || new Date()));
    const due = startOfDay(new Date(task.dueDate || addDays(start, 5)));
    const leftPct = clampPct(((start.getTime() - rangeStart.getTime()) / totalMs) * 100);
    const widthPct = Math.max(4, clampPct(((due.getTime() - start.getTime()) / totalMs) * 100));
    return `<div class="gantt-row" data-id="${task.id}">
      <div class="gantt-title">${escapeHtml(task.title)}</div>
      <div class="gantt-track">
        <div class="gantt-bar" style="left:${leftPct}%; width:${widthPct}%"></div>
      </div>
    </div>`;
  }).join("");
}

// ── Task status update ────────────────────────────────

async function updateTaskStatus(taskId, status) {
  await api(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (state.tab === "manager" && state.user?.role === "manager") {
    await loadManager();
  } else {
    await loadMyWork();
  }
}

// ── Task Detail / Phase Gantt ─────────────────────────

async function openTaskDetail(taskId) {
  const [task, users] = await Promise.all([
    api(`/api/tasks/${taskId}`),
    api("/api/users").catch(() => []),
  ]);
  state.taskDetail.task = task;
  state.taskDetail.phases = Array.isArray(task.phases) ? [...task.phases] : [];
  if (users.length) state.users = users;
  tdTitle.innerHTML = `<button class="task-modal-title-btn" data-rename-task="${task.id}" type="button">${escapeHtml(task.title)}</button>`;
  const startText = task.startDate ? formatDate(task.startDate) : "No start date";
  const dueText = task.dueDate ? formatDate(task.dueDate) : "No deadline";
  const priority = getPriorityLabel(task.manualPriority);
  tdMeta.textContent = `${startText} → ${dueText}  ·  ${capitalizeTaskStatus(task.status)}  ·  ${priority} Priority`;
  const tdBody = document.getElementById("tdBody");
  const currentShared = Array.isArray(task.sharedWith) ? task.sharedWith : [];
  const shareableUsers = users.filter((u) => u.id !== task.assigneeId && u.id !== state.user?.id);
  tdBody.innerHTML = `
    ${task.description ? `<p style="margin:0;font-size:0.9rem;color:#374151;">${escapeHtml(task.description)}</p>` : ""}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.84rem;">
      <div><span style="color:#6b7280;font-weight:500;">Category</span><br><span>${escapeHtml(task.department || "—")}</span></div>
      <div><span style="color:#6b7280;font-weight:500;">Product</span><br><span>${escapeHtml(task.product || "—")}</span></div>
      <div><span style="color:#6b7280;font-weight:500;">Project</span><br><span>${escapeHtml(task.projectName || "—")}</span></div>
      <div><span style="color:#6b7280;font-weight:500;">Assignee</span><br><span>${escapeHtml(task.assigneeName || "—")}</span></div>
      ${task.section ? `<div style="grid-column:1/-1"><span style="color:#6b7280;font-weight:500;">Section</span><br><span>${escapeHtml(task.section)}</span></div>` : ""}
    </div>
    ${shareableUsers.length ? `
    <div class="td-share-section">
      <p style="margin:0 0 8px;font-size:0.82rem;font-weight:600;color:#374151;">Shared with</p>
      <div class="td-share-list" id="tdShareList">
        ${shareableUsers.map((u) => `
          <label class="td-share-user">
            <input type="checkbox" value="${u.id}" ${currentShared.includes(u.id) ? "checked" : ""} />
            <span>${escapeHtml(u.name)}</span>
            <span class="muted mini">${escapeHtml(u.email)}</span>
          </label>`).join("")}
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:10px;">
        <button class="btn primary small" id="tdSaveShareBtn" type="button">Save sharing</button>
        <span id="tdShareStatus" class="muted mini"></span>
      </div>
    </div>` : ""}`;
  taskDetailModal.classList.remove("hidden");
  document.querySelector("#tdTitle [data-rename-task]")?.addEventListener("click", async (e) => {
    await handleRenameTaskClick(e.currentTarget.getAttribute("data-rename-task"));
  });
  document.getElementById("tdSaveShareBtn")?.addEventListener("click", async () => {
    const checks = [...document.querySelectorAll("#tdShareList input[type=checkbox]")];
    const sharedWith = checks.filter((c) => c.checked).map((c) => c.value);
    const statusEl = document.getElementById("tdShareStatus");
    statusEl.textContent = "Saving…";
    try {
      await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ sharedWith }) });
      statusEl.textContent = "Saved!";
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
      await loadMyWork();
    } catch {
      statusEl.textContent = "Failed";
    }
  });
}

function renderPhaseGantt() {
  const { task, phases } = state.taskDetail;
  if (!task) return;

  const rangeStart = startOfDay(new Date(task.startDate || task.createdAt));
  const rangeEnd = startOfDay(new Date(task.dueDate || addDays(new Date(task.createdAt), 7)));
  const totalMs = Math.max(rangeEnd.getTime() - rangeStart.getTime(), 24 * 60 * 60 * 1000);
  const todayMs = startOfDay(new Date()).getTime();
  const todayPct = clampPct(((todayMs - rangeStart.getTime()) / totalMs) * 100);
  const spanDays = Math.round(totalMs / (1000 * 60 * 60 * 24));
  const labelCount = spanDays <= 7 ? spanDays : spanDays <= 21 ? 7 : spanDays <= 60 ? 6 : 8;

  const axisLabels = Array.from({ length: labelCount + 1 }, (_, i) => {
    const date = addDays(rangeStart, Math.round((spanDays / labelCount) * i));
    const pct = clampPct(((date.getTime() - rangeStart.getTime()) / totalMs) * 100);
    return { date, pct };
  });
  const scale = spanDays <= 14 ? "week" : "month";

  const axisHtml = `
    <div class="pg-axis-row">
      <div class="pg-name-spacer"></div>
      <div class="pg-axis-track">
        ${axisLabels.map((l) => `<span class="pg-axis-label" style="left:${l.pct}%">${formatGanttLabel(l.date, scale)}</span>`).join("")}
        ${todayPct >= 0 && todayPct <= 100 ? `<div class="pg-today-line" style="left:${todayPct}%"><span class="pg-today-label">Today</span></div>` : ""}
      </div>
    </div>`;

  function buildBarRowsHtml() {
    return phases.map((phase) => {
      const phStart = startOfDay(new Date(phase.startDate || task.startDate || task.createdAt));
      const phDue = startOfDay(new Date(phase.dueDate || task.dueDate || addDays(new Date(), 3)));
      const leftPct = clampPct(((phStart.getTime() - rangeStart.getTime()) / totalMs) * 100);
      const widthPct = Math.max(2, clampPct(((phDue.getTime() - phStart.getTime()) / totalMs) * 100));
      const statusCls = phase.status === "done" ? "pg-bar-done" : phase.status === "in_progress" ? "pg-bar-inprogress" : "";
      return `
        <div class="pg-bar-row">
          <div class="pg-bar-row-label" title="${escapeHtml(phase.title)}">${escapeHtml(phase.title)}</div>
          <div class="pg-bar-track">
            ${todayPct >= 0 && todayPct <= 100 ? `<div class="pg-today-tick" style="left:${todayPct}%"></div>` : ""}
            <div class="pg-bar ${statusCls}" style="left:${leftPct}%; width:${widthPct}%">
              ${widthPct > 12 ? `<span class="pg-bar-label">${escapeHtml(phase.title)}</span>` : ""}
            </div>
          </div>
        </div>`;
    }).join("");
  }

  function buildEditRowsHtml() {
    return phases.map((phase, idx) => `
      <div class="pg-edit-row">
        <input class="pg-name-input" type="text" value="${escapeHtml(phase.title)}" data-idx="${idx}" placeholder="Phase name" />
        <input class="pg-start-input" type="date" value="${toDateInputValue(phase.startDate)}" data-idx="${idx}" />
        <input class="pg-due-input" type="date" value="${toDateInputValue(phase.dueDate)}" data-idx="${idx}" />
        <select class="pg-status-select" data-idx="${idx}">
          <option value="todo" ${phase.status === "todo" ? "selected" : ""}>To Do</option>
          <option value="in_progress" ${phase.status === "in_progress" ? "selected" : ""}>In Progress</option>
          <option value="done" ${phase.status === "done" ? "selected" : ""}>Done</option>
        </select>
        <button class="pg-delete-btn btn ghost small" data-idx="${idx}" type="button">×</button>
      </div>`).join("");
  }

  const noPhases = !phases.length;

  tdPhaseGantt.innerHTML = `
    <div class="pg-visual">
      ${axisHtml}
      <div class="pg-bar-rows">
        ${noPhases ? `<p class="muted mini" style="padding:12px 0 4px">No phases yet — click "+ Add Phase" to build out your timeline.</p>` : buildBarRowsHtml()}
      </div>
    </div>
    ${noPhases ? "" : `
    <div class="pg-edit-section">
      <div class="pg-edit-head">
        <div>Phase Name</div><div>Start</div><div>End</div><div>Status</div><div></div>
      </div>
      <div class="pg-edit-rows">${buildEditRowsHtml()}</div>
    </div>`}`;

  tdPhaseGantt.querySelectorAll(".pg-name-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      state.taskDetail.phases[idx].title = e.currentTarget.value;
      const labels = tdPhaseGantt.querySelectorAll(".pg-bar-row-label");
      if (labels[idx]) labels[idx].textContent = e.currentTarget.value;
    });
  });

  tdPhaseGantt.querySelectorAll(".pg-start-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      const val = e.currentTarget.value;
      if (val) {
        state.taskDetail.phases[idx].startDate = `${val}T09:00:00.000Z`;
        tdPhaseGantt.querySelector(".pg-bar-rows").innerHTML = buildBarRowsHtml();
      }
    });
  });

  tdPhaseGantt.querySelectorAll(".pg-due-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      const val = e.currentTarget.value;
      if (val) {
        state.taskDetail.phases[idx].dueDate = toEndOfDayIso(val);
        tdPhaseGantt.querySelector(".pg-bar-rows").innerHTML = buildBarRowsHtml();
      }
    });
  });

  tdPhaseGantt.querySelectorAll(".pg-status-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      state.taskDetail.phases[idx].status = e.currentTarget.value;
      tdPhaseGantt.querySelector(".pg-bar-rows").innerHTML = buildBarRowsHtml();
    });
  });

  tdPhaseGantt.querySelectorAll(".pg-delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      state.taskDetail.phases.splice(idx, 1);
      renderPhasePlannerGantt();
    });
  });
}

function addPhase() {
  const { task, phases } = state.taskDetail;
  if (!task) return;
  const last = phases[phases.length - 1];
  const phaseStart = last?.dueDate || task.startDate || new Date().toISOString();
  const phaseDue = task.dueDate || addDays(new Date(phaseStart), 3).toISOString();
  phases.push({
    id: `new_${Date.now()}`,
    title: `Phase ${phases.length + 1}`,
    startDate: phaseStart,
    dueDate: phaseDue,
    status: "todo",
    createdAt: new Date().toISOString(),
  });
  renderPhasePlannerGantt();
}

async function savePhases() {
  const { task, phases } = state.taskDetail;
  if (!task) return;
  tdSaveStatus.textContent = "Saving…";
  try {
    await api(`/api/tasks/${task.id}/phases`, {
      method: "PUT",
      body: JSON.stringify({ phases }),
    });
    tdSaveStatus.textContent = "Saved!";
    if (state.projectDetail.project?.id === task.projectId) {
      await openProjectDetail(task.projectId);
    }
    if (state.tab === "gantt") {
      await loadGlobalGantt();
    }
    await loadMyWork();
    setTimeout(() => { tdSaveStatus.textContent = ""; }, 2500);
  } catch {
    tdSaveStatus.textContent = "Save failed";
  }
}

function bindProjectQuickAdd() {
  if (!projectQuickAddInput) return;
  projectQuickAddInput.addEventListener("input", () => {
    const text = projectQuickAddInput.value.trim();
    if (!text) {
      projectQuickAddFeedback.textContent = "";
      return;
    }
    const parsed = parseQuickAdd(text);
    const parts = [];
    if (parsed.dueDate) parts.push(`Deadline: ${new Date(parsed.dueDate + "T12:00:00").toLocaleDateString()}`);
    if (parsed.sharedNames.length) parts.push(`Shared: ${parsed.sharedNames.join(", ")}`);
    projectQuickAddFeedback.textContent = parts.join("  ·  ");
  });

  projectQuickAddInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const text = projectQuickAddInput.value.trim();
    if (!text || !state.projectDetail.project) return;
    projectQuickAddInput.disabled = true;
    const activeSection = projectQuickAddInput.dataset.section || state.projectDetail.activeSection || null;
    try {
      await createTaskFromNaturalText(text, state.projectDetail.project.id, activeSection);
      projectQuickAddInput.value = "";
      projectQuickAddFeedback.textContent = "";
      await openProjectDetail(state.projectDetail.project.id);
      await loadMyWork();
    } finally {
      projectQuickAddInput.disabled = false;
      projectQuickAddInput.focus();
    }
  });
}

async function createTaskFromNaturalText(text, projectId = null, section = null) {
  const parsed = parseQuickAdd(text);
  const users = state.users.length ? state.users : await api("/api/users");
  state.users = users;
  const projects = state.projects.length ? state.projects : await api("/api/projects");
  state.projects = projects;
  const sharedWith = resolveSharedUsers(parsed.sharedNames, users);
  const project = projectId
    ? projects.find((entry) => entry.id === projectId)
    : resolveProjectByName(parsed.projectName, projects);
  return api("/api/tasks/parse", {
    method: "POST",
    body: JSON.stringify({
      text: parsed.title || text,
      department: parsed.dept || null,
      product: parsed.product || null,
      dueDate: parsed.dueDate ? toEndOfDayIso(parsed.dueDate) : null,
      sharedWith,
      projectId: project?.id ?? null,
      section: section || null,
    }),
  });
}

async function openProjectDetail(projectId) {
  const project = state.projects.find((entry) => entry.id === projectId);
  if (!project) return;
  const scope = state.user?.role === "manager" ? "team" : "mine";
  const [outstanding, done] = await Promise.all([
    api(`/api/tasks?scope=${scope}&status=outstanding&sort=priority&projectId=${encodeURIComponent(projectId)}`),
    api(`/api/tasks?scope=${scope}&status=done&sort=priority&projectId=${encodeURIComponent(projectId)}`),
  ]);
  state.projectDetail.project = project;
  state.projectDetail.tasks = [...outstanding, ...done];
  state.projectDetail.sections = [...new Set([
    ...(project.sections || []),
    ...outstanding.map((t) => t.section).filter(Boolean),
    ...done.map((t) => t.section).filter(Boolean),
  ])];
  state.projectDetail.activeSection = "";
  state.projectDetail.ganttView = "auto";
  document.querySelectorAll("#ganttViewPills .gantt-view-pill").forEach((p) => p.classList.toggle("active", p.dataset.view === "auto"));
  renderAssignees(state.users);
  renderProjectPlanner();
  projectDetailModal.classList.remove("hidden");
  bindSectionManagement();
}

function renderProjectPlanner() {
  const { project, tasks } = state.projectDetail;
  if (!project) return;
  const activeSection = state.projectDetail.activeSection || "";
  const visibleTasks = activeSection
    ? tasks.filter((task) => (task.section || "") === activeSection)
    : tasks;

  pdTitle.innerHTML = `<button class="project-modal-title-btn" data-rename-project="${project.id}" type="button">${escapeHtml(project.title)}</button>`;
  const deadlineText = project.deadline ? formatDate(project.deadline) : "No deadline";
  pdMeta.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}  ·  Deadline ${deadlineText}`;

  renderSectionPills();

  if (!tasks.length && !state.projectDetail.sections.length) {
    pdPlanner.innerHTML = `
      <div class="task-empty-state">
        <p>No tasks in this project yet</p>
        <span class="muted">Use "+ Add Task" or add tasks within a section.</span>
      </div>`;
    return;
  }

  // Show sections-only view when sections exist but no tasks yet
  if (!tasks.length) {
    const rangeStart = startOfDay(new Date());
    const rangeEnd = startOfDay(addDays(new Date(), 14));
    const ganttRows = state.projectDetail.sections.map((s) => ({ type: "section", title: s }));
    pdPlanner.innerHTML = buildTimelinePlannerHtml({ rows: ganttRows, rangeStart, rangeEnd, emptyText: "" });
    pdPlanner.querySelectorAll(".pg-section-add-task-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const secName = btn.dataset.section;
        state.projectDetail.activeSection = secName;
        renderSectionPills();
        projectDetailModal.classList.add("hidden");
        openCreateTaskModal(state.projectDetail.project?.id || null, secName);
      });
    });
    return;
  }

  if (!visibleTasks.length && activeSection) {
    pdPlanner.innerHTML = `
      <div class="task-empty-state">
        <p>No tasks in ${escapeHtml(activeSection)}</p>
        <span class="muted">Select another section or add a task into this section.</span>
      </div>`;
    return;
  }

  const ganttView = state.projectDetail.ganttView || "auto";
  const { rangeStart, rangeEnd: initialRangeEnd } = getGanttDateRange(visibleTasks, project.deadline || addDays(new Date(), 14).toISOString(), ganttView);
  const rangeEnd = ganttView === "auto" && initialRangeEnd <= addDays(rangeStart, 14)
    ? addDays(rangeStart, 14)
    : initialRangeEnd;

  const { rows: ganttRows, allSections: sections } = buildProjectTimelineRows(visibleTasks, state.projectDetail.sections);
  const editGridHtml = `
    <div class="pg-edit-section">
      <div class="pg-edit-head">
        <div>Task</div><div>Section</div><div>Start</div><div>End</div><div>Status</div><div></div>
      </div>
      <div class="pg-edit-rows">
        ${visibleTasks.map((task) => {
          const idx = tasks.findIndex((entry) => entry.id === task.id);
          return `
          <div class="pg-edit-row">
            <input class="pg-name-input project-task-name" type="text" data-task-idx="${idx}" value="${escapeHtml(task.title)}" />
            <select class="pg-section-select" data-task-idx="${idx}">
              <option value="">No section</option>
              ${sections.map((s) => `<option value="${escapeHtml(s)}" ${task.section === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
            </select>
            <input class="pg-task-start-input" type="date" data-task-idx="${idx}" value="${toDateInputValue(task.startDate)}" />
            <input class="pg-task-due-input" type="date" data-task-idx="${idx}" value="${toDateInputValue(task.dueDate)}" />
            <select class="pg-task-status-select" data-task-idx="${idx}">
              <option value="todo" ${task.status === "todo" ? "selected" : ""}>To Do</option>
              <option value="in_progress" ${task.status === "in_progress" ? "selected" : ""}>In Progress</option>
              <option value="done" ${task.status === "done" ? "selected" : ""}>Done</option>
            </select>
            <div class="pg-task-actions">
              <button class="pg-edit-task-btn btn ghost small" data-task-action="open" data-task-id="${task.id}" type="button">Edit</button>
              <button class="task-delete-btn pg-task-delete-inline" data-task-action="delete" data-task-id="${task.id}" type="button" title="Delete task">✕</button>
            </div>
          </div>
        `;
        }).join("")}
      </div>
    </div>`;

  pdPlanner.innerHTML = buildTimelinePlannerHtml({
    rows: ganttRows,
    rangeStart,
    rangeEnd,
    emptyText: "",
    showTaskRename: true,
    viewScale: ganttView === "quarter" ? "quarter" : null,
  }) + editGridHtml;

  // Bind all events after a single innerHTML set
  pdPlanner.querySelectorAll(".pg-section-add-task-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const secName = btn.dataset.section;
      state.projectDetail.activeSection = secName;
      renderSectionPills();
      projectDetailModal.classList.add("hidden");
      openCreateTaskModal(state.projectDetail.project?.id || null, secName);
    });
  });

  bindTimelinePlannerInteractions(pdPlanner, visibleTasks, rangeStart, rangeEnd, {
    saveStatusEl: pdSaveStatus,
    rowType: "task",
  });
  bindProjectPlannerEditRows();
  document.querySelector("#pdTitle [data-rename-project]")?.addEventListener("click", async (e) => {
    await handleRenameProjectClick(e.currentTarget.getAttribute("data-rename-project"));
  });
}

function renderSectionPills() {
  const pills = document.getElementById("pdSectionPills");
  if (!pills) return;
  const sections = [...new Set([...state.projectDetail.sections, ...state.projectDetail.tasks.map((t) => t.section).filter(Boolean)])];
  const active = state.projectDetail.activeSection || "";
  pills.innerHTML = sections.map((s) => `
    <span class="pd-section-pill-wrap">
      <button class="pd-section-pill ${active === s ? "active" : ""}" data-section="${escapeHtml(s)}" type="button">${escapeHtml(s)}</button>
      <button class="pd-section-delete" data-delete-section="${escapeHtml(s)}" type="button" title="Delete section">×</button>
    </span>
  `).join("") + (sections.length ? `<button class="pd-section-pill ${!active ? "active" : ""}" data-section="" type="button">All</button>` : "");

  pills.querySelectorAll(".pd-section-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.projectDetail.activeSection = btn.dataset.section;
      renderProjectPlanner();
    });
  });

  pills.querySelectorAll(".pd-section-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const name = btn.dataset.deleteSection;
      if (!state.projectDetail.project) return;
      const nextSections = state.projectDetail.sections.filter((s) => s !== name);
      try {
        const updatedProject = await api(`/api/projects/${state.projectDetail.project.id}`, {
          method: "PATCH",
          body: JSON.stringify({ sections: nextSections }),
        });
        state.projectDetail.project = { ...state.projectDetail.project, ...updatedProject };
        state.projectDetail.sections = nextSections;
        // Unassign tasks from deleted section
        state.projectDetail.tasks = state.projectDetail.tasks.map((t) =>
          t.section === name ? { ...t, section: null } : t
        );
        if (state.projectDetail.activeSection === name) state.projectDetail.activeSection = "";
        renderProjectPlanner();
      } catch (err) {
        console.error("Failed to delete section", err);
      }
    });
  });
}

function bindSectionManagement() {
  const preset = document.getElementById("pdSectionPreset");
  const customInput = document.getElementById("pdSectionCustomInput");
  const addBtn = document.getElementById("pdAddSectionBtn");
  if (!preset || !addBtn) return;

  preset.onchange = () => {
    if (preset.value === "__custom__") {
      customInput.classList.remove("hidden");
      customInput.focus();
    } else {
      customInput.classList.add("hidden");
    }
  };

  addBtn.onclick = async () => {
    const name = preset.value === "__custom__"
      ? customInput.value.trim()
      : preset.value.trim();
    if (!name || name === "__custom__" || !state.projectDetail.project) return;

    const nextSections = [...new Set([...(state.projectDetail.project.sections || []), ...state.projectDetail.sections, name])];
    addBtn.disabled = true;
    try {
      const updatedProject = await api(`/api/projects/${state.projectDetail.project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ sections: nextSections }),
      });
      const projectIdx = state.projects.findIndex((entry) => entry.id === updatedProject.id);
      if (projectIdx !== -1) {
        state.projects[projectIdx] = { ...state.projects[projectIdx], ...updatedProject };
      }
      state.projectDetail.project = { ...state.projectDetail.project, ...updatedProject };
      state.projectDetail.sections = nextSections;
      state.projectDetail.activeSection = "";
      renderProjectPlanner();
    // Pre-fill quick-add with section context
    if (projectQuickAddInput) {
      projectQuickAddInput.dataset.section = name;
      projectQuickAddInput.placeholder = `Add task to "${name}"…`;
      projectQuickAddInput.focus();
    }
    preset.value = "";
    customInput.value = "";
    customInput.classList.add("hidden");
    } finally {
      addBtn.disabled = false;
    }
  };
}

async function saveProjectPlan() {
  const { tasks } = state.projectDetail;
  if (!tasks.length) return;
  pdSaveStatus.textContent = "Saving...";
  try {
    await Promise.all(tasks.map((task) => api(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: task.title,
        status: task.status,
        startDate: task.startDate,
        dueDate: task.dueDate,
        section: task.section ?? null,
        projectId: state.projectDetail.project?.id || null,
      }),
    })));
    pdSaveStatus.textContent = "Saved";
    await openProjectDetail(state.projectDetail.project.id);
    await loadProjects();
    await loadMyWork();
  } catch {
    pdSaveStatus.textContent = "Save failed";
  }
}

function bindProjectPlannerEditRows() {
  pdPlanner.querySelectorAll(".project-task-name").forEach((input) => {
    input.addEventListener("change", (e) => {
      state.projectDetail.tasks[Number(e.currentTarget.dataset.taskIdx)].title = e.currentTarget.value.trim() || "Untitled task";
      renderProjectPlanner();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        const idx = Number(e.currentTarget.dataset.taskIdx);
        e.currentTarget.value = state.projectDetail.tasks[idx].title || "";
        renderProjectPlanner();
      }
    });
    input.addEventListener("blur", (e) => {
      const idx = Number(e.currentTarget.dataset.taskIdx);
      state.projectDetail.tasks[idx].title = e.currentTarget.value.trim() || "Untitled task";
      renderProjectPlanner();
    });
  });
  pdPlanner.querySelectorAll(".pg-task-rename-trigger").forEach((button) => {
    button.addEventListener("click", () => {
      const idx = Number(button.dataset.taskIdx);
      const input = pdPlanner.querySelector(`.project-task-name[data-task-idx="${idx}"]`);
      if (!input) return;
      input.focus();
      input.select();
    });
  });
  pdPlanner.querySelectorAll(".pg-task-start-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const idx = Number(e.currentTarget.dataset.taskIdx);
      if (e.currentTarget.value) state.projectDetail.tasks[idx].startDate = `${e.currentTarget.value}T09:00:00.000Z`;
      renderProjectPlanner();
    });
  });
  pdPlanner.querySelectorAll(".pg-task-due-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const idx = Number(e.currentTarget.dataset.taskIdx);
      if (e.currentTarget.value) state.projectDetail.tasks[idx].dueDate = toEndOfDayIso(e.currentTarget.value);
      renderProjectPlanner();
    });
  });
  pdPlanner.querySelectorAll(".pg-task-status-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      state.projectDetail.tasks[Number(e.currentTarget.dataset.taskIdx)].status = e.currentTarget.value;
    });
  });
  pdPlanner.querySelectorAll(".pg-section-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      const idx = Number(e.currentTarget.dataset.taskIdx);
      state.projectDetail.tasks[idx].section = e.currentTarget.value || null;
      renderProjectPlanner();
    });
  });
  pdPlanner.querySelectorAll("[data-task-action='open']").forEach((button) => {
    button.addEventListener("click", async (e) => {
      await openEditModal(e.currentTarget.dataset.taskId);
    });
  });
  pdPlanner.querySelectorAll("[data-task-action='delete']").forEach((button) => {
    button.addEventListener("click", async (e) => {
      await deleteTask(e.currentTarget.dataset.taskId);
      await openProjectDetail(state.projectDetail.project.id);
    });
  });
}

function renderProjectPhasePlanner() {
  const { project, tasks } = state.projectDetail;
  if (!project) return;
  const phaseRows = tasks.flatMap((task) =>
    (task.phases || []).map((phase, idx) => ({
      idx: Number(`${tasks.indexOf(task)}${idx}`),
      title: `${task.title}: ${phase.title}`,
      startDate: phase.startDate || task.startDate || task.createdAt,
      dueDate: phase.dueDate || task.dueDate || addDays(new Date(task.createdAt || new Date()), 3).toISOString(),
      status: phase.status,
    }))
  );
  if (!phaseRows.length) {
    pdPhasePlanner.innerHTML = `
      <div class="task-empty-state">
        <p>No phases yet</p>
        <span class="muted">Add phases to project tasks and they will be rolled up here.</span>
      </div>`;
    return;
  }
  const rangeStart = startOfDay(new Date(phaseRows.reduce((min, row) => new Date(row.startDate) < new Date(min) ? row.startDate : min, phaseRows[0].startDate)));
  const rangeEnd = startOfDay(new Date(phaseRows.reduce((max, row) => new Date(row.dueDate) > new Date(max) ? row.dueDate : max, phaseRows[0].dueDate)));
  pdPhasePlanner.innerHTML = buildTimelinePlannerHtml({
    rows: phaseRows,
    rangeStart,
    rangeEnd,
    emptyText: "",
  });
}

function buildTimelinePlannerHtml({ rows, rangeStart, rangeEnd, emptyText = "No timeline items yet.", showTaskRename = false, taskOpenMode = false, viewScale = null }) {
  const totalMs = Math.max(rangeEnd.getTime() - rangeStart.getTime(), 24 * 60 * 60 * 1000);
  const todayMs = startOfDay(new Date()).getTime();
  const todayPct = clampPct(((todayMs - rangeStart.getTime()) / totalMs) * 100);
  const spanDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
  const scale = viewScale || (spanDays <= 14 ? "week" : "month");
  let axisLabels;
  if (scale === "quarter") {
    axisLabels = [];
    let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor <= rangeEnd) {
      axisLabels.push({
        date: new Date(cursor),
        pct: clampPct(((startOfDay(cursor).getTime() - rangeStart.getTime()) / totalMs) * 100),
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  } else {
    const labelCount = spanDays <= 7 ? spanDays : spanDays <= 21 ? 7 : spanDays <= 60 ? 6 : 8;
    axisLabels = Array.from({ length: labelCount + 1 }, (_, i) => {
      const date = addDays(rangeStart, Math.round((spanDays / labelCount) * i));
      const pct = clampPct(((date.getTime() - rangeStart.getTime()) / totalMs) * 100);
      return { date, pct };
    });
  }

  // Quarter banners when span > 30 days
  let quarterBannerHtml = "";
  if (spanDays > 30) {
    const quarters = [];
    let cur = new Date(Date.UTC(rangeStart.getFullYear(), rangeStart.getMonth(), 1));
    while (cur <= rangeEnd) {
      const q = Math.floor(cur.getUTCMonth() / 3) + 1;
      const year = cur.getUTCFullYear();
      const qStart = new Date(Date.UTC(year, (q - 1) * 3, 1));
      const qEnd = new Date(Date.UTC(year, q * 3, 0));
      const visStart = new Date(Math.max(qStart.getTime(), rangeStart.getTime()));
      const visEnd = new Date(Math.min(qEnd.getTime(), rangeEnd.getTime()));
      const leftPct = clampPct(((visStart.getTime() - rangeStart.getTime()) / totalMs) * 100);
      const widthPct = clampPct(((visEnd.getTime() - visStart.getTime()) / totalMs) * 100);
      if (widthPct > 0) quarters.push({ label: `Q${q} ${year}`, leftPct, widthPct });
      cur = new Date(Date.UTC(year, q * 3, 1));
    }
    quarterBannerHtml = `<div class="pg-axis-row pg-quarter-row">
      <div class="pg-name-spacer"></div>
      <div class="pg-axis-track" style="height:22px">
        ${quarters.map((q) => `<div class="pg-quarter-segment" style="left:${q.leftPct}%;width:${q.widthPct}%">${q.label}</div>`).join("")}
      </div>
    </div>`;
  }

  return `
    <div class="pg-visual">
      ${quarterBannerHtml}
      <div class="pg-axis-row">
        <div class="pg-name-spacer"></div>
        <div class="pg-axis-track">
          ${axisLabels.map((l) => `<span class="pg-axis-label" style="left:${l.pct}%">${formatGanttLabel(l.date, scale)}</span>`).join("")}
          ${todayPct >= 0 && todayPct <= 100 ? `<div class="pg-today-line" style="left:${todayPct}%"><span class="pg-today-label">Today</span></div>` : ""}
        </div>
      </div>
      <div class="pg-bar-rows">
        ${rows.length ? rows.map((row) => {
          if (row.type === "section") {
            return `<div class="pg-bar-row pg-section-row">
              <div class="pg-section-row-label" style="color:${row.color || "#3a5fa0"}">
                <span class="pg-section-title">${escapeHtml(row.title)}</span>
                <button class="pg-section-add-task-btn btn ghost small" data-section="${escapeHtml(row.title)}" type="button">+ Add task</button>
              </div>
              <div class="pg-bar-track pg-section-track"></div>
            </div>`;
          }
          const start = startOfDay(new Date(row.startDate));
          const due = startOfDay(new Date(row.dueDate));
          const leftPct = clampPct(((start.getTime() - rangeStart.getTime()) / totalMs) * 100);
          const widthPct = Math.max(2, clampPct(((due.getTime() - start.getTime()) / totalMs) * 100));
          const statusCls = row.status === "done" ? "pg-bar-done" : row.status === "in_progress" ? "pg-bar-inprogress" : "";
          return `
            <div class="pg-bar-row">
              ${showTaskRename
                ? `<button class="pg-bar-row-label pg-task-rename-trigger" data-task-idx="${row.idx}" title="Click to rename task" type="button">${escapeHtml(row.title)}</button>`
                : taskOpenMode
                  ? `<button class="pg-bar-row-label pg-task-open-trigger" data-open-task="${row.id || ""}" title="Open task" type="button">${escapeHtml(row.title)}</button>`
                : `<div class="pg-bar-row-label" title="${escapeHtml(row.title)}">${escapeHtml(row.title)}</div>`}
              <div class="pg-bar-track">
                ${todayPct >= 0 && todayPct <= 100 ? `<div class="pg-today-tick" style="left:${todayPct}%"></div>` : ""}
                <div class="pg-bar ${statusCls}" data-idx="${row.idx}" data-task-id="${row.id || ""}" style="left:${leftPct}%; width:${widthPct}%; --bar-color:${row.color || "#2f5bd3"}">
                  <span class="pg-bar-handle left" data-drag="resize-left"></span>
                  <span class="pg-bar-handle right" data-drag="resize-right"></span>
                </div>
              </div>
            </div>`;
        }).join("") : `<p class="muted mini" style="padding:12px 0 4px">${escapeHtml(emptyText)}</p>`}
      </div>
    </div>`;
}

function bindTimelinePlannerInteractions(container, items, rangeStart, rangeEnd, options = {}) {
  const dayMs = 24 * 60 * 60 * 1000;
  container.querySelectorAll(".pg-bar").forEach((bar) => {
    bar.addEventListener("pointerdown", (event) => {
      const idx = Number(bar.dataset.idx);
      const item = items[idx];
      if (!item) return;
      const track = bar.parentElement;
      const trackRect = track.getBoundingClientRect();
      const dragMode = event.target.closest(".pg-bar-handle.left")
        ? "resize-left"
        : event.target.closest(".pg-bar-handle.right")
          ? "resize-right"
          : "move";
      const originalStart = startOfDay(new Date(item.startDate)).getTime();
      const originalDue = startOfDay(new Date(item.dueDate)).getTime();
      const totalMs = Math.max(rangeEnd.getTime() - rangeStart.getTime(), dayMs);
      bar.classList.add("is-dragging");
      event.preventDefault();

      function applyVisual(startMs, dueMs) {
        const leftPct = clampPct(((startMs - rangeStart.getTime()) / totalMs) * 100);
        const widthPct = Math.max(2, clampPct(((dueMs - startMs) / totalMs) * 100));
        bar.style.left = `${leftPct}%`;
        bar.style.width = `${widthPct}%`;
      }

      function onMove(moveEvent) {
        const deltaDays = Math.round(((moveEvent.clientX - event.clientX) / trackRect.width) * (totalMs / dayMs));
        let nextStart = originalStart;
        let nextDue = originalDue;
        if (dragMode === "move") {
          nextStart = originalStart + deltaDays * dayMs;
          nextDue = originalDue + deltaDays * dayMs;
        } else if (dragMode === "resize-left") {
          nextStart = Math.min(originalStart + deltaDays * dayMs, originalDue - dayMs);
        } else {
          nextDue = Math.max(originalDue + deltaDays * dayMs, originalStart + dayMs);
        }
        applyVisual(nextStart, nextDue);
      }

      function onUp(upEvent) {
        const deltaDays = Math.round(((upEvent.clientX - event.clientX) / trackRect.width) * (totalMs / dayMs));
        let nextStart = originalStart;
        let nextDue = originalDue;
        if (dragMode === "move") {
          nextStart = originalStart + deltaDays * dayMs;
          nextDue = originalDue + deltaDays * dayMs;
        } else if (dragMode === "resize-left") {
          nextStart = Math.min(originalStart + deltaDays * dayMs, originalDue - dayMs);
        } else {
          nextDue = Math.max(originalDue + deltaDays * dayMs, originalStart + dayMs);
        }
        item.startDate = toPlannerStartIso(new Date(nextStart));
       item.dueDate = toPlannerDueIso(new Date(nextDue));
        bar.classList.remove("is-dragging");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (typeof options.onChange === "function") options.onChange(item);
        if (options.rowType === "phase") renderPhasePlannerGantt();
        if (options.rowType === "task") renderProjectPlanner();
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  });
}

function renderPhasePlannerGantt() {
  const { task, phases } = state.taskDetail;
  if (!task) return;

  const rangeStart = startOfDay(new Date(task.startDate || task.createdAt));
  const rangeEnd = startOfDay(new Date(task.dueDate || addDays(new Date(task.createdAt), 7)));

  function buildEditRowsHtml() {
    return phases.map((phase, idx) => `
      <div class="pg-edit-row">
        <input class="pg-name-input" type="text" value="${escapeHtml(phase.title)}" data-idx="${idx}" placeholder="Phase name" />
        <input class="pg-start-input" type="date" value="${toDateInputValue(phase.startDate)}" data-idx="${idx}" />
        <input class="pg-due-input" type="date" value="${toDateInputValue(phase.dueDate)}" data-idx="${idx}" />
        <select class="pg-status-select" data-idx="${idx}">
          <option value="todo" ${phase.status === "todo" ? "selected" : ""}>To Do</option>
          <option value="in_progress" ${phase.status === "in_progress" ? "selected" : ""}>In Progress</option>
          <option value="done" ${phase.status === "done" ? "selected" : ""}>Done</option>
        </select>
        <button class="pg-delete-btn btn ghost small" data-idx="${idx}" type="button">X</button>
      </div>`).join("");
  }

  const noPhases = !phases.length;
  tdPhaseGantt.innerHTML = `
    ${buildTimelinePlannerHtml({
      rows: phases.map((phase, idx) => ({
        idx,
        title: phase.title,
        startDate: phase.startDate || task.startDate || task.createdAt,
        dueDate: phase.dueDate || task.dueDate || addDays(new Date(), 3).toISOString(),
        status: phase.status,
      })),
      rangeStart,
      rangeEnd,
      emptyText: `No phases yet - click "+ Add Phase" to build out your timeline.`,
    })}
    ${noPhases ? "" : `
    <div class="pg-edit-section">
      <div class="pg-edit-head">
        <div>Phase Name</div><div>Start</div><div>End</div><div>Status</div><div></div>
      </div>
      <div class="pg-edit-rows">${buildEditRowsHtml()}</div>
    </div>`}`;

  tdPhaseGantt.querySelectorAll(".pg-name-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      state.taskDetail.phases[Number(e.currentTarget.dataset.idx)].title = e.currentTarget.value;
      renderPhasePlannerGantt();
    });
  });
  tdPhaseGantt.querySelectorAll(".pg-start-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      if (e.currentTarget.value) state.taskDetail.phases[idx].startDate = `${e.currentTarget.value}T09:00:00.000Z`;
      renderPhasePlannerGantt();
    });
  });
  tdPhaseGantt.querySelectorAll(".pg-due-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      if (e.currentTarget.value) state.taskDetail.phases[idx].dueDate = toEndOfDayIso(e.currentTarget.value);
      renderPhasePlannerGantt();
    });
  });
  tdPhaseGantt.querySelectorAll(".pg-status-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      state.taskDetail.phases[Number(e.currentTarget.dataset.idx)].status = e.currentTarget.value;
      renderPhasePlannerGantt();
    });
  });
  tdPhaseGantt.querySelectorAll(".pg-delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      state.taskDetail.phases.splice(Number(e.currentTarget.dataset.idx), 1);
      renderPhasePlannerGantt();
    });
  });
  bindTimelinePlannerInteractions(tdPhaseGantt, state.taskDetail.phases, rangeStart, rangeEnd, { rowType: "phase" });
}

// ── Timeline Modal ────────────────────────────────────

function openTimelineModal(taskId) {
}

// ── API ───────────────────────────────────────────────

async function api(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let payload = {};
    try { payload = await response.json(); } catch { payload = {}; }
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return response.json();
}

function persistAuth() {
  localStorage.setItem("token", state.token);
  localStorage.setItem("user", JSON.stringify(state.user));
}

function clearAuth() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// ── Helpers ───────────────────────────────────────────

function capitalizeTaskStatus(status) {
  if (status === "in_progress") return "In Progress";
  if (status === "todo") return "To Do";
  return "Done";
}

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

function getPriorityLabel(priority) {
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  if (priority === "low") return "Low";
  return "Auto";
}

function getGanttDateRange(items, fallbackEnd = null, view = "auto") {
  if (view === "week") {
    return {
      rangeStart: startOfDay(new Date()),
      rangeEnd: startOfDay(addDays(new Date(), 14)),
    };
  }
  if (view === "month") {
    return {
      rangeStart: startOfDay(new Date()),
      rangeEnd: startOfDay(addDays(new Date(), 30)),
    };
  }
  if (view === "quarter") {
    const now = new Date();
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return {
      rangeStart: startOfDay(new Date(now.getFullYear(), quarterStartMonth, 1)),
      rangeEnd: startOfDay(new Date(now.getFullYear(), quarterStartMonth + 3, 0)),
    };
  }
  return {
    rangeStart: startOfDay(new Date(items.reduce((min, item) => {
      const candidate = item.startDate || item.createdAt || new Date().toISOString();
      return new Date(candidate) < new Date(min) ? candidate : min;
    }, items[0].startDate || items[0].createdAt || new Date().toISOString()))),
    rangeEnd: startOfDay(new Date(items.reduce((max, item) => {
      const candidate = item.dueDate || fallbackEnd || addDays(new Date(), 14).toISOString();
      return new Date(candidate) > new Date(max) ? candidate : max;
    }, items[0].dueDate || fallbackEnd || addDays(new Date(), 14).toISOString()))),
  };
}

function formatDayHeading(date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatGanttLabel(date, scale) {
  if (scale === "week") return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
  if (scale === "quarter") return date.toLocaleDateString(undefined, { month: "short" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateInputLocal(date);
}

function toIsoDateTime(dateStr, endOfDay = false) {
  if (!dateStr) return null;
  return endOfDay ? toEndOfDayIso(dateStr) : `${dateStr}T09:00:00.000Z`;
}

// Returns an ISO string at 23:59:59 in the *local* timezone for the given YYYY-MM-DD string.
// Using "Z" directly would mean end-of-UTC-day, which rolls into the next calendar day in IST.
function toEndOfDayIso(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 0).toISOString();
}

function toPlannerStartIso(value) {
  const date = new Date(value);
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

function toPlannerDueIso(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 0);
  return date.toISOString();
}

function getRangeBounds(range, offset = 0) {
  const base = startOfWeekSunday(new Date());

  if (range === "week") {
    const from = addDays(base, offset * 7);
    const to = addDays(from, 6);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (range === "quarter") {
    const from = addDays(base, offset * 90);
    const to = addDays(from, 89);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  // month (default) — navigate by calendar month
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const from = startOfWeekSunday(monthStart);
  const to = endOfWeekSaturday(monthEnd);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function formatPeriodLabel(range, from, to) {
  if (range === "week") {
    const opts = { month: "short", day: "numeric" };
    return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`;
  }
  if (range === "month") {
    const midpoint = new Date((from.getTime() + to.getTime()) / 2);
    return midpoint.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  // quarter
  const opts = { month: "short", year: "numeric" };
  return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(undefined, opts)}`;
}

function businessDaysInRange(from, to) {
  const days = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const day = cursor.getDay();
    if (day >= 1 && day <= 5) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function allDaysInRange(from, to) {
  const days = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function startOfWeekSunday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeekSaturday(date) {
  const d = startOfWeekSunday(date);
  d.setDate(d.getDate() + 6);
  d.setHours(0, 0, 0, 0);
  return d;
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function clampPct(value) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function formatDateInputLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextWeekdayDate(dayIndex) {
  const now = new Date();
  const date = startOfDay(now);
  const diff = (dayIndex - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + diff);
  return date;
}
