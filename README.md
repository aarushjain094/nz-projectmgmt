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

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo Users

- Manager: `manager@nyalazone.internal` / `demo123`
- Member: `member@nyalazone.internal` / `demo123`

## Email

Set SMTP variables (see `.env.example`) before starting server:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `APP_URL`

Reminder schedule:
- 48h before due date
- 24h before due date
- Daily while overdue

Registration behavior:
- New self-signups are created as `pending`
- All active managers receive an approval-request email when SMTP is configured
- If SMTP is not configured, the server logs the pending approval instead

If SMTP env vars are missing, reminders are skipped (app still works).
