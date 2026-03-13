# Nyalazone Internal PM Prototype

Prototype implementing:
- Natural-language task intake (`Need to complete the demo frontend by Friday`)
- Outstanding tasks sorted by necessity/importance (priority score)
- Calendar view
- Editable Gantt timeline
- Manager view (team tasks + assignment)
- Exportable calendar (`.ics`)
- Real reminder emails via SMTP (when env is configured)

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
