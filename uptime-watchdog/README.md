# 🐕 Watchdog — Uptime Monitor


## How Alerts Work

| Channel | Trigger | Config |
|---------|---------|--------|
| Email   | Site goes down or recovers | `EMAIL_USER` + `EMAIL_PASS` in `.env` |
| SMS     | Site goes down or recovers | Twilio creds in `.env` + user sets phone in profile |
| Slack   | Site goes down or recovers | User provides Slack webhook when adding a monitor |


---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/signup | No | Create account (sends welcome email) |
| POST | /api/auth/login | No | Login → returns JWT |
| GET | /api/auth/me | Yes | Get profile |
| PUT | /api/auth/profile | Yes | Update phone + sms_alerts |
| GET | /api/monitors | Yes | List all monitors |
| POST | /api/monitors | Yes | Add monitor (starts timer immediately) |
| DELETE | /api/monitors/:id | Yes | Remove monitor + cancel timer |
| POST | /api/monitors/:id/ping | Yes | Manual ping |
| GET | /api/monitors/stream | Yes | SSE live updates |
| GET | /api/monitors/:id/apis | Yes | List API checks |
| POST | /api/monitors/:id/apis | Yes | Add API check with test cases |
| DELETE | /api/monitors/:id/apis/:apiId | Yes | Remove API check |
| POST | /api/monitors/:id/apis/:apiId/run | Yes | Manual run |
| GET | /health | No | Server health + active timer count |

---

## Database Tables (auto-created)

- `users` — accounts with optional phone + sms_alerts flag
- `monitors` — tracked URLs per user, with interval, status, uptime
- `ping_history` — every ping result (used to calculate uptime %)
- `api_checks` — API endpoints attached to a monitor
- `api_test_cases` — assertions for each API check
- `api_check_results` — per-run results and per-test-case pass/fail
- `alert_log` — record of every email/SMS/Slack alert sent
