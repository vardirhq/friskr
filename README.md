<p align="center">
  <img src="assets/friskr-wordmark.svg" alt="friskr" width="260">
</p>

<p align="center">
  <strong>Know what is fresh. Use it before it becomes waste.</strong>
</p>

<p align="center">
  A shared household inventory app for tracking food, expiry dates, storage
  locations, and shopping needs.
</p>

---

Friskr is a Norwegian-first Android and web app that makes the contents of a
fridge, freezer, and pantry visible to the whole household. Add products
manually or by barcode, scan printed expiry dates, receive reminders, and mark
food as used or discarded.

The application is built as a React web app packaged for Android with
Capacitor. Its backend is a self-hosted Fastify API backed by PostgreSQL.

## What It Does

- Shared stock inventory with live household updates
- Barcode scanning with catalogue and Open Food Facts lookup
- Expiry-date scanning using native Android ML Kit text recognition
- Manual date entry and quick date presets
- Fridge, freezer, pantry, and household-defined storage locations
- Product catalogue with custom products and archiving
- Expiry reminders through Android local notifications
- Shopping list with stock-based suggestions
- Used-versus-discarded statistics
- Email OTP authentication and household invitations
- Light and dark themes
- Built-in scanner diagnostics through a hidden UI debug mode

The primary UI language is Norwegian.

## Stack

| Area | Technology |
| --- | --- |
| Client | React 19, TypeScript, Vite |
| State | Zustand |
| Android | Capacitor 8 |
| Barcode scanning | Capacitor ML Kit Barcode Scanning |
| Date scanning | Camera Preview + custom ML Kit text-recognition plugin |
| Browser OCR fallback | Tesseract.js |
| Notifications | Capacitor Local Notifications |
| API | Node.js 22, Fastify 5 |
| Database | PostgreSQL, Drizzle ORM, postgres.js |
| Authentication | Email OTP, JWT, rotating refresh tokens |
| Realtime | Server-sent events + PostgreSQL `LISTEN/NOTIFY` |
| Android delivery | Deploid |

## Architecture

```text
┌──────────────────────────────────────────────┐
│ React + Zustand                             │
│ screens, sheets, local settings, API client │
└───────────────────┬──────────────────────────┘
                    │
          Capacitor │ HTTPS / SSE
                    │
┌───────────────────▼──────────────────────────┐
│ Android native layer                        │
│ camera, barcode scanner, ML Kit OCR, alerts │
└───────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│ Fastify API                                 │
│ OTP auth, household isolation, stock CRUD   │
└───────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│ PostgreSQL                                  │
│ data, migrations, triggers, LISTEN/NOTIFY   │
└──────────────────────────────────────────────┘
```

Every household-scoped API query derives the household ID from the signed JWT,
not from a client-controlled query parameter.

## Repository Layout

```text
.
├── src/
│   ├── components/       Shared UI components and icons
│   ├── lib/              API, auth, realtime, OCR, dates, notifications
│   ├── screens/          Main screens and modal flows
│   ├── stores/           Zustand domain stores
│   └── styles/           Design tokens and global styles
├── android/              Capacitor Android project and native OCR plugin
├── server/
│   ├── src/db/           Drizzle schema and ordered SQL migrations
│   ├── src/routes/       Fastify API routes
│   ├── src/plugins/      JWT, CORS, and realtime notification plumbing
│   └── src/test/         API integration tests
├── assets/               Brand and source artwork
├── docs/                 Design and backend specifications
├── supabase/             Legacy pre-self-hosting schema and functions
└── deploid.config.ts     Android packaging and deployment configuration
```

`server/` is the active backend. The `supabase/` directory is retained as
historical migration and design material; the running app does not use
Supabase.

## Prerequisites

- Node.js 22
- npm
- PostgreSQL
- Java 21 or another JDK supported by the checked-in Android Gradle toolchain
- Android SDK and `adb`
- Deploid available on `PATH`
- An SMTP server for OTP and invitation emails

The web client can run without Android tooling. Camera and notification behavior
must be verified on an Android device.

## Local Setup

### 1. Install dependencies

```bash
npm ci
npm --prefix server ci
```

### 2. Create local databases

```bash
createdb friskr
createdb friskr_test
```

Use different names or connection details if needed.

### 3. Configure the API

```bash
cp server/.env.example server/.env
```

Set the values in `server/.env`:

```dotenv
DATABASE_URL=postgres://user:pass@localhost:5432/friskr
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/friskr_test
JWT_SECRET=replace-with-a-long-random-secret
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@friskr.local
PORT=3001
```

Mailpit or another local SMTP catcher is convenient during development.

### 4. Run migrations

```bash
cd server
npm run migrate
```

Migrations are ordered SQL files in `server/src/db/migrations/`. Never modify a
migration that has already run in an environment. Add a new forward migration.

### 5. Configure the client

Create `.env.local` at the repository root:

```dotenv
VITE_API_BASE_URL=
```

An empty value uses the Vite proxy, which forwards `/api` and `/auth` to
`http://localhost:3001`.

### 6. Start the app

Run the API:

```bash
npm --prefix server run dev
```

In another terminal, run the client:

```bash
npm run dev
```

Open the URL printed by Vite. Requesting an OTP requires the configured SMTP
server to be reachable.

## Android Workflow

Deploid is the canonical packaging, build, and deployment path for this
repository.

```bash
# Build the web app and sync/package the Capacitor project
deploid package

# Build the Android artifact
deploid build

# Confirm that adb can see the target device
deploid devices

# Install and launch
deploid deploy --force --launch
```

Useful device commands:

```bash
deploid logs
deploid uninstall
```

The app ID is `dev.madsens.friskr`.

The date scanner is intentionally embedded in the app. On Android it uses
`CameraPreview` behind the WebView and sends captured frames to
`ExpiryTextRecognizerPlugin`, which runs ML Kit text recognition natively.
Tesseract.js is only the browser fallback.

## Server Commands

Run these from `server/`:

```bash
npm run dev          # Watch mode
npm run build        # Compile TypeScript
npm run start        # Run compiled output
npm run migrate      # Apply pending SQL migrations
npm test             # API integration tests
npm run test:watch   # Watch tests
```

The tests use `TEST_DATABASE_URL` and clear application data between cases. Do
not point that variable at a database containing data you need.

## Client Commands

Run these from the repository root:

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Production API

The server image runs migrations before starting Fastify:

```bash
cd server
docker compose up -d --build
```

`server/docker-compose.yml` expects `server/.env.production` and uses host
networking. PostgreSQL and the reverse proxy are managed outside this Compose
file.

At minimum, production needs:

- A reachable PostgreSQL database
- A strong JWT secret
- Working SMTP credentials
- TLS termination and reverse proxying to port `3001`
- `/health` exposed for health checks
- The client built with the correct `VITE_API_BASE_URL`

Check startup logs after every migration. A successful boot reports each
migration as `ran` or `skip`, followed by the listening address.

## API Overview

```text
POST   /auth/otp/request
POST   /auth/otp/verify
POST   /auth/refresh
POST   /auth/signout

GET    /api/me
PATCH  /api/me
DELETE /api/me

GET    /api/household
POST   /api/household
POST   /api/household/join
GET    /api/household/members
POST   /api/household/invite

GET    /api/products
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id
POST   /api/products/:id/restore

GET    /api/locations
POST   /api/locations
PATCH  /api/locations/:id
DELETE /api/locations/:id

GET    /api/stock
POST   /api/stock
PUT    /api/stock/:id
PATCH  /api/stock/:id/consume
PATCH  /api/stock/:id/discard
PATCH  /api/stock/:id/restore
GET    /api/stock/stats

GET    /api/shopping
POST   /api/shopping
PATCH  /api/shopping/:id
DELETE /api/shopping/:id
GET    /api/shopping/suggestions

GET    /api/scan?barcode=<code>
GET    /api/realtime/household?token=<jwt>
GET    /health
```

Errors use this shape:

```json
{
  "error": "Human-readable explanation",
  "code": "MACHINE_READABLE_CODE"
}
```

## Scanner Debug Mode

The app contains a UI-only diagnostic mode for scanner development:

1. Open **Innstillinger**.
2. Tap the version row seven times.
3. Open the date scanner.
4. Capture a date.

The scanner then displays the raw text returned by native ML Kit or the web OCR
fallback. This is the first place to look when the camera works but no date is
detected.

Date parsing currently accepts common Norwegian and European formats including:

- `DD.MM.YYYY`
- `DD.MM.YY`
- `DD/MM/YYYY`
- `YYYY-MM-DD`
- compact `DDMMYY` and `DDMMYYYY`
- `MM/YYYY`, interpreted as the final day of that month

OCR output is normalized for common character confusion such as `O`/`0` and
`I`/`1`. Parsed dates are constrained to a reasonable expiry window.

## Realtime and Notifications

PostgreSQL triggers publish household IDs through `NOTIFY friskr_changes`.
Fastify listens on a dedicated connection and fans changes out over an SSE
stream. The client reloads stock and shopping data when a household event
arrives.

Expiry alerts are local Android notifications. They are resynchronized when
stock changes and whenever the app resumes. Notification settings are stored on
the device.

## Troubleshooting

### Saving from the add sheet returns “Noe gikk galt”

Inspect the API logs and confirm every migration ran. Stock creation validates
both the product and location against the authenticated household. Schema drift
in the `locations`, `products`, or `stock_items` tables can surface here.

### The camera preview is black or covered

- Test on Android, not only in a desktop browser.
- Confirm camera permission is granted.
- Check that no stale scanner activity remains after navigating back.
- Repackage after native or Capacitor configuration changes.
- Enable scanner debug mode and inspect Deploid logs.

### The camera works but no date is found

- Fill the guide area with the printed date.
- Avoid glare and motion blur.
- Capture at close range with the date in focus.
- Enable debug mode and inspect the raw OCR text.
- Add parser coverage before adding more image heuristics when OCR text is
  already correct.

### Realtime updates do not arrive

- Confirm the PostgreSQL notification triggers exist.
- Check the API's dedicated `LISTEN` connection.
- Ensure the reverse proxy does not buffer or prematurely close SSE responses.
- Confirm the JWT in the SSE URL is current.

### Android changes are missing

Run the complete Deploid flow again:

```bash
deploid package
deploid build
deploid deploy --force --launch
```

Native source changes are not picked up by a Vite-only rebuild.

## Engineering Notes

- Preserve household authorization at the query boundary.
- Prefer forward-only migrations with `if not exists` where appropriate.
- Keep scanner capture, OCR, and date parsing as separate concerns.
- Verify camera changes on a physical Android device.
- Keep API response shapes stable because the stores map them into UI-specific
  models.
- Do not commit `.env`, signing keys, database dumps, APKs, or local worktrees.

## Status

Friskr is under active development. The core household, stock, shopping,
product, location, barcode, date scanning, reminder, and statistics workflows
are implemented. Scanner accuracy remains dependent on print quality, focus,
lighting, and packaging contrast.

## License

No open-source license has been declared. All rights are reserved unless the
repository owner states otherwise.
