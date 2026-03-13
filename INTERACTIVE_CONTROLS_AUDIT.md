# Interactive Controls Audit

Coverage legend:

- `Covered (API)` means the server path behind the control is exercised in `tests/server.test.js`.
- `Partial` means the backend is covered but the browser behavior itself is not automated.
- `Uncovered (UI)` means there is no automated test for the user interaction.

## Auth and Global Navigation

| Control | Type | Expected behavior | Implementation file | Test coverage status | Missing edge cases |
| --- | --- | --- | --- | --- | --- |
| `loginForm` submit | Form submit | Authenticates user, persists token, loads current tab, or shows login error. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for disabled/loading state. |
| `showForgotBtn` | Button | Switches auth shell to forgot-password view. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test for view state reset. |
| `showRegisterBtn` | Button | Switches auth shell to register view. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test for preserving/clearing prior errors. |
| `showLoginFromRegisterBtn` | Button | Returns from register to login view. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `showLoginFromForgotBtn` | Button | Returns from forgot-password to login view. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `registerForm` submit | Form submit | Creates pending member account, shows success state, returns to login. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | Custom role path is UI-only; no browser test for inline role toggle. |
| `regRole` | Dropdown | Shows custom role input when `Other...` is selected. | `public/index.html` | Uncovered (UI) | Inline `onchange` only; no test for keyboard-only interaction. |
| `forgotForm` submit | Form submit | Sends forgot-password request and shows non-enumerating success message. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for success/error message reset. |
| `resetForm` submit | Form submit | Resets password from URL token, clears URL, returns user to login. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for invalid/expired-token messaging. |
| `tasksNavBtn` | Button | Activates tasks view. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test for tab persistence. |
| `remindersNavBtn` | Button | Activates reminders view. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `projectsNavBtn` | Button | Activates projects view. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `ganttNavBtn` | Button | Activates global gantt view. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `managerNavBtn` | Button | Activates manager view for managers. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test for role-based visibility. |
| `topTimezoneSelect` | Dropdown | Updates user timezone profile immediately. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for invalid timezone entry/selection mismatch. |
| `changePasswordBtn` | Button | Opens change-password modal. | `public/index.html`, `public/script.js` | Uncovered (UI) | Patched: modal now also closes on `Escape`; no UI test. |
| `changePasswordForm` submit | Form submit | Changes password for authenticated user. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | Patched: all active sessions are now invalidated after password change. |
| `cpCancelBtn` and overlay click | Modal action | Closes change-password modal without saving. | `public/index.html`, `public/script.js` | Uncovered (UI) | Patched: `Escape` closes modal; no focus-trap test. |
| `logoutBtn` | Button | Logs user out and clears local auth state. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for redirect/state clearing. |

## Tasks, Calendar, and Reminders

| Control | Type | Expected behavior | Implementation file | Test coverage status | Missing edge cases |
| --- | --- | --- | --- | --- | --- |
| `quickAddInput` | Keyboard submit | `Enter` parses natural language, creates task, reloads My Work. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for parse preview vs. saved payload. |
| `taskSearch` | Text input | Filters visible tasks client-side by title/metadata. | `public/index.html`, `public/script.js` | Uncovered (UI) | No debounce or UI test. |
| `filterStatus` | Dropdown | Filters tasks by status and syncs status tab state. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test for deleted/outstanding interplay. |
| `filterPriority` | Dropdown | Filters tasks by priority. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `filterDept` | Dropdown | Filters tasks by category/department. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `filterProduct` | Dropdown | Filters tasks by product. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `filterClient` | Dropdown | Filters tasks by client. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test for empty client list. |
| `addTaskBtn` | Button | Opens create-task modal. | `public/index.html`, `public/script.js` | Uncovered (UI) | Patched modal `Escape` path; no open/close UI test. |
| `.status-tab-btn` family | Button group | Switches visible task bucket (`all`, `todo`, `in_progress`, `done`, `deleted`). | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test for tab/filter synchronization. |
| Task row body click | Row action | Opens edit modal when clicking non-interactive area. | `public/script.js` | Uncovered (UI) | No UI test for click target exclusions. |
| Task row `data-action="edit"` | Button | Opens edit modal for that task. | `public/script.js` | Uncovered (UI) | No UI test. |
| Task row `data-action="view-detail"` | Button | Opens task-detail modal with sharing and phase planner. | `public/script.js` | Uncovered (UI) | No UI test. |
| Task row `data-action="delete"` | Button | Soft-deletes task and refreshes My Work. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for destructive confirmation. |
| Task row complete checkbox / status select | Inline control | PATCHes task status and reloads current view. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for optimistic state rollback on failure. |
| Deleted row restore button | Button | Restores soft-deleted task. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test. |
| Deleted row permanent delete button | Button | Permanently deletes one soft-deleted task. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | Patched: endpoint now rejects permanent deletion unless task is already soft-deleted. |
| Deleted selection mode buttons (`deletedEnterSelectBtn`, `deletedCancelSelectBtn`, `deletedMassDeleteBtn`, `deletedSelectAll`, `.deleted-select-cb`) | Button + checkbox family | Enables bulk selection and permanent deletion for deleted tasks. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | Patched: bulk permanent delete now ignores active tasks; no UI test for select-state retention. |
| `calendarRange` | Dropdown | Recomputes task calendar range and reloads events. | `public/index.html`, `public/script.js`, `server/index.js` | Partial | No browser test for week/month/quarter navigation. |
| `calPrevBtn` / `calNextBtn` | Button | Moves task calendar backward/forward. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| Calendar task card click | Card action | Opens task-detail modal. | `public/script.js` | Uncovered (UI) | No UI test. |
| Calendar task delete button | Button | Soft-deletes task directly from calendar. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for accidental deletion path. |
| `reminderFilterPills` | Button group | Filters reminder list by severity/group. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| Reminder dismiss button (`data-dismiss-reminder`) | Button | Removes reminder from active reminder list. | `public/script.js` | Uncovered (UI) | Pure client-side state; no persistence test. |

## Project and Manager Controls

| Control | Type | Expected behavior | Implementation file | Test coverage status | Missing edge cases |
| --- | --- | --- | --- | --- | --- |
| `assignForm` submit | Form submit | Manager assigns task to selected user/project. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | Patched: server now enforces manager-only access to `POST /api/tasks`. |
| `workloadFilterProduct` / `workloadFilterProject` / `workloadFilterRole` | Dropdowns | Refilter workload cards in manager view. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test for combined filters. |
| `.employee-tasks-toggle` | Button | Expands/collapses per-employee outstanding task list. | `public/script.js` | Uncovered (UI) | No UI test. |
| `viewTeamRoleFilter` / `viewTeamSort` | Dropdowns | Filter/sort View Team cards. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `addMemberForm` submit | Form submit | Manager creates a new user, optionally with temp password. | `public/index.html`, `public/script.js`, `server/index.js` | Partial | No explicit test for this route yet. |
| `addMemberTeamRole` | Dropdown | Reveals custom work-role input when `Other...` is selected. | `public/index.html` | Uncovered (UI) | Inline `onchange`; no UI test. |
| Team settings `remove-user` | Button | Deletes selected user after confirmation. | `public/script.js`, `server/index.js` | Partial | No explicit automated test for deletion side effects. |
| Team settings `edit-user` / `save-user` | Button pair | Toggles edit mode and persists role/team-role updates. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for toggle states or validation. |
| Pending approvals `Approve` | Button | Activates a pending user. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test. |
| Pending approvals `Reject` | Button | Rejects and deletes pending user after confirmation. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for confirmation path. |
| `addProjectBtn` | Button | Opens project create modal. | `public/index.html`, `public/script.js` | Uncovered (UI) | Patched modal `Escape` close; no UI test. |
| `projectForm` submit | Form submit | Creates or updates a project and members list. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for edit vs. create flow. |
| `projectsCalendarBtn` | Button | Toggles project-deadline calendar panel. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test for state persistence. |
| `projCalRange`, `projCalPrev`, `projCalNext` | Dropdown + buttons | Recompute and navigate project calendar view. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| Project card open / `data-project-id` | Card action | Opens project-detail modal. | `public/script.js` | Uncovered (UI) | No UI test. |
| Project card `data-edit-project` | Button | Opens project modal in edit mode. | `public/script.js` | Uncovered (UI) | No UI test. |
| Project card `data-delete-project` | Button | Deletes project if user has permission. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for confirmation or task orphan messaging. |
| Project rename trigger (`data-rename-project`) | Button | Starts inline project rename flow. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for save/cancel affordances. |
| Global gantt view pills | Button group | Changes gantt timescale (`auto`, `2 weeks`, `month`, `quarter`). | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| Global gantt project/task open buttons | Button family | Opens project detail or task edit from gantt rows. | `public/script.js` | Uncovered (UI) | No UI test. |
| Global gantt section add-task button | Button | Opens create-task modal prefilled for project section. | `public/script.js` | Uncovered (UI) | No UI test for section prefill correctness. |

## Modal Actions and Keyboard Shortcuts

| Control | Type | Expected behavior | Implementation file | Test coverage status | Missing edge cases |
| --- | --- | --- | --- | --- | --- |
| `createTaskForm` submit | Modal form submit | Creates or updates a task, closes modal, refreshes dependent views. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for submit button disabled state or error recovery. |
| Create-task close/cancel/overlay | Modal action | Closes task modal and restores prior project context if needed. | `public/index.html`, `public/script.js` | Uncovered (UI) | Patched: `Escape` now closes this modal too. |
| `createStatus`, `createPriority`, `createDept`, `createProduct`, `createProject`, `createSection` | Dropdown family | Configures task metadata and section visibility. | `public/index.html`, `public/script.js` | Partial | No UI test for project-section coupling. |
| `createStart`, `createDuration`, `createDue` | Date/number controls | Keeps task start/due values synchronized. | `public/index.html`, `public/script.js` | Partial | No explicit test for date math edge cases or invalid combinations. |
| Share picker `.share-checkbox` | Checkbox family | Sets `sharedWith` list for create/edit task submit. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for checked-state initialization. |
| `taskDetailModal` close button / overlay | Modal action | Closes task detail modal. | `public/index.html`, `public/script.js` | Uncovered (UI) | Patched: `Escape` now closes modal. |
| Task detail rename trigger (`data-rename-task`) | Button | Opens inline rename flow for the current task. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for rename interaction. |
| `tdSaveShareBtn` | Modal action | Saves sharing changes for current task. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for status messaging. |
| Phase planner add/save/delete/edit controls | Modal action family | Adds task phases, edits dates/status/title, saves phases to API. | `public/script.js`, `server/index.js` | Partial | No explicit phase-route test yet. |
| `projectDetailModal` close button / overlay | Modal action | Closes project detail modal. | `public/index.html`, `public/script.js` | Uncovered (UI) | Patched: `Escape` now closes modal. |
| `pdAddTaskBtn` | Button | Opens create-task modal scoped to current project/section. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `ganttCollapseBtn` | Button | Collapses/expands project gantt body. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `ganttViewPills` | Button group | Changes project-detail gantt timescale. | `public/index.html`, `public/script.js` | Uncovered (UI) | No UI test. |
| `pdSectionPreset`, `pdSectionCustomInput`, `pdAddSectionBtn` | Dropdown/input/button | Adds preset or custom project section and refreshes planner. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for duplicate section normalization. |
| Section pill and delete controls | Button family | Filters planner by section or removes a section. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for section-delete task reassignment. |
| Project planner inline fields and actions | Inline controls | Renames tasks, edits dates/status/section, opens edit modal, deletes task. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI automation for planner editing flows. |
| Timeline drag/resize bars | Pointer action | Moves/resizes task/phase dates on gantt bars. | `public/script.js`, `server/index.js` | Partial | No automated pointer interaction coverage. |
| `pdSaveBtn` | Button | Saves all edited project-plan task changes. | `public/index.html`, `public/script.js`, `server/index.js` | Partial | No direct batch-save test. |
| `projectFormModal` close/cancel/overlay | Modal action | Closes project create/edit modal. | `public/index.html`, `public/script.js` | Uncovered (UI) | Patched: `Escape` now closes modal. |
| `profileSettingsForm` submit | Modal form submit | Saves timezone from text/datalist settings modal. | `public/index.html`, `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test for datalist selection mismatch. |
| `psCancelBtn` and settings overlay | Modal action | Closes profile settings without saving. | `public/index.html`, `public/script.js` | Uncovered (UI) | Patched: `Escape` now closes modal. |
| Global `Escape` shortcut | Keyboard shortcut | Closes the topmost open modal in a predictable order. | `public/script.js` | Uncovered (UI) | Patched in this audit pass; no keyboard automation yet. |
| `quickAddInput` `Enter` | Keyboard shortcut | Submits quick-add task creation. | `public/script.js`, `server/index.js` | Covered (API), Partial (UI) | No UI test. |
| `projectQuickAddInput` `Enter` | Keyboard shortcut | Creates a project-scoped task from quick-add input. | `public/script.js`, `server/index.js` | Partial | No explicit route-level test for this path. |
| Project planner task-name `Enter` / `Escape` | Keyboard shortcuts | `Enter` commits rename via blur; `Escape` reverts inline edit. | `public/script.js` | Uncovered (UI) | No keyboard interaction test. |

## Critical fixes applied in this audit pass

| Area | Change | Files |
| --- | --- | --- |
| Manager-only task assignment | `POST /api/tasks` now requires a manager session. | `server/index.js`, `tests/server.test.js` |
| Password security | Password change and password reset now invalidate all active sessions for that user. | `server/index.js`, `tests/server.test.js` |
| Destructive deleted-task actions | Permanent delete endpoints now require prior soft deletion; bulk permanent delete ignores active tasks. | `server/index.js`, `tests/server.test.js` |
| Modal keyboard handling | Added global `Escape` handling for the modal stack. | `public/script.js` |
