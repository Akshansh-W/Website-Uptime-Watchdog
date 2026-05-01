# Website-Uptime-Watchdog
# Watchdog — Uptime Monitor

Know when your site goes down before your users do.

Watchdog is a full-stack SaaS uptime monitoring platform that pings URLs at configurable intervals, runs API health checks with custom assertions, and delivers instant alerts via Email, SMS, and Slack the moment something breaks — with live dashboard updates streamed in real time.

🛠 Tech Stack
Frontend
TechnologyPurposeReact 18UI framework with hooksCSS VariablesDesign token system (dark theme)Space Grotesk + JetBrains MonoTypographyEventSource APINative SSE client for live updatesLocalStorageJWT token and session persistence
Backend
TechnologyPurposeNode.js + ExpressREST API serverMySQL 8 + mysql2Persistent storage with connection poolingbcryptjsPassword hashingjsonwebtokenJWT signing and verificationaxiosHTTP client for pinging monitored URLsnodemailerEmail delivery via Gmail SMTPTwilio SDKSMS deliverysetIntervalPer-monitor scheduling engine (no cron library needed)SSE (native)Real-time server push to frontend clients


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

🔌 API Reference
Auth
MethodEndpointAuthDescriptionPOST/api/auth/signupNoRegister + welcome email sentPOST/api/auth/loginNoLogin → JWT tokenGET/api/auth/meYesGet current userPUT/api/auth/profileYesUpdate phone + SMS preference
Monitors
MethodEndpointAuthDescriptionGET/api/monitorsYesList all monitors with historyPOST/api/monitorsYesAdd monitor — timer starts immediatelyDELETE/api/monitors/:idYesRemove monitor + cancel timerPOST/api/monitors/:id/pingYesTrigger manual pingGET/api/monitors/streamYesSSE live update stream
API Checks
MethodEndpointAuthDescriptionGET/api/monitors/:id/apisYesList checks + latest resultsPOST/api/monitors/:id/apisYesAdd check with test casesDELETE/api/monitors/:id/apis/:apiIdYesRemove checkPOST/api/monitors/:id/apis/:apiId/runYesManual run


## Database Tables (auto-created)

- `users` — accounts with optional phone + sms_alerts flag
- `monitors` — tracked URLs per user, with interval, status, uptime
- `ping_history` — every ping result (used to calculate uptime %)
- `api_checks` — API endpoints attached to a monitor
- `api_test_cases` — assertions for each API check
- `api_check_results` — per-run results and per-test-case pass/fail
- `alert_log` — record of every email/SMS/Slack alert sent
