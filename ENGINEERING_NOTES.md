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
