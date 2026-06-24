# PHAS — Platform Health Accountability System

A multi-tenant accountability layer that detects, verifies, and tracks the technical health of citizen-facing e-platforms in Rwanda — and gives each supervising authority a live view of the platforms under its remit.

**Live:** [https://phas-three.vercel.app](https://phas-three.vercel.app)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        phas/                                    │
│  ├── web/          Next.js 14 app (operators, citizens, admin)  │
│  ├── worker/       Node.js background process (probe + fusion)  │
│  └── mobile/       Flutter citizen app (Android/iOS)            │
└─────────────────────────────────────────────────────────────────┘
```

| Layer | Stack | Hosting |
|---|---|---|
| Web | Next.js 14 (App Router), TypeScript, Tailwind CSS | Vercel |
| Database | PostgreSQL via Neon (serverless) | Neon |
| Worker | Node.js + TypeScript, node-cron | Any Node host |
| Mobile | Flutter | Google Play / App Store |
| Email | Resend API | — |
| Push | Firebase Cloud Messaging (FCM v1) | — |
| SMS | Africa's Talking | — |
| Images | Vercel Blob | — |

---

## Roles

| Role | Description |
|---|---|
| **Citizen** | General public; reports issues, views status, receives notifications |
| **Operator** | Platform team; manages incidents, posts maintenance windows, uses API |
| **Regulator** | Supervising authority; read-only dashboard across all platforms it governs |
| **Admin** | PHAS staff; manages accounts, platforms, and views system-wide reports |

---

## Features

### Public Status Page (`/status`)

- Live operational banner: "All systems operational" or N platforms affected
- Per-platform cards: current state, 7-day uptime percentage, active maintenance warning
- Last 5 incidents per platform shown as history dots
- Tabs: All · Operational · Affected, plus keyword search and category filter
- Subscribe/unsubscribe to push notifications per platform (one tap)
- Responsive; works on mobile without the app

### Public Incident Page (`/status/incidents/[id]`)

- Full incident timeline with state transitions and timestamps
- Citizen comments (authenticated, public)
- Co-sign count — citizens who independently confirm they are also affected
- Share bar: direct share to **X (Twitter)** and **WhatsApp** with pre-filled text and incident URL

### Public Weekly Report (`/status/weekly`)

- System-wide summary cards: platforms monitored, average uptime, incidents detected, resolved, citizen reports, platforms with 100% uptime
- Per-platform performance table: uptime %, incidents, resolved, avg resolution hours, reports, co-signs
- Highlights section: top performer (perfect uptime), most reported platform, fastest resolution
- Share bar (X + WhatsApp) with state-aware text
- Revalidated hourly; linked from the status page nav

### Citizen App (Flutter)

- Phone OTP login via Africa's Talking SMS
- Google OAuth login (mobile — access token exchanged server-side)
- Report a platform as **Affected** or **OK**, optionally with a proof photo and current location
- View active incidents; add comments and co-sign incidents
- Manage notification subscriptions per platform
- Profile: display name, update or unlink identities

### Push Notifications (FCM)

- High-priority FCM v1 delivery via `android.priority = HIGH` and `channel_id = 'incidents'`
- Bypasses Android Doze mode using the dedicated Flutter `incidents` notification channel
- Supports both phone OTP users and Google OAuth citizens simultaneously
- Dispatched immediately when fusion opens a new incident
- Operator-triggered updates and resolution confirmations also sent via separate FCM calls

### Operator Portal (`/operator`)

**Dashboard**
- Live platform state, 7-day uptime, recent incident history
- Open incident count and last probe time

**Incident Management (`/operator/incidents/[id]`)**
- Advance incidents through the lifecycle: Detected → Acknowledged → Partially Resolved → Resolved
- Add operator comments (status updates visible on the public incident page)
- Share incident directly to **X** ("Our team is investigating…") and **WhatsApp**
- Quick link to the public incident page

**Maintenance Windows (`/operator/maintenance`)**
- Schedule planned downtime with title, start, and end time
- Shown as a warning banner on the public status page up to 24 hours in advance

**API Keys (`/operator/api-keys`)**
- Generate long-lived keys (format: `phas_<48-hex-chars>`) for programmatic integration
- Key hash stored in database; raw key shown once on creation with a copy button
- Revoke any key at any time
- All operator API endpoints accept `X-Api-Key: phas_...` as an alternative to Bearer JWT

**Programmatic Incident Creation**
```
POST /api/operator/incidents
X-Api-Key: phas_<key>
Content-Type: application/json

{ "platformId": "<uuid>", "description": "Scheduled maintenance completed early" }
```
Returns `{ incidentId, recurred }`. Returns 409 if an open incident already exists.  
Intended for external integrations such as MTN's SMS gateway or ticketing systems.

**Profile & Avatar**
- Update operator display name and profile avatar (uploaded to Vercel Blob)

### Regulator Portal (`/regulator`)

- Aggregated stats across all platforms under the authority
- Per-platform uptime and incident trend charts
- Read-only access; no ability to modify incident state

### PHAS Admin (`/admin`)

- Create and manage operator and regulator accounts
- Register platforms under authorities
- Upload platform avatars
- View system-wide account list with role labels

### Automated Intelligence (Fusion Engine)

The worker runs a **probe + fusion** cycle on a configurable schedule (default: every 5 minutes).

**Probe:** Each platform's base URL is fetched; response code and latency are recorded in `probe_results`.

**Fusion:** Combines two independent signals to decide whether to open, advance, or close an incident:

| Signal | Default threshold |
|---|---|
| Consecutive probe failures | ≥ 2 |
| Citizen "affected" ratio | ≥ 30% of reports within 2 hours, with ≥ 5 reporters |

Confidence score = `probe_score × 0.6 + crowd_ratio × 0.4`

**Incident state machine:**
```
detected → confirmed → acknowledged → partially_resolved → resolved
                                                         ↘ recurred (within 7 days)
```

Fusion also runs immediately (via internal HTTP call) when a new citizen report arrives, so incidents can open within seconds of the first reports.

**Environment overrides:**

| Variable | Default | Purpose |
|---|---|---|
| `FUSION_OPEN_PROBE_FAILURES` | `2` | Consecutive failures to open |
| `FUSION_OPEN_AFFECTED_RATIO` | `0.30` | Crowd ratio to open |
| `FUSION_OPEN_MIN_REPORTERS` | `5` | Minimum reporters for crowd trigger |
| `FUSION_OPEN_WINDOW_HOURS` | `2` | Rolling window for crowd signal |
| `FUSION_CLOSE_PROBE_PASSES` | `3` | Consecutive passes to close |
| `FUSION_CLOSE_RATIO_THRESHOLD` | `0.10` | Max crowd ratio to close |
| `FUSION_RECUR_WINDOW_DAYS` | `7` | Days to consider a recurrence |

### Email Notifications

All sent via **Resend**. Falls back to no-op if `RESEND_API_KEY` is unset.

| Trigger | Recipient |
|---|---|
| New incident detected | Platform operator (contact email) |
| Incident recurred | Platform operator |
| Monday 07:00 EAT | PHAS admin — weekly performance digest |

Weekly email digest includes: platforms monitored, average uptime, incidents, resolved count, citizen reports, and a link to `/status/weekly`.

### Scheduled Jobs (Vercel Cron)

| Schedule | Endpoint | Purpose |
|---|---|---|
| `0 0 * * *` — daily midnight UTC | `/api/cron/probe` | Trigger probe cycle |
| `0 5 * * 1` — Monday 05:00 UTC | `/api/cron/weekly-report` | Send weekly admin email |

---

## Database

PostgreSQL (Neon serverless). Migrations are plain `.sql` files in `db/migrations/`.

| # | Migration | Purpose |
|---|---|---|
| 001 | init | Platforms, authorities, incidents, reports, probe_results |
| 002 | proof_image | Photo attachment on reports |
| 003 | location_fields | Lat/lon + locality on reports |
| 004 | cosigns_comments | Incident co-signs and public comments |
| 005 | device_tokens | FCM device registration |
| 006 | operator_auth | Operator accounts and platform assignment |
| 007 | regulator_auth | Regulator accounts and authority assignment |
| 008 | maintenance_windows | Planned downtime windows |
| 009 | anonymous_reports | Allow reports without login |
| 010 | avatar_urls | Operator/regulator profile photos |
| 011 | citizen_accounts | Google OAuth citizen identity table |
| 012 | user_name | Display names on phone-OTP users |
| 013 | setup_tokens | One-time invite tokens for onboarding |
| 014 | regulator_authority_optional | Allow regulator with no authority |
| 015 | platform_auth | Platform-level auth metadata |
| 016 | authority_auth | Authority-level auth metadata |
| 017 | citizen_comments | Link comments to citizen accounts |
| 018 | citizen_notifications | Extend device_tokens and subscriptions to support both phone and Google OAuth citizens |
| 019 | platform_api_keys | Long-lived API keys for external integrations |

---

## Environment Variables

### Web (`web/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `JWT_SECRET` | Yes | Signs operator/regulator JWTs |
| `JWT_EXPIRY_SECONDS` | No | Default `86400` (24 h) |
| `ADMIN_SECRET` | Yes | Admin bootstrap password |
| `AUTH_SECRET` | Yes | NextAuth session secret |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `AT_API_KEY` | No | Africa's Talking SMS key (OTPs logged to console if absent) |
| `AT_USERNAME` | No | Africa's Talking username (default `sandbox`) |
| `AT_SENDER_ID` | No | SMS sender ID (default `PHAS`) |
| `RESEND_API_KEY` | No | Resend email key (emails silently skipped if absent) |
| `EMAIL_FROM` | No | From address (default `PHAS <alerts@phas.rw>`) |
| `ADMIN_REPORT_EMAIL` | No | Recipient for weekly digest emails |
| `DEV_EMAIL_OVERRIDE` | No | Fallback recipient in dev |
| `NEXT_PUBLIC_APP_URL` | No | Public base URL — live: `https://phas-three.vercel.app` |
| `CRON_SECRET` | No | Secures `/api/cron/*` endpoints on Vercel |
| `FUSION_OPEN_MIN_REPORTERS` | No | Override fusion threshold (useful for testing) |

### Worker (`worker/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Same Neon connection string |
| `PROBE_CRON` | No | node-cron expression (default `*/5 * * * *`) |
| `INTERNAL_PORT` | No | Internal HTTP port for fusion triggers (default `3001`) |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | FCM service account JSON (for push dispatch) |

---

## Local Development

### Web

```bash
cd web
npm install
# Create web/.env from the table above
npm run dev          # http://localhost:3000
```

### Worker

```bash
cd worker
npm install
# Create worker/.env
npm run dev          # probes every 5 min; internal server on :3001
```

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

Ensure `NEXT_PUBLIC_APP_URL` in web points to your dev tunnel or ngrok address so the mobile app can reach the API.

---

## API Key Integration

Operators can generate API keys from `/operator/api-keys`. Use the key to call any operator endpoint without a browser session:

```bash
# Manually open an incident (e.g. from an SMS gateway)
curl -X POST https://phas-three.vercel.app/api/operator/incidents \
  -H "X-Api-Key: phas_<key>" \
  -H "Content-Type: application/json" \
  -d '{"platformId":"<uuid>","description":"Scheduled maintenance complete"}'

# List current incidents
curl https://phas-three.vercel.app/api/operator/incidents \
  -H "X-Api-Key: phas_<key>"
```

Keys can be revoked at any time from the [API Keys page](https://phas-three.vercel.app/operator/api-keys). The raw key is shown only once at creation.

---

## Sharing

Both the public incident page and the operator incident detail page include one-tap share buttons for **X (Twitter)** and **WhatsApp**. The weekly report page includes share buttons for the system-wide digest.

Operator-voiced share text: *"[Platform] is currently experiencing issues. Our team is investigating. Track updates: [URL]"*

Citizen-voiced share text: *"[Platform] is currently [state]. Follow updates on PHAS: [URL]"*

---

## License

Private — Rwanda ICT Authority / PHAS project.
