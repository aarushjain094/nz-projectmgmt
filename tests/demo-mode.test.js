import { test } from "node:test";
import assert from "node:assert/strict";

import { buildDemoSteps, createDemoController } from "../public/demo-mode.js";

test("demo controller starts as member and can switch to manager", () => {
  const controller = createDemoController(new Date("2026-03-13T00:00:00Z"));
  controller.start();

  assert.equal(controller.isActive(), true);
  assert.equal(controller.getCurrentUser().role, "member");
  assert.equal(buildDemoSteps().some((step) => step.id === "role-switch"), true);

  const manager = controller.switchPersona("manager");
  assert.equal(manager.role, "manager");
});

test("demo task creation and sharing mutate only demo state", async () => {
  const controller = createDemoController(new Date("2026-03-13T00:00:00Z"));
  controller.start();

  const created = await controller.handleApiRequest("/api/tasks/parse", {
    method: "POST",
    body: JSON.stringify({
      text: "Demo-created task",
      sharedWith: ["demo_backend"],
      projectId: "demo_project_launch",
      section: "Launch",
    }),
  });

  assert.equal(created.title, "Demo-created task");
  assert.deepEqual(created.sharedWith, ["demo_backend"]);

  const mine = await controller.handleApiRequest("/api/tasks?scope=mine&status=outstanding&sort=priority");
  assert.equal(mine.some((task) => task.id === created.id), true);

  const detail = await controller.handleApiRequest(`/api/tasks/${created.id}`);
  assert.deepEqual(detail.sharedWith, ["demo_backend"]);
});

test("manager demo flows cover assignment and approvals", async () => {
  const controller = createDemoController(new Date("2026-03-13T00:00:00Z"));
  controller.start();
  controller.switchPersona("manager");

  const pendingBefore = await controller.handleApiRequest("/api/users/pending");
  assert.equal(pendingBefore.length, 1);

  const assigned = await controller.handleApiRequest("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: "Manager assigned demo task",
      assigneeId: "demo_member",
      projectId: "demo_project_launch",
      department: "Frontend",
      priority: "high",
    }),
  });
  assert.equal(assigned.assigneeId, "demo_member");

  const teamTasks = await controller.handleApiRequest("/api/tasks?scope=team&status=outstanding&sort=priority");
  assert.equal(teamTasks.some((task) => task.id === assigned.id), true);

  await controller.handleApiRequest("/api/users/demo_pending_1/approve", { method: "POST" });
  const pendingAfter = await controller.handleApiRequest("/api/users/pending");
  assert.equal(pendingAfter.length, 0);
});
