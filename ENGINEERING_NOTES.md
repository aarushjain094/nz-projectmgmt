# Engineering Notes

## Create-Task Modal Checklist

This modal had multiple "spotty" failures caused by UI state, not by the task API.

Before changing or reusing modal-based forms in this project, verify all of the following:

1. Reset submit state on every open and close.
   - Reused modal DOM keeps disabled buttons and old error text unless explicitly cleared.

2. Never early-return from a submit handler while the submit button is disabled.
   - Validation failures must restore button state and show an error.

3. Guard async modal work against stale responses.
   - If the modal is closed and reopened quickly, old async responses can overwrite the new modal contents.
   - Use request/version IDs for async section-loading and share-list-loading paths.

4. Validate date relationships in the UI before sending.
   - `dueDate` must be after `startDate`.
   - Date-derived helper fields like duration and deadline can drift if only one side is edited.

5. Re-test both create and edit flows after modal changes.
   - The same modal is reused for both, so state leakage is common.

6. Re-test project-scoped opens.
   - Opening the task modal from a project/section context adds extra async state and is easier to break than the generic "Add Task" button.

Current fixes tied to this note:

- Submit button state now resets on create-task modal open/close.
- Blank-title validation restores button state and shows a message.
- Async share-list and section-loading paths are guarded against stale responses.
- Invalid start/deadline combinations are rejected in the modal before submit.

## Guided Demo Rules

The guided demo must never share state with the live workspace.

Before changing demo behavior, verify all of the following:

1. Demo data stays client-only.
   - The demo runs through intercepted client requests and canned state.
   - No live API mutation should occur while demo mode is active.

2. Demo exit restores the prior app shell.
   - Logged-out users should return to the auth screen.
   - Logged-in users should return to their previous tab with live data reloaded.

3. Demo steps target the real UI.
   - The walkthrough should drive existing tabs, forms, and modals rather than maintaining duplicate markup.

4. Persona switching stays explicit.
   - The member-to-manager switch is simulated in demo state only.
   - Role-specific UI should rerender from the demo persona before the next step is shown.

## Security And Durability Notes

1. Session auth is cookie-backed.
   - Do not reintroduce bearer tokens in `localStorage` or query params.
   - Authenticated fetches must stay same-origin with credentials enabled.

2. Password reset tokens are stored hashed only.
   - Test-only flows may expose raw tokens in responses, but production code must not log or persist them in plaintext.

3. Persistence writes must remain atomic.
   - Write temp file, fsync, then rename.
   - Keep rolling backups on the same Fly volume and bounded by retention.

4. Same-volume backups are a corruption guard, not disaster recovery.
   - They protect against bad writes and restart recovery.
   - They do not protect against total loss of the only Fly volume.
