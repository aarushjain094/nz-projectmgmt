# Nyalazone Internal Project Management Tool

This is a fully-functional, backend-supported tool that enables a small business (~100 employees) track all projects at once. You can consider this a lower-level version of Aha! or Confluence, but it includes the key functionality necessary for Nyalazone itself.

Features:
- Natural-language task intake (`Need to complete the demo frontend by Friday`)
- Outstanding tasks sorted by necessity/importance (priority score)
- Calendar view
- Editable Gantt timeline with editable sections. A project consists of sections that consists of tasks.
- Manager view (team tasks + assignment)
- Role customization. Sharing can be sent to specific roles and / or people

Working on:
- Google / Outlook Calendar Integration
- Reminder emails

Please visit at https://nz-project-management.fly.dev/ 
This is an internal tool for Nyalazone

## Security And Persistence

- Login now uses a server-side session cookie instead of a browser-stored bearer token.
- Password-reset tokens are stored hashed in `DATA_DIR/db.json`.
- Sessions are persisted to `DATA_DIR/sessions.json`, so normal restarts do not sign everyone out.
- Database writes are atomic and create rolling backups under `DATA_DIR/backups`.
- On startup, the server will recover `db.json` from the newest valid same-volume backup if the primary file is corrupt.

Operational limits:

- Same-volume backups help with corruption and bad writes.
- They do not protect against total loss of the single mounted volume.

Manual backup and restore on Fly use the existing volume only:

- Backup: copy `db.json`, `sessions.json`, and `backups/` from the mounted `DATA_DIR`.
- Restore: stop the app, replace `db.json` from a known-good copy or the newest file in `backups/`, then start the app again.
