# Friskr Backend API Design

**Date:** 2026-06-05  
**Status:** Approved  
**Replaces:** Supabase (auth + database + realtime + edge functions)

---

## Overview

Friskr is moving from Supabase to a self-hosted PostgreSQL database. This spec describes the backend API that replaces all Supabase functionality: authentication, data access, realtime push, and barcode lookup.

The frontend data layer (`src/lib/friskr.ts`, `src/lib/auth.ts`, `src/lib/realtime.ts`) stays structurally intact — only the transport layer changes (Supabase client → fetch calls to this API).

---

## Tech Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 22 + TypeScript |
| HTTP framework | Fastify |
| Auth | `@fastify/jwt` (JWT) + Nodemailer (OTP email) |
| Database ORM | Drizzle ORM (`drizzle-orm` + `drizzle-kit`) |
| DB driver | `postgres` (postgres.js) |
| Realtime | SSE (server-sent events) + pg LISTEN/NOTIFY |
| CORS | `@fastify/cors` |

---

## Project Structure

```
friskr/
├── server/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts       ← Drizzle schema (mirrors existing SQL)
│   │   │   ├── client.ts       ← postgres.js pool + Drizzle instance
│   │   │   └── migrations/     ← drizzle-kit output
│   │   ├── routes/
│   │   │   ├── auth.ts         ← /auth/* endpoints
│   │   │   ├── stock.ts        ← /api/stock/* endpoints
│   │   │   ├── products.ts     ← /api/products/*
│   │   │   ├── locations.ts    ← /api/locations/*
│   │   │   ├── household.ts    ← /api/household/*
│   │   │   ├── scan.ts         ← /api/scan
│   │   │   └── realtime.ts     ← /api/realtime/household (SSE)
│   │   ├── plugins/
│   │   │   ├── jwt.ts          ← @fastify/jwt setup + preHandler hook
│   │   │   ├── cors.ts         ← @fastify/cors setup
│   │   │   └── notify.ts       ← pg LISTEN connection + SSE fan-out
│   │   └── index.ts            ← app entry point, plugin/route registration
│   ├── package.json
│   └── tsconfig.json
└── src/
    └── lib/
        ├── api.ts              ← new: fetch wrapper, token storage, refresh logic
        ├── friskr.ts           ← swap supabase calls → api.ts calls (shapes unchanged)
        ├── auth.ts             ← rewrite: email OTP via /auth/* endpoints
        └── realtime.ts        ← rewrite: EventSource instead of supabase.channel
```

---

## Authentication

### Flow

1. **Request OTP** — `POST /auth/otp/request` with `{ email }`. Server generates a 6-digit code, stores it with a 10-minute TTL, sends it via Nodemailer.
2. **Verify OTP** — `POST /auth/otp/verify` with `{ email, code }`. On success: upserts the user row, returns a signed JWT (7-day expiry) and a refresh token.
3. **Refresh** — `POST /auth/refresh` with `{ refreshToken }`. Returns a new JWT.
4. **Sign out** — `POST /auth/signout`. Revokes the refresh token.

### JWT Payload

```json
{ "sub": "<userId>", "householdId": "<householdId | null>" }
```

`householdId` is `null` until the user creates or joins a household. The payload is re-issued on household join/create so the claim stays current without a DB lookup on every request.

### New DB Tables

```sql
create table users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

create table otp_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  code       text not null,
  expires_at timestamptz not null,
  used       boolean not null default false
);

create table refresh_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token      text not null unique,
  expires_at timestamptz not null,
  revoked    boolean not null default false
);
```

### Migration Required

`household_members.user_id` currently references `auth.users(id)` (Supabase internal). This must be re-pointed to `users(id)` in a migration. Existing member rows will need user records inserted first.

### Frontend Token Storage

JWT stored in `localStorage` under `friskr_jwt`. Refresh token stored under `friskr_refresh`. The `api.ts` fetch wrapper reads the JWT, attaches it as `Authorization: Bearer`, and calls `/auth/refresh` transparently on 401.

---

## API Routes

All routes except `/auth/*` require `Authorization: Bearer <jwt>`. A Fastify `preHandler` hook validates the JWT and attaches `req.user = { userId, householdId }` to the request.

Authorization mirrors old RLS: every query filters by the `householdId` from the JWT. No user-controlled WHERE clauses — cross-household access is structurally impossible.

### Auth

```
POST /auth/otp/request    { email }
POST /auth/otp/verify     { email, code }
POST /auth/refresh        { refreshToken }
POST /auth/signout        (requires JWT)
```

### Stock

```
GET    /api/stock                   → in-stock items for household, sorted by urgency
POST   /api/stock                   → insert stock item
PUT    /api/stock/:id               → update stock item
PATCH  /api/stock/:id/consume       → mark used_up
PATCH  /api/stock/:id/discard       → mark discarded
PATCH  /api/stock/:id/restore       → restore to in_stock
GET    /api/stock/stats?since=<ISO> → saved/wasted counts for household
```

### Products

```
GET  /api/products     → global catalogue + household custom products
POST /api/products     → create household custom product
```

### Locations

```
GET    /api/locations        → shared defaults + household custom locations
POST   /api/locations        → create custom location
PATCH  /api/locations/:id    → update label/icon/freezer/hue
DELETE /api/locations/:id    → delete (fails with 409 if items present)
```

### Household

```
GET  /api/household         → household info + members
POST /api/household         → create household (re-issues JWT with householdId)
POST /api/household/join    → join by invite code (re-issues JWT with householdId)
GET  /api/household/members → member list
```

### Scan

```
GET /api/scan?barcode=<ean>
```

Checks the products catalogue first. Falls back to the OpenFoodFacts public API (`https://world.openfoodfacts.org/api/v2/product/<ean>`). Returns `{ source: 'catalogue' | 'openfoodfacts' | 'none', ... }` — same shape as the existing Supabase edge function.

### Realtime

```
GET /api/realtime/household?token=<jwt>
```

Opens an SSE stream (`Content-Type: text/event-stream`). Because `EventSource` does not support custom headers, the JWT is passed as a short-lived query param `token`. The server validates it on the handshake only; the param is not re-checked on keepalives.

---

## Realtime Architecture

### pg LISTEN/NOTIFY

A single dedicated Postgres connection (outside the query pool) runs `LISTEN friskr_changes`.

Two triggers fire `NOTIFY friskr_changes, '<householdId>'` on insert/update/delete to `stock_items` and `household_members`:

```sql
create or replace function notify_household_change()
returns trigger language plpgsql as $$
begin
  perform pg_notify('friskr_changes',
    coalesce(NEW.household_id, OLD.household_id)::text);
  return null;
end;
$$;

create trigger stock_items_notify
after insert or update or delete on stock_items
for each row execute function notify_household_change();

create trigger household_members_notify
after insert or update or delete on household_members
for each row execute function notify_household_change();
```

### SSE Fan-out

The `notify` plugin maintains an in-memory `Map<householdId, Set<SSEResponse>>`. On `NOTIFY`, it iterates the set for that `householdId` and writes `data: changed\n\n` to each connected client. A 30-second keepalive comment (`:\n\n`) prevents proxy timeouts. Connections are removed from the map on client disconnect.

### Frontend

`src/lib/realtime.ts` is rewritten to use `EventSource`:

```ts
export function subscribeHousehold(_householdId: string, onChange: () => void) {
  const token = localStorage.getItem('friskr_jwt');
  const es = new EventSource(`/api/realtime/household?token=${token}`);
  es.onmessage = () => onChange();
  return () => es.close();
}
```

The `_householdId` param is no longer needed on the client — the server resolves it from the JWT.

---

## Error Handling

All errors follow a consistent shape:

```json
{ "error": "human-readable message", "code": "MACHINE_CODE" }
```

| HTTP | Code | When |
|---|---|---|
| 400 | `INVALID_INPUT` | Validation failure |
| 401 | `UNAUTHORIZED` | Missing or expired JWT |
| 403 | `FORBIDDEN` | JWT valid but wrong household |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | e.g. delete location with items |
| 500 | `INTERNAL` | Unexpected server error |

---

## Environment Variables

```
DATABASE_URL=postgres://user:pass@localhost:5432/friskr
JWT_SECRET=<random 256-bit secret>
REFRESH_TOKEN_SECRET=<random 256-bit secret>
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@friskr.app
PORT=3001
```

---

## Frontend Changes Summary

| File | Change |
|---|---|
| `src/lib/supabase.ts` | Delete |
| `src/lib/api.ts` | New: fetch wrapper + token storage + auto-refresh |
| `src/lib/auth.ts` | Rewrite: same function signatures, fetch instead of supabase |
| `src/lib/realtime.ts` | Rewrite: EventSource instead of supabase.channel |
| `src/lib/friskr.ts` | Swap `supabase.from(...)` → `api.get/post/patch(...)` calls |
| `src/lib/database.types.ts` | Can be replaced by Drizzle's inferred types (optional) |
| `package.json` (frontend) | Remove `@supabase/supabase-js` |
