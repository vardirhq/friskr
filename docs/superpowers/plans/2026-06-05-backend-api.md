# Friskr Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Fastify + Drizzle + SSE backend API that replaces Supabase for auth, data access, and realtime, then migrate the frontend to use it.

**Architecture:** Node.js 22 + TypeScript Fastify server in `server/` directory. Drizzle ORM talks to the existing PostgreSQL schema. JWTs issued on email OTP verification. pg LISTEN/NOTIFY triggers SSE pushes to connected clients.

**Tech Stack:** Fastify 5, @fastify/jwt, @fastify/cors, drizzle-orm, postgres.js, nodemailer, vitest

---

## File Map

**New — server:**
- `server/package.json` — server deps (separate from frontend)
- `server/tsconfig.json` — Node ESM TypeScript
- `server/vitest.config.ts` — test config
- `server/.env.example` — env var template
- `server/src/index.ts` — `buildApp()` factory + server entry
- `server/src/db/schema.ts` — Drizzle table definitions
- `server/src/db/client.ts` — postgres.js pool + drizzle instance
- `server/src/db/migrate.ts` — migration runner
- `server/src/db/migrations/0001_auth_tables.sql` — users, otp_codes, refresh_tokens
- `server/src/db/migrations/0002_rls_to_users_fk.sql` — re-point household_members FK
- `server/src/db/migrations/0003_notify_triggers.sql` — LISTEN/NOTIFY triggers
- `server/src/plugins/cors.ts` — @fastify/cors
- `server/src/plugins/jwt.ts` — @fastify/jwt + `requireAuth` preHandler
- `server/src/plugins/notify.ts` — LISTEN connection + SSE fan-out map
- `server/src/lib/otp.ts` — generate, store, verify OTP codes
- `server/src/lib/email.ts` — Nodemailer OTP sender
- `server/src/routes/auth.ts` — /auth/* endpoints
- `server/src/routes/stock.ts` — /api/stock/*
- `server/src/routes/products.ts` — /api/products/*
- `server/src/routes/locations.ts` — /api/locations/*
- `server/src/routes/household.ts` — /api/household/*
- `server/src/routes/scan.ts` — /api/scan
- `server/src/routes/realtime.ts` — /api/realtime/household SSE
- `server/src/test/helpers.ts` — createTestApp + cleanDb utilities

**Modified — frontend:**
- `src/lib/api.ts` — NEW: fetch wrapper, token storage, auto-refresh
- `src/lib/auth.ts` — rewrite: same signatures, fetch calls
- `src/lib/realtime.ts` — rewrite: EventSource
- `src/lib/friskr.ts` — swap supabase calls → api calls
- `vite.config.ts` — add dev proxy for /api and /auth → localhost:3001
- `package.json` (root) — remove @supabase/supabase-js

**Deleted:**
- `src/lib/supabase.ts`

---

## Shared Types (reference for all tasks)

```typescript
// JWT payload shape — used in jwt.ts plugin and auth routes
interface JWTPayload {
  sub: string;          // userId
  householdId: string | null;
}

// Attached to every authenticated request by requireAuth
// Declared in jwt.ts via FastifyRequest augmentation:
// declare module 'fastify' { interface FastifyRequest { user: ReqUser } }
interface ReqUser {
  userId: string;
  householdId: string | null;
}

// All error responses
interface ErrorBody {
  error: string;
  code: 'INVALID_INPUT' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';
}
```

---

## Task 1: Server scaffold

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/.env.example`
- Create: `server/src/index.ts`
- Create: `server/src/test/helpers.ts`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "friskr-server",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "migrate": "tsx src/db/migrate.ts"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.2",
    "@fastify/jwt": "^9.1.0",
    "dotenv": "^16.5.0",
    "drizzle-orm": "^0.40.1",
    "fastify": "^5.3.2",
    "fastify-plugin": "^5.0.1",
    "nodemailer": "^7.0.5",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "@types/nodemailer": "^6.4.17",
    "drizzle-kit": "^0.30.5",
    "tsx": "^4.19.4",
    "typescript": "~5.8.3",
    "vitest": "^3.2.3"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create server/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15000,
  },
});
```

- [ ] **Step 4: Create server/src/test/setup.ts**

```typescript
import 'dotenv/config';
// Route all DB operations in tests to the test database
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
```

- [ ] **Step 5: Create server/.env.example**

```
DATABASE_URL=postgres://user:pass@localhost:5432/friskr
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/friskr_test
JWT_SECRET=change-me-256-bits
REFRESH_TOKEN_SECRET=change-me-256-bits
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@friskr.app
PORT=3001
```

- [ ] **Step 6: Write failing health check test**

Create `server/src/test/health.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../index.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 7: Run test — expect failure**

```bash
cd server && npm install && npm test
```

Expected: FAIL — `buildApp` not found.

- [ ] **Step 8: Create server/src/index.ts**

```typescript
import 'dotenv/config';
import Fastify, { type FastifyServerOptions } from 'fastify';

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);

  app.get('/health', async () => ({ ok: true }));

  return app;
}

// Entry point — only runs when executed directly
const isMain = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMain) {
  const app = await buildApp({ logger: { level: 'info' } });
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
  console.log(`Server running on port ${process.env.PORT ?? 3001}`);
}
```

- [ ] **Step 9: Run test — expect pass**

```bash
npm test
```

Expected: PASS — `GET /health` returns `{ ok: true }`.

- [ ] **Step 10: Create server/src/test/helpers.ts** (used by all subsequent tests)

```typescript
import { buildApp } from '../index.js';
import { db } from '../db/client.js';
import {
  stockItems, householdMembers, locations, products,
  households, refreshTokens, otpCodes, users,
} from '../db/schema.js';
import { isNotNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({ logger: false });
  await app.ready();
  return app;
}

export async function cleanDb() {
  await db.delete(stockItems);
  await db.delete(householdMembers);
  await db.delete(locations).where(isNotNull(locations.householdId));
  await db.delete(products).where(isNotNull(products.householdId));
  await db.delete(households);
  await db.delete(refreshTokens);
  await db.delete(otpCodes);
  await db.delete(users);
}
```

- [ ] **Step 11: Commit**

```bash
git add server/
git commit -m "feat(server): scaffold Fastify server with health check"
```

---

## Task 2: DB schema + client

**Files:**
- Create: `server/src/db/schema.ts`
- Create: `server/src/db/client.ts`

- [ ] **Step 1: Create server/src/db/schema.ts**

```typescript
import {
  pgTable, uuid, text, boolean, timestamp, date,
  numeric, integer,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').notNull().default(false),
});

export const households = pgTable('households', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const householdMembers = pgTable('household_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  displayName: text('display_name'),
  colorHue: integer('color_hue').default(145),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  icon: text('icon').notNull(),
  hue: integer('hue').notNull().default(160),
  sort: integer('sort').notNull().default(100),
});

export const locations = pgTable('locations', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  icon: text('icon').notNull(),
  hue: integer('hue').notNull().default(160),
  sort: integer('sort').notNull().default(100),
  freezer: boolean('freezer').notNull().default(false),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  brand: text('brand').default(''),
  categoryId: text('category_id').notNull().references(() => categories.id),
  defaultShelfDays: integer('default_shelf_days'),
  barcode: text('barcode'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const stockItems = pgTable('stock_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  locationId: text('location_id').notNull().references(() => locations.id),
  quantity: numeric('quantity').notNull().default('1'),
  expiryDate: date('expiry_date'),
  frozen: boolean('frozen').notNull().default(false),
  bestForDate: date('best_for_date'),
  note: text('note'),
  priceNok: numeric('price_nok', { precision: 10, scale: 2 }),
  status: text('status').notNull().default('in_stock'),
  addedBy: uuid('added_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});
```

- [ ] **Step 2: Create server/src/db/client.ts**

```typescript
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const sql = postgres(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export { sql };
```

- [ ] **Step 3: Commit**

```bash
git add server/src/db/
git commit -m "feat(server): add Drizzle schema and postgres.js client"
```

---

## Task 3: DB migrations

**Files:**
- Create: `server/src/db/migrations/0001_auth_tables.sql`
- Create: `server/src/db/migrations/0002_rls_to_users_fk.sql`
- Create: `server/src/db/migrations/0003_notify_triggers.sql`
- Create: `server/src/db/migrate.ts`

- [ ] **Step 1: Create 0001_auth_tables.sql**

```sql
-- Users table (replaces Supabase auth.users)
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists otp_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  code       text not null,
  expires_at timestamptz not null,
  used       boolean not null default false
);

create table if not exists refresh_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token      text not null unique,
  expires_at timestamptz not null,
  revoked    boolean not null default false
);
```

- [ ] **Step 2: Create 0002_rls_to_users_fk.sql**

```sql
-- Re-point household_members.user_id from auth.users to users.
-- Run AFTER migrating existing auth.users rows into users.
-- If starting fresh (no existing Supabase data), this is safe to run as-is.

alter table household_members
  drop constraint if exists household_members_user_id_fkey;

alter table household_members
  add constraint household_members_user_id_fkey
  foreign key (user_id) references users(id) on delete cascade;

-- Also fix stock_items.added_by if it references auth.users
alter table stock_items
  drop constraint if exists stock_items_added_by_fkey;

alter table stock_items
  add constraint stock_items_added_by_fkey
  foreign key (added_by) references users(id);
```

- [ ] **Step 3: Create 0003_notify_triggers.sql**

```sql
create or replace function notify_household_change()
returns trigger language plpgsql as $$
begin
  perform pg_notify(
    'friskr_changes',
    coalesce(NEW.household_id, OLD.household_id)::text
  );
  return null;
end;
$$;

drop trigger if exists stock_items_notify on stock_items;
create trigger stock_items_notify
  after insert or update or delete on stock_items
  for each row execute function notify_household_change();

drop trigger if exists household_members_notify on household_members;
create trigger household_members_notify
  after insert or update or delete on household_members
  for each row execute function notify_household_change();
```

- [ ] **Step 4: Create server/src/db/migrate.ts**

```typescript
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'migrations');

const sql = postgres(process.env.DATABASE_URL!);

await sql`
  create table if not exists _migrations (
    name text primary key,
    ran_at timestamptz not null default now()
  )
`;

const already = new Set(
  (await sql`select name from _migrations`).map((r) => r.name)
);

const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  if (already.has(file)) {
    console.log(`skip  ${file}`);
    continue;
  }
  const content = await readFile(join(migrationsDir, file), 'utf8');
  await sql.begin(async (tx) => {
    await tx.unsafe(content);
    await tx`insert into _migrations (name) values (${file})`;
  });
  console.log(`ran   ${file}`);
}

await sql.end();
console.log('Migrations complete.');
```

- [ ] **Step 5: Run migrations against both databases**

```bash
# Main DB
npm run migrate

# Test DB (create friskr_test first if needed)
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/friskr_test npm run migrate
```

Expected: `ran 0001_auth_tables.sql`, `ran 0002_rls_to_users_fk.sql`, `ran 0003_notify_triggers.sql`

- [ ] **Step 6: Commit**

```bash
git add server/src/db/migrations/ server/src/db/migrate.ts
git commit -m "feat(server): add auth tables and LISTEN/NOTIFY triggers"
```

---

## Task 4: JWT plugin + auth middleware

**Files:**
- Create: `server/src/plugins/cors.ts`
- Create: `server/src/plugins/jwt.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/auth-middleware.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../index.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  // Add a protected test route
  app.get('/test-protected', { preHandler: app.requireAuth }, async (req) => ({
    userId: req.user.userId,
  }));
  await app.ready();
});

afterAll(async () => { await app.close(); });

describe('requireAuth middleware', () => {
  it('rejects request with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/test-protected' });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('UNAUTHORIZED');
  });

  it('rejects request with invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/test-protected',
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('UNAUTHORIZED');
  });

  it('accepts a valid JWT', async () => {
    const token = app.jwt.sign({ sub: 'user-123', householdId: null });
    const res = await app.inject({
      method: 'GET',
      url: '/test-protected',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().userId).toBe('user-123');
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test src/test/auth-middleware.test.ts
```

Expected: FAIL — `app.requireAuth` not defined.

- [ ] **Step 3: Create server/src/plugins/cors.ts**

```typescript
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export const corsPlugin = fp(async (app: FastifyInstance) => {
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
});
```

- [ ] **Step 4: Create server/src/plugins/jwt.ts**

```typescript
import fp from 'fastify-plugin';
import jwtPlugin from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface JWTPayload {
  sub: string;
  householdId: string | null;
}

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: { userId: string; householdId: string | null };
  }
}

export const jwtAuthPlugin = fp(async (app: FastifyInstance) => {
  await app.register(jwtPlugin, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    sign: { expiresIn: '7d' },
  });

  const requireAuth = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
      const payload = req.user as unknown as JWTPayload;
      req.user = { userId: payload.sub, householdId: payload.householdId ?? null };
    } catch {
      return reply.code(401).send({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    }
  };

  app.decorate('requireAuth', requireAuth);
});
```

- [ ] **Step 5: Update server/src/index.ts**

```typescript
import 'dotenv/config';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { corsPlugin } from './plugins/cors.js';
import { jwtAuthPlugin } from './plugins/jwt.js';

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);

  await app.register(corsPlugin);
  await app.register(jwtAuthPlugin);

  app.get('/health', async () => ({ ok: true }));

  return app;
}

const isMain = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMain) {
  const app = await buildApp({ logger: { level: 'info' } });
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
  console.log(`Server running on port ${process.env.PORT ?? 3001}`);
}
```

- [ ] **Step 6: Run tests — expect pass**

```bash
npm test
```

Expected: PASS — all 3 middleware tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/plugins/ server/src/index.ts
git commit -m "feat(server): add JWT auth plugin and requireAuth middleware"
```

---

## Task 5: OTP + email utilities

**Files:**
- Create: `server/src/lib/email.ts`
- Create: `server/src/lib/otp.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/otp.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { db } from '../db/client.js';
import { users, otpCodes } from '../db/schema.js';
import { createOrFindUser, issueOtp, verifyOtp } from '../lib/otp.js';
import { cleanDb } from './helpers.js';

import { eq } from 'drizzle-orm';

// Prevent real emails
vi.mock('../lib/email.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(cleanDb);

describe('OTP flow', () => {
  it('creates a user on first OTP request', async () => {
    const user = await createOrFindUser('test@example.com');
    const [row] = await db.select().from(users).where(eq(users.email, 'test@example.com'));
    expect(row.id).toBe(user.id);
  });

  it('returns existing user on second request', async () => {
    const u1 = await createOrFindUser('test@example.com');
    const u2 = await createOrFindUser('test@example.com');
    expect(u1.id).toBe(u2.id);
  });

  it('issueOtp stores a 6-digit code with 10min TTL', async () => {
    const user = await createOrFindUser('test@example.com');
    const code = await issueOtp(user.id);
    expect(code).toMatch(/^\d{6}$/);
    const [row] = await db.select().from(otpCodes).where(eq(otpCodes.userId, user.id));
    expect(row.used).toBe(false);
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now() + 9 * 60 * 1000);
  });

  it('verifyOtp returns userId on correct code', async () => {
    const user = await createOrFindUser('test@example.com');
    const code = await issueOtp(user.id);
    const result = await verifyOtp('test@example.com', code);
    expect(result).toBe(user.id);
  });

  it('verifyOtp returns null on wrong code', async () => {
    const user = await createOrFindUser('test@example.com');
    await issueOtp(user.id);
    const result = await verifyOtp('test@example.com', '000000');
    expect(result).toBeNull();
  });

  it('verifyOtp returns null on reuse', async () => {
    const user = await createOrFindUser('test@example.com');
    const code = await issueOtp(user.id);
    await verifyOtp('test@example.com', code);
    const result = await verifyOtp('test@example.com', code);
    expect(result).toBeNull();
  });
});
```

Add missing import to the test file (needed at top):
```typescript
import { eq } from 'drizzle-orm';
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test src/test/otp.test.ts
```

Expected: FAIL — `createOrFindUser` not found.

- [ ] **Step 3: Create server/src/lib/email.ts**

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@friskr.app',
    to,
    subject: `Friskr innlogging: ${code}`,
    text: `Din innloggingskode er: ${code}\n\nKoden gjelder i 10 minutter.`,
    html: `<p>Din innloggingskode er: <strong>${code}</strong></p><p>Koden gjelder i 10 minutter.</p>`,
  });
}
```

- [ ] **Step 4: Create server/src/lib/otp.ts**

```typescript
import { randomInt, randomBytes } from 'node:crypto';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, otpCodes, refreshTokens } from '../db/schema.js';

export async function createOrFindUser(email: string) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(users).values({ email }).returning();
  return created;
}

export async function issueOtp(userId: string): Promise<string> {
  // Invalidate any existing unused codes for this user
  await db
    .update(otpCodes)
    .set({ used: true })
    .where(and(eq(otpCodes.userId, userId), eq(otpCodes.used, false)));

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.insert(otpCodes).values({ userId, code, expiresAt });
  return code;
}

export async function verifyOtp(email: string, code: string): Promise<string | null> {
  const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!userRows[0]) return null;
  const userId = userRows[0].id;

  const now = new Date();
  const rows = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.userId, userId),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, now)
      )
    )
    .limit(1);

  if (!rows[0]) return null;

  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, rows[0].id));
  return userId;
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await db.insert(refreshTokens).values({ userId, token, expiresAt });
  return token;
}

export async function rotateRefreshToken(
  token: string
): Promise<{ userId: string; newToken: string } | null> {
  const now = new Date();
  const rows = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, token),
        eq(refreshTokens.revoked, false),
        gt(refreshTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!rows[0]) return null;

  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, rows[0].id));

  const newToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({ userId: rows[0].userId, token: newToken, expiresAt });

  return { userId: rows[0].userId, newToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.token, token));
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test src/test/otp.test.ts
```

Expected: PASS — all 6 OTP tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/
git commit -m "feat(server): add OTP generation/verification and email sender"
```

---

## Task 6: Auth routes

**Files:**
- Create: `server/src/routes/auth.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/auth-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import type { FastifyInstance } from 'fastify';

vi.mock('../lib/email.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendOtpEmail } from '../lib/email.js';

let app: FastifyInstance;

beforeAll(async () => { app = await createTestApp(); });
beforeEach(cleanDb);
afterAll(async () => { await app.close(); });

describe('POST /auth/otp/request', () => {
  it('returns 200 and sends email', async () => {
    const res = await app.inject({
      method: 'POST', url: '/auth/otp/request',
      payload: { email: 'user@example.com' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(sendOtpEmail).toHaveBeenCalledWith('user@example.com', expect.stringMatching(/^\d{6}$/));
  });

  it('returns 400 if email missing', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/otp/request', payload: {} });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('INVALID_INPUT');
  });
});

describe('POST /auth/otp/verify', () => {
  it('returns JWT and refresh token on valid code', async () => {
    // Request OTP first
    await app.inject({
      method: 'POST', url: '/auth/otp/request',
      payload: { email: 'user@example.com' },
    });
    // Grab the code from the mock call
    const code = (sendOtpEmail as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];

    const res = await app.inject({
      method: 'POST', url: '/auth/otp/verify',
      payload: { email: 'user@example.com', code },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ jwt: expect.any(String), refreshToken: expect.any(String) });
  });

  it('returns 401 on wrong code', async () => {
    await app.inject({
      method: 'POST', url: '/auth/otp/request',
      payload: { email: 'user@example.com' },
    });
    const res = await app.inject({
      method: 'POST', url: '/auth/otp/verify',
      payload: { email: 'user@example.com', code: '000000' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('returns a new JWT for a valid refresh token', async () => {
    await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { email: 'u@e.com' } });
    const code = (sendOtpEmail as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
    const verifyRes = await app.inject({
      method: 'POST', url: '/auth/otp/verify', payload: { email: 'u@e.com', code },
    });
    const { refreshToken } = verifyRes.json();

    const res = await app.inject({
      method: 'POST', url: '/auth/refresh', payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().jwt).toBeDefined();
  });
});

describe('POST /auth/signout', () => {
  it('revokes the refresh token', async () => {
    await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { email: 'u@e.com' } });
    const code = (sendOtpEmail as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
    const verifyRes = await app.inject({
      method: 'POST', url: '/auth/otp/verify', payload: { email: 'u@e.com', code },
    });
    const { jwt, refreshToken } = verifyRes.json();

    const signoutRes = await app.inject({
      method: 'POST', url: '/auth/signout',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(signoutRes.statusCode).toBe(200);

    // Refresh token no longer works
    const refreshRes = await app.inject({
      method: 'POST', url: '/auth/refresh', payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test src/test/auth-routes.test.ts
```

Expected: FAIL — routes not registered.

- [ ] **Step 3: Create server/src/routes/auth.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { householdMembers } from '../db/schema.js';
import { sendOtpEmail } from '../lib/email.js';
import {
  createOrFindUser, issueOtp, verifyOtp,
  issueRefreshToken, rotateRefreshToken, revokeRefreshToken,
} from '../lib/otp.js';

async function getHouseholdId(userId: string): Promise<string | null> {
  const rows = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);
  return rows[0]?.householdId ?? null;
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/otp/request', async (req, reply) => {
    const { email } = req.body as { email?: string };
    if (!email || !email.includes('@')) {
      return reply.code(400).send({ error: 'Valid email required', code: 'INVALID_INPUT' });
    }
    const user = await createOrFindUser(email.toLowerCase().trim());
    const code = await issueOtp(user.id);
    await sendOtpEmail(email, code);
    return { ok: true };
  });

  app.post('/auth/otp/verify', async (req, reply) => {
    const { email, code } = req.body as { email?: string; code?: string };
    if (!email || !code) {
      return reply.code(400).send({ error: 'email and code required', code: 'INVALID_INPUT' });
    }
    const userId = await verifyOtp(email.toLowerCase().trim(), code.trim());
    if (!userId) {
      return reply.code(401).send({ error: 'Invalid or expired code', code: 'UNAUTHORIZED' });
    }
    const householdId = await getHouseholdId(userId);
    const jwt = app.jwt.sign({ sub: userId, householdId });
    const refreshToken = await issueRefreshToken(userId);
    return { jwt, refreshToken };
  });

  app.post('/auth/refresh', async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      return reply.code(400).send({ error: 'refreshToken required', code: 'INVALID_INPUT' });
    }
    const result = await rotateRefreshToken(refreshToken);
    if (!result) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token', code: 'UNAUTHORIZED' });
    }
    const householdId = await getHouseholdId(result.userId);
    const jwt = app.jwt.sign({ sub: result.userId, householdId });
    return { jwt, refreshToken: result.newToken };
  });

  app.post('/auth/signout', { preHandler: app.requireAuth }, async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) await revokeRefreshToken(refreshToken);
    return { ok: true };
  });
}
```

- [ ] **Step 4: Register auth routes in server/src/index.ts**

```typescript
import 'dotenv/config';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { corsPlugin } from './plugins/cors.js';
import { jwtAuthPlugin } from './plugins/jwt.js';
import { authRoutes } from './routes/auth.js';

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);

  await app.register(corsPlugin);
  await app.register(jwtAuthPlugin);
  await app.register(authRoutes);

  app.get('/health', async () => ({ ok: true }));

  return app;
}

const isMain = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMain) {
  const app = await buildApp({ logger: { level: 'info' } });
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
  console.log(`Server running on port ${process.env.PORT ?? 3001}`);
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test
```

Expected: PASS — all auth route tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/auth.ts server/src/index.ts
git commit -m "feat(server): add auth routes (OTP request/verify, refresh, signout)"
```

---

## Task 7: Stock routes

**Files:**
- Create: `server/src/routes/stock.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/stock-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users, households, householdMembers, products, locations, stockItems } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwt: string;
let householdId: string;
let productId: string;

beforeAll(async () => {
  app = await createTestApp();

  // Seed: user + household + product + location
  const [user] = await db.insert(users).values({ email: 'test@example.com' }).returning();
  const [hh] = await db.insert(households).values({ name: 'Test', inviteCode: 'FRISK-TEST' }).returning();
  householdId = hh.id;
  await db.insert(householdMembers).values({
    householdId: hh.id, userId: user.id, role: 'owner', displayName: 'Tester',
  });
  const [prod] = await db
    .insert(products)
    .values({ name: 'Melk', brand: 'Tine', categoryId: 'meieri', householdId: hh.id })
    .returning();
  productId = prod.id;

  // Default location must exist (shared, householdId null)
  await db
    .insert(locations)
    .values({ id: 'kjoleskap', label: 'Kjøleskap', icon: 'locFridge', hue: 198 })
    .onConflictDoNothing();

  jwt = app.jwt.sign({ sub: user.id, householdId: hh.id });
});

beforeEach(async () => {
  await db.delete(stockItems);
});

afterAll(async () => {
  await cleanDb();
  await app.close();
});

describe('GET /api/stock', () => {
  it('returns empty list when no items', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/stock',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});

describe('POST /api/stock', () => {
  it('creates a stock item and returns it', async () => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const res = await app.inject({
      method: 'POST', url: '/api/stock',
      headers: { authorization: `Bearer ${jwt}` },
      payload: {
        productId, locationId: 'kjoleskap',
        quantity: 2, expiryDate: tomorrow.toISOString().slice(0, 10),
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.pid).toBe(productId);
    expect(body.qty).toBe(2);
    expect(body.status).toBe('in_stock');
  });
});

describe('PATCH /api/stock/:id/consume', () => {
  it('marks item as used_up', async () => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const createRes = await app.inject({
      method: 'POST', url: '/api/stock',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { productId, locationId: 'kjoleskap', quantity: 1, expiryDate: tomorrow.toISOString().slice(0, 10) },
    });
    const itemId = createRes.json().id;

    const res = await app.inject({
      method: 'PATCH', url: `/api/stock/${itemId}/consume`,
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);

    // Item should no longer appear in GET /api/stock
    const listRes = await app.inject({
      method: 'GET', url: '/api/stock',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(listRes.json()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test src/test/stock-routes.test.ts
```

Expected: FAIL — routes not registered.

- [ ] **Step 3: Create server/src/routes/stock.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { stockItems, products, householdMembers } from '../db/schema.js';

function mapRow(r: Record<string, unknown>) {
  const expiryDate = r.expiry_date ? new Date(r.expiry_date as string) : null;
  const bestForDate = r.best_for_date ? new Date(r.best_for_date as string) : null;
  const now = Date.now();
  const msPerDay = 86400000;
  const off = expiryDate ? Math.round((expiryDate.getTime() - now) / msPerDay) : null;
  const bestForOff = bestForDate ? Math.round((bestForDate.getTime() - now) / msPerDay) : null;
  return {
    id: r.id,
    pid: r.product_id,
    loc: r.location_id,
    qty: Number(r.quantity),
    off,
    expiryDate,
    frozen: r.frozen,
    bestForOff,
    bestForDate,
    note: r.note ?? null,
    price: r.price_nok != null ? Number(r.price_nok) : null,
    addedBy: r.added_by_name ?? null,
    status: r.status,
    product: {
      id: r.product_id,
      name: r.product_name,
      brand: r.product_brand ?? '',
      cat: r.category_id,
      shelf: null,
    },
  };
}

export async function stockRoutes(app: FastifyInstance) {
  app.get('/stock', { preHandler: app.requireAuth }, async (req) => {
    const { householdId } = req.user;
    if (!householdId) return [];

    const rows = await db.execute(sql`
      select si.*,
             p.name  as product_name,
             p.brand as product_brand,
             p.category_id,
             hm.display_name as added_by_name
      from stock_items si
      join products p on p.id = si.product_id
      left join household_members hm
        on hm.user_id = si.added_by
       and hm.household_id = si.household_id
      where si.household_id = ${householdId}
        and si.status = 'in_stock'
      order by si.expiry_date asc nulls last
    `);
    return rows.map(mapRow);
  });

  app.post('/stock', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId, userId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });
    const { productId, locationId, quantity, expiryDate, frozen, bestForDate, note, priceNok } =
      req.body as Record<string, unknown>;

    if (!productId || !locationId || quantity == null) {
      return reply.code(400).send({ error: 'productId, locationId, quantity required', code: 'INVALID_INPUT' });
    }

    const [item] = await db
      .insert(stockItems)
      .values({
        householdId,
        productId: productId as string,
        locationId: locationId as string,
        quantity: String(quantity),
        expiryDate: expiryDate as string ?? null,
        frozen: (frozen as boolean) ?? false,
        bestForDate: bestForDate as string ?? null,
        note: note as string ?? null,
        priceNok: priceNok != null ? String(priceNok) : null,
        addedBy: userId,
      })
      .returning();

    const rows = await db.execute(sql`
      select si.*,
             p.name  as product_name,
             p.brand as product_brand,
             p.category_id,
             hm.display_name as added_by_name
      from stock_items si
      join products p on p.id = si.product_id
      left join household_members hm
        on hm.user_id = si.added_by
       and hm.household_id = si.household_id
      where si.id = ${item.id}
    `);
    return reply.code(201).send(mapRow(rows[0] as Record<string, unknown>));
  });

  app.put('/stock/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    const { id } = req.params as { id: string };
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const existing = await db.select().from(stockItems)
      .where(and(eq(stockItems.id, id), eq(stockItems.householdId, householdId)))
      .limit(1);
    if (!existing[0]) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });

    const { locationId, quantity, expiryDate, frozen, bestForDate, note, priceNok } =
      req.body as Record<string, unknown>;

    await db.update(stockItems).set({
      ...(locationId != null && { locationId: locationId as string }),
      ...(quantity != null && { quantity: String(quantity) }),
      ...(expiryDate !== undefined && { expiryDate: expiryDate as string }),
      ...(frozen != null && { frozen: frozen as boolean }),
      ...(bestForDate !== undefined && { bestForDate: bestForDate as string }),
      ...(note !== undefined && { note: note as string }),
      ...(priceNok !== undefined && { priceNok: priceNok != null ? String(priceNok) : null }),
    }).where(eq(stockItems.id, id));

    const rows = await db.execute(sql`
      select si.*,
             p.name  as product_name,
             p.brand as product_brand,
             p.category_id,
             hm.display_name as added_by_name
      from stock_items si
      join products p on p.id = si.product_id
      left join household_members hm
        on hm.user_id = si.added_by
       and hm.household_id = si.household_id
      where si.id = ${id}
    `);
    return mapRow(rows[0] as Record<string, unknown>);
  });

  async function setStatus(
    app: FastifyInstance,
    method: 'PATCH',
    path: string,
    status: 'used_up' | 'discarded' | 'in_stock'
  ) {
    app.route({
      method,
      url: path,
      preHandler: app.requireAuth,
      handler: async (req, reply) => {
        const { householdId } = req.user;
        const { id } = req.params as { id: string };
        const existing = await db.select().from(stockItems)
          .where(and(eq(stockItems.id, id), eq(stockItems.householdId, householdId!)))
          .limit(1);
        if (!existing[0]) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });
        await db.update(stockItems).set({
          status,
          resolvedAt: status === 'in_stock' ? null : new Date(),
        }).where(eq(stockItems.id, id));
        return { ok: true };
      },
    });
  }

  setStatus(app, 'PATCH', '/stock/:id/consume', 'used_up');
  setStatus(app, 'PATCH', '/stock/:id/discard', 'discarded');
  setStatus(app, 'PATCH', '/stock/:id/restore', 'in_stock');

  app.get('/stock/stats', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    const { since } = req.query as { since?: string };
    if (!householdId) return { saved: 0, savedKr: 0, wasted: 0 };
    if (!since) return reply.code(400).send({ error: 'since query param required', code: 'INVALID_INPUT' });

    const rows = await db
      .select({ status: stockItems.status, quantity: stockItems.quantity, priceNok: stockItems.priceNok })
      .from(stockItems)
      .where(and(
        eq(stockItems.householdId, householdId),
        gte(stockItems.resolvedAt, new Date(since))
      ));

    let saved = 0, savedKr = 0, wasted = 0;
    for (const r of rows) {
      if (r.status === 'used_up') {
        saved++;
        if (r.priceNok) savedKr += Number(r.priceNok) * Number(r.quantity);
      } else if (r.status === 'discarded') wasted++;
    }
    return { saved, savedKr, wasted };
  });
}
```

- [ ] **Step 4: Register stock routes in server/src/index.ts**

```typescript
import 'dotenv/config';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { corsPlugin } from './plugins/cors.js';
import { jwtAuthPlugin } from './plugins/jwt.js';
import { authRoutes } from './routes/auth.js';
import { stockRoutes } from './routes/stock.js';

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);

  await app.register(corsPlugin);
  await app.register(jwtAuthPlugin);
  await app.register(authRoutes);
  await app.register(stockRoutes, { prefix: '/api' });

  app.get('/health', async () => ({ ok: true }));

  return app;
}

const isMain = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMain) {
  const app = await buildApp({ logger: { level: 'info' } });
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
  console.log(`Server running on port ${process.env.PORT ?? 3001}`);
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test
```

Expected: PASS — all stock route tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/stock.ts server/src/index.ts
git commit -m "feat(server): add stock routes (list, create, update, consume, discard, restore, stats)"
```

---

## Task 8: Products routes

**Files:**
- Create: `server/src/routes/products.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/products-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users, households, householdMembers, categories } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwt: string;

beforeAll(async () => {
  app = await createTestApp();
  const [user] = await db.insert(users).values({ email: 'prod@example.com' }).returning();
  const [hh] = await db.insert(households).values({ name: 'Test', inviteCode: 'FRISK-PR01' }).returning();
  await db.insert(householdMembers).values({ householdId: hh.id, userId: user.id, role: 'owner' });
  // Seed a category
  await db.insert(categories).values({ id: 'meieri', label: 'Meieri', icon: 'catDairy', hue: 198 }).onConflictDoNothing();
  jwt = app.jwt.sign({ sub: user.id, householdId: hh.id });
});

afterAll(async () => { await cleanDb(); await app.close(); });

describe('GET /api/products', () => {
  it('returns empty list when no products', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/products',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});

describe('POST /api/products', () => {
  it('creates a household product', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/products',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { name: 'Egne Egg', brand: 'Gård', cat: 'meieri', shelf: 14 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Egne Egg');
    expect(body.cat).toBe('meieri');
  });

  it('returns 400 if name missing', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/products',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { cat: 'meieri' },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test src/test/products-routes.test.ts
```

Expected: FAIL — route not registered.

- [ ] **Step 3: Create server/src/routes/products.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { or, isNull, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { products } from '../db/schema.js';

function mapProduct(r: typeof products.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand ?? '',
    cat: r.categoryId,
    shelf: r.defaultShelfDays ?? null,
    barcode: r.barcode ?? null,
    householdId: r.householdId ?? null,
  };
}

export async function productsRoutes(app: FastifyInstance) {
  app.get('/products', { preHandler: app.requireAuth }, async (req) => {
    const { householdId } = req.user;
    const rows = await db
      .select()
      .from(products)
      .where(
        householdId
          ? or(isNull(products.householdId), eq(products.householdId, householdId))
          : isNull(products.householdId)
      )
      .orderBy(products.name);
    return rows.map(mapProduct);
  });

  app.post('/products', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const { name, brand, cat, shelf, barcode } = req.body as Record<string, unknown>;
    if (!name || !cat) {
      return reply.code(400).send({ error: 'name and cat required', code: 'INVALID_INPUT' });
    }

    const [row] = await db
      .insert(products)
      .values({
        householdId,
        name: name as string,
        brand: (brand as string) ?? '',
        categoryId: cat as string,
        defaultShelfDays: shelf != null ? Number(shelf) : null,
        barcode: barcode as string ?? null,
      })
      .returning();
    return reply.code(201).send(mapProduct(row));
  });
}
```

- [ ] **Step 4: Register in server/src/index.ts** — add to imports and register:

```typescript
import { productsRoutes } from './routes/products.js';
// inside buildApp, after stockRoutes:
await app.register(productsRoutes, { prefix: '/api' });
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test
```

Expected: PASS — all product route tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/products.ts server/src/index.ts
git commit -m "feat(server): add products routes (list, create)"
```

---

## Task 9: Locations routes

**Files:**
- Create: `server/src/routes/locations.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/locations-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users, households, householdMembers, locations } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwt: string;
let householdId: string;

beforeAll(async () => {
  app = await createTestApp();
  const [user] = await db.insert(users).values({ email: 'loc@example.com' }).returning();
  const [hh] = await db.insert(households).values({ name: 'Test', inviteCode: 'FRISK-LC01' }).returning();
  householdId = hh.id;
  await db.insert(householdMembers).values({ householdId: hh.id, userId: user.id, role: 'owner' });
  await db.insert(locations).values({ id: 'kjoleskap', label: 'Kjøleskap', icon: 'locFridge', hue: 198 }).onConflictDoNothing();
  jwt = app.jwt.sign({ sub: user.id, householdId: hh.id });
});

afterAll(async () => { await cleanDb(); await app.close(); });

describe('GET /api/locations', () => {
  it('includes default locations', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/locations',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    const ids = res.json().map((l: { id: string }) => l.id);
    expect(ids).toContain('kjoleskap');
  });
});

describe('POST /api/locations', () => {
  it('creates a custom location', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/locations',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { id: 'bod-kjoleskap', label: 'Bod-kjøleskap', icon: 'locFridge', freezer: false },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe('bod-kjoleskap');
  });
});

describe('DELETE /api/locations/:id', () => {
  it('deletes a custom location with no items', async () => {
    await db.insert(locations).values({
      id: `custom-${householdId.slice(0,8)}`, label: 'Test', icon: 'locPantry', householdId,
    }).onConflictDoNothing();

    const res = await app.inject({
      method: 'DELETE', url: `/api/locations/custom-${householdId.slice(0,8)}`,
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test src/test/locations-routes.test.ts
```

Expected: FAIL — route not registered.

- [ ] **Step 3: Create server/src/routes/locations.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { and, eq, isNull, or, count } from 'drizzle-orm';
import { db } from '../db/client.js';
import { locations, stockItems } from '../db/schema.js';

function mapLocation(r: typeof locations.$inferSelect) {
  return {
    id: r.id, label: r.label, icon: r.icon,
    hue: r.hue, freezer: r.freezer, householdId: r.householdId ?? null,
  };
}

export async function locationsRoutes(app: FastifyInstance) {
  app.get('/locations', { preHandler: app.requireAuth }, async (req) => {
    const { householdId } = req.user;
    const rows = await db
      .select()
      .from(locations)
      .where(
        householdId
          ? or(isNull(locations.householdId), eq(locations.householdId, householdId))
          : isNull(locations.householdId)
      )
      .orderBy(locations.sort);
    return rows.map(mapLocation);
  });

  app.post('/locations', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });
    const { id, label, icon, freezer, hue } = req.body as Record<string, unknown>;
    if (!id || !label || !icon) {
      return reply.code(400).send({ error: 'id, label, icon required', code: 'INVALID_INPUT' });
    }
    const [row] = await db
      .insert(locations)
      .values({
        id: id as string, label: label as string, icon: icon as string,
        freezer: (freezer as boolean) ?? false,
        hue: hue != null ? Number(hue) : (freezer ? 205 : 150),
        householdId,
      })
      .returning();
    return reply.code(201).send(mapLocation(row));
  });

  app.patch('/locations/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    const { id } = req.params as { id: string };
    const existing = await db.select().from(locations)
      .where(and(eq(locations.id, id), eq(locations.householdId, householdId!)))
      .limit(1);
    if (!existing[0]) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });

    const { label, icon, freezer, hue } = req.body as Record<string, unknown>;
    await db.update(locations).set({
      ...(label != null && { label: label as string }),
      ...(icon != null && { icon: icon as string }),
      ...(freezer != null && { freezer: freezer as boolean }),
      ...(hue != null && { hue: Number(hue) }),
    }).where(eq(locations.id, id));
    return { ok: true };
  });

  app.delete('/locations/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    const { id } = req.params as { id: string };
    const existing = await db.select().from(locations)
      .where(and(eq(locations.id, id), eq(locations.householdId, householdId!)))
      .limit(1);
    if (!existing[0]) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });

    const [{ itemCount }] = await db
      .select({ itemCount: count() })
      .from(stockItems)
      .where(and(eq(stockItems.locationId, id), eq(stockItems.status, 'in_stock')));

    if (Number(itemCount) > 0) {
      return reply.code(409).send({ error: 'Flytt varene først', code: 'CONFLICT' });
    }
    await db.delete(locations).where(eq(locations.id, id));
    return { ok: true };
  });
}
```

- [ ] **Step 4: Register in server/src/index.ts**

```typescript
import { locationsRoutes } from './routes/locations.js';
// inside buildApp:
await app.register(locationsRoutes, { prefix: '/api' });
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/locations.ts server/src/index.ts
git commit -m "feat(server): add locations routes (list, create, update, delete)"
```

---

## Task 10: Household routes

**Files:**
- Create: `server/src/routes/household.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/household-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwtNoHousehold: string;
let userId: string;

beforeAll(async () => {
  app = await createTestApp();
  const [user] = await db.insert(users).values({ email: 'hh@example.com' }).returning();
  userId = user.id;
  jwtNoHousehold = app.jwt.sign({ sub: user.id, householdId: null });
});

afterAll(async () => { await cleanDb(); await app.close(); });

describe('POST /api/household', () => {
  it('creates a household and returns a new JWT with householdId', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/household',
      headers: { authorization: `Bearer ${jwtNoHousehold}` },
      payload: { name: 'Familien Test', displayName: 'Tester' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.jwt).toBeDefined();
    expect(body.household.name).toBe('Familien Test');
    expect(body.household.code).toMatch(/^FRISK-/);
    // JWT should now contain householdId
    const payload = app.jwt.decode<{ sub: string; householdId: string }>(body.jwt);
    expect(payload?.householdId).toBeDefined();
  });
});

describe('POST /api/household/join', () => {
  it('joins a household by invite code', async () => {
    // Create a second user
    const [user2] = await db.insert(users).values({ email: 'hh2@example.com' }).returning();
    const jwt2 = app.jwt.sign({ sub: user2.id, householdId: null });

    // Create household as user1
    const createRes = await app.inject({
      method: 'POST', url: '/api/household',
      headers: { authorization: `Bearer ${jwtNoHousehold}` },
      payload: { name: 'Delt Hus', displayName: 'Eier' },
    });
    const code = createRes.json().household.code;

    // Join as user2
    const joinRes = await app.inject({
      method: 'POST', url: '/api/household/join',
      headers: { authorization: `Bearer ${jwt2}` },
      payload: { code, displayName: 'Gjest' },
    });
    expect(joinRes.statusCode).toBe(200);
    const joinPayload = app.jwt.decode<{ householdId: string }>(joinRes.json().jwt);
    expect(joinPayload?.householdId).toBeDefined();
  });
});

describe('GET /api/household', () => {
  it('returns household info and members', async () => {
    const createRes = await app.inject({
      method: 'POST', url: '/api/household',
      headers: { authorization: `Bearer ${jwtNoHousehold}` },
      payload: { name: 'Get-test', displayName: 'Tester' },
    });
    const { jwt: newJwt } = createRes.json();
    const res = await app.inject({
      method: 'GET', url: '/api/household',
      headers: { authorization: `Bearer ${newJwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Get-test');
    expect(res.json().members).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test src/test/household-routes.test.ts
```

Expected: FAIL — route not registered.

- [ ] **Step 3: Create server/src/routes/household.ts**

```typescript
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { households, householdMembers } from '../db/schema.js';

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(4);
  const code = Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join('')
    .slice(0, 4);
  return `FRISK-${code}`;
}

async function getHouseholdWithMembers(householdId: string) {
  const [hh] = await db.select().from(households).where(eq(households.id, householdId)).limit(1);
  if (!hh) return null;
  const members = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(householdMembers.joinedAt);
  return {
    id: hh.id,
    name: hh.name,
    code: hh.inviteCode,
    members: members.map((m) => ({
      userId: m.userId,
      name: m.displayName ?? 'Medlem',
      role: m.role === 'owner' ? 'Eier' : 'Medlem',
      initial: (m.displayName ?? '?').charAt(0).toUpperCase(),
      hue: m.colorHue ?? 145,
    })),
  };
}

export async function householdRoutes(app: FastifyInstance) {
  app.get('/household', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(404).send({ error: 'No household', code: 'NOT_FOUND' });
    const result = await getHouseholdWithMembers(householdId);
    if (!result) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return result;
  });

  app.get('/household/members', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(404).send({ error: 'No household', code: 'NOT_FOUND' });
    const members = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.householdId, householdId))
      .orderBy(householdMembers.joinedAt);
    return members.map((m) => ({
      userId: m.userId,
      name: m.displayName ?? 'Medlem',
      role: m.role === 'owner' ? 'Eier' : 'Medlem',
      initial: (m.displayName ?? '?').charAt(0).toUpperCase(),
      hue: m.colorHue ?? 145,
    }));
  });

  app.post('/household', { preHandler: app.requireAuth }, async (req, reply) => {
    const { userId } = req.user;
    const { name, displayName } = req.body as { name?: string; displayName?: string };
    if (!name) return reply.code(400).send({ error: 'name required', code: 'INVALID_INPUT' });

    const inviteCode = generateInviteCode();
    const [hh] = await db.insert(households).values({ name, inviteCode }).returning();
    await db.insert(householdMembers).values({
      householdId: hh.id, userId, role: 'owner', displayName: displayName ?? null,
    });

    const jwt = app.jwt.sign({ sub: userId, householdId: hh.id });
    const household = await getHouseholdWithMembers(hh.id);
    return reply.code(201).send({ jwt, household });
  });

  app.post('/household/join', { preHandler: app.requireAuth }, async (req, reply) => {
    const { userId } = req.user;
    const { code, displayName } = req.body as { code?: string; displayName?: string };
    if (!code) return reply.code(400).send({ error: 'code required', code: 'INVALID_INPUT' });

    const [hh] = await db.select().from(households).where(eq(households.inviteCode, code)).limit(1);
    if (!hh) return reply.code(404).send({ error: 'Invalid invite code', code: 'NOT_FOUND' });

    const alreadyMember = await db
      .select()
      .from(householdMembers)
      .where(and(eq(householdMembers.householdId, hh.id), eq(householdMembers.userId, userId)))
      .limit(1);
    if (!alreadyMember[0]) {
      await db.insert(householdMembers).values({
        householdId: hh.id, userId, role: 'member', displayName: displayName ?? null,
      });
    }

    const jwt = app.jwt.sign({ sub: userId, householdId: hh.id });
    const household = await getHouseholdWithMembers(hh.id);
    return { jwt, household };
  });
}
```

- [ ] **Step 4: Register in server/src/index.ts**

```typescript
import { householdRoutes } from './routes/household.js';
// inside buildApp:
await app.register(householdRoutes, { prefix: '/api' });
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/household.ts server/src/index.ts
git commit -m "feat(server): add household routes (get, create, join, members)"
```

---

## Task 11: Scan route

**Files:**
- Create: `server/src/routes/scan.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/scan-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users, households, householdMembers, products, categories } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwt: string;
let householdId: string;

beforeAll(async () => {
  app = await createTestApp();
  const [user] = await db.insert(users).values({ email: 'scan@example.com' }).returning();
  const [hh] = await db.insert(households).values({ name: 'Test', inviteCode: 'FRISK-SC01' }).returning();
  householdId = hh.id;
  await db.insert(householdMembers).values({ householdId: hh.id, userId: user.id, role: 'owner' });
  await db.insert(categories).values({ id: 'meieri', label: 'Meieri', icon: 'catDairy', hue: 198 }).onConflictDoNothing();
  // Add a product with a barcode
  await db.insert(products).values({
    name: 'Tine Melk', brand: 'Tine', categoryId: 'meieri', barcode: '7038010009887',
  });
  jwt = app.jwt.sign({ sub: user.id, householdId: hh.id });
});

afterAll(async () => { await cleanDb(); await app.close(); });

describe('GET /api/scan', () => {
  it('returns catalogue hit when barcode found', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/scan?barcode=7038010009887',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBe('catalogue');
    expect(res.json().product.name).toBe('Tine Melk');
  });

  it('returns none for unknown barcode (mocking fetch)', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false }));
    const res = await app.inject({
      method: 'GET', url: '/api/scan?barcode=0000000000000',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBe('none');
    vi.unstubAllGlobals();
  });

  it('returns 400 if barcode missing', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/scan',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test src/test/scan-routes.test.ts
```

Expected: FAIL — route not registered.

- [ ] **Step 3: Create server/src/routes/scan.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { or, isNull, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { products } from '../db/schema.js';

const OFF_API = 'https://world.openfoodfacts.org/api/v2/product';

const CAT_MAP: Record<string, string> = {
  'en:dairies': 'meieri', 'en:meats': 'kjott', 'en:fish': 'fisk',
  'en:fruits-and-vegetables': 'frukt', 'en:breads': 'brod',
  'en:beverages': 'drikke', 'en:snacks': 'snacks',
};

function offCategory(tags: string[]): string {
  for (const t of tags) { if (CAT_MAP[t]) return CAT_MAP[t]; }
  return 'annet';
}

export async function scanRoutes(app: FastifyInstance) {
  app.get('/scan', { preHandler: app.requireAuth }, async (req, reply) => {
    const { barcode } = req.query as { barcode?: string };
    const { householdId } = req.user;
    if (!barcode) return reply.code(400).send({ error: 'barcode required', code: 'INVALID_INPUT' });

    // 1. Check catalogue (global + household)
    const catRows = await db
      .select()
      .from(products)
      .where(
        householdId
          ? or(isNull(products.householdId), eq(products.householdId, householdId))
          : isNull(products.householdId)
      );
    const found = catRows.find((p) => p.barcode === barcode);
    if (found) {
      return {
        source: 'catalogue',
        product: {
          id: found.id, name: found.name, brand: found.brand ?? '',
          cat: found.categoryId, shelf: found.defaultShelfDays ?? null,
          barcode: found.barcode, householdId: found.householdId ?? null,
        },
      };
    }

    // 2. OpenFoodFacts fallback
    try {
      const res = await fetch(`${OFF_API}/${barcode}?fields=product_name,brands,categories_tags,quantity`);
      if (res.ok) {
        const data = await res.json() as { status: number; product?: Record<string, unknown> };
        if (data.status === 1 && data.product) {
          const p = data.product;
          const cat = offCategory((p.categories_tags as string[]) ?? []);
          return {
            source: 'openfoodfacts',
            draft: {
              name: (p.product_name as string) ?? '',
              brand: (p.brands as string) ?? '',
              cat,
              shelf: null,
              barcode,
            },
          };
        }
      }
    } catch {
      // network error → fall through to 'none'
    }

    return { source: 'none', barcode };
  });
}
```

- [ ] **Step 4: Register in server/src/index.ts**

```typescript
import { scanRoutes } from './routes/scan.js';
// inside buildApp:
await app.register(scanRoutes, { prefix: '/api' });
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/scan.ts server/src/index.ts
git commit -m "feat(server): add scan route with catalogue + OpenFoodFacts fallback"
```

---

## Task 12: SSE realtime

**Files:**
- Create: `server/src/plugins/notify.ts`
- Create: `server/src/routes/realtime.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/realtime.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users, households, householdMembers } from '../db/schema.js';
import { broadcastChange } from '../plugins/notify.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwt: string;
let householdId: string;

beforeAll(async () => {
  app = await createTestApp();
  const [user] = await db.insert(users).values({ email: 'sse@example.com' }).returning();
  const [hh] = await db.insert(households).values({ name: 'SSE Test', inviteCode: 'FRISK-SS01' }).returning();
  householdId = hh.id;
  await db.insert(householdMembers).values({ householdId: hh.id, userId: user.id, role: 'owner' });
  jwt = app.jwt.sign({ sub: user.id, householdId: hh.id });
});

afterAll(async () => { await cleanDb(); await app.close(); });

describe('GET /api/realtime/household', () => {
  it('returns 401 with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/realtime/household' });
    expect(res.statusCode).toBe(401);
  });

  it('establishes SSE connection with valid token', async () => {
    // Inject returns immediately for SSE (Fastify closes it after response)
    // We just verify headers are correct and status is 200
    const chunks: string[] = [];
    const res = await app.inject({
      method: 'GET',
      url: `/api/realtime/household?token=${jwt}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test src/test/realtime.test.ts
```

Expected: FAIL — route/plugin not found.

- [ ] **Step 3: Create server/src/plugins/notify.ts**

```typescript
import fp from 'fastify-plugin';
import postgres from 'postgres';
import type { FastifyInstance } from 'fastify';
import type { ServerResponse } from 'node:http';

// householdId → set of active SSE raw responses
const connections = new Map<string, Set<ServerResponse>>();

export function addSSEClient(householdId: string, raw: ServerResponse) {
  if (!connections.has(householdId)) connections.set(householdId, new Set());
  connections.get(householdId)!.add(raw);
}

export function removeSSEClient(householdId: string, raw: ServerResponse) {
  connections.get(householdId)?.delete(raw);
}

export function broadcastChange(householdId: string) {
  const clients = connections.get(householdId);
  if (!clients) return;
  for (const raw of clients) {
    raw.write('data: changed\n\n');
  }
}

export const notifyPlugin = fp(async (app: FastifyInstance) => {
  // Skip LISTEN in test if no DATABASE_URL (should always be set, but guard anyway)
  if (!process.env.DATABASE_URL) return;

  let listenSql: ReturnType<typeof postgres> | null = null;
  try {
    listenSql = postgres(process.env.DATABASE_URL, { max: 1 });
    await listenSql.listen('friskr_changes', broadcastChange);
  } catch (err) {
    app.log.warn({ err }, 'pg LISTEN failed — realtime push disabled');
  }

  app.addHook('onClose', async () => {
    await listenSql?.end();
  });
});
```

- [ ] **Step 4: Create server/src/routes/realtime.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import type { JWTPayload } from '../plugins/jwt.js';
import { addSSEClient, removeSSEClient } from '../plugins/notify.js';

export async function realtimeRoutes(app: FastifyInstance) {
  app.get('/realtime/household', async (req, reply) => {
    // Token via query param (EventSource can't send headers)
    const { token } = req.query as { token?: string };
    if (!token) {
      return reply.code(401).send({ error: 'token required', code: 'UNAUTHORIZED' });
    }

    let payload: JWTPayload;
    try {
      payload = app.jwt.verify<JWTPayload>(token);
    } catch {
      return reply.code(401).send({ error: 'Invalid token', code: 'UNAUTHORIZED' });
    }

    const householdId = payload.householdId;
    if (!householdId) {
      return reply.code(403).send({ error: 'No household', code: 'FORBIDDEN' });
    }

    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    raw.write(':\n\n'); // initial comment establishes connection

    addSSEClient(householdId, raw);

    const keepalive = setInterval(() => raw.write(':\n\n'), 30_000);

    req.raw.on('close', () => {
      clearInterval(keepalive);
      removeSSEClient(householdId, raw);
    });

    // Keep connection open until client disconnects
    await new Promise<void>((resolve) => req.raw.on('close', resolve));
  });
}
```

- [ ] **Step 5: Register in server/src/index.ts** (final version)

```typescript
import 'dotenv/config';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { corsPlugin } from './plugins/cors.js';
import { jwtAuthPlugin } from './plugins/jwt.js';
import { notifyPlugin } from './plugins/notify.js';
import { authRoutes } from './routes/auth.js';
import { stockRoutes } from './routes/stock.js';
import { productsRoutes } from './routes/products.js';
import { locationsRoutes } from './routes/locations.js';
import { householdRoutes } from './routes/household.js';
import { scanRoutes } from './routes/scan.js';
import { realtimeRoutes } from './routes/realtime.js';

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);

  await app.register(corsPlugin);
  await app.register(jwtAuthPlugin);
  await app.register(notifyPlugin);
  await app.register(authRoutes);
  await app.register(stockRoutes, { prefix: '/api' });
  await app.register(productsRoutes, { prefix: '/api' });
  await app.register(locationsRoutes, { prefix: '/api' });
  await app.register(householdRoutes, { prefix: '/api' });
  await app.register(scanRoutes, { prefix: '/api' });
  await app.register(realtimeRoutes, { prefix: '/api' });

  app.get('/health', async () => ({ ok: true }));

  return app;
}

const isMain = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMain) {
  const app = await buildApp({ logger: { level: 'info' } });
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
  console.log(`Server running on port ${process.env.PORT ?? 3001}`);
}
```

- [ ] **Step 6: Run all tests — expect pass**

```bash
npm test
```

Expected: PASS — full test suite green.

- [ ] **Step 7: Commit**

```bash
git add server/src/plugins/notify.ts server/src/routes/realtime.ts server/src/index.ts
git commit -m "feat(server): add SSE realtime with pg LISTEN/NOTIFY fan-out"
```

---

## Task 13: Frontend — api.ts + Vite proxy

**Files:**
- Create: `src/lib/api.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Update vite.config.ts to proxy API calls in dev**

Read current `vite.config.ts` and add a `server.proxy` block:

```typescript
// vite.config.ts — add inside defineConfig:
server: {
  proxy: {
    '/api': 'http://localhost:3001',
    '/auth': 'http://localhost:3001',
  },
},
```

- [ ] **Step 2: Create src/lib/api.ts**

```typescript
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function getJwt(): string | null { return localStorage.getItem('friskr_jwt'); }
function getRefresh(): string | null { return localStorage.getItem('friskr_refresh'); }
function setTokens(jwt: string, refreshToken: string) {
  localStorage.setItem('friskr_jwt', jwt);
  localStorage.setItem('friskr_refresh', refreshToken);
}
export function clearTokens() {
  localStorage.removeItem('friskr_jwt');
  localStorage.removeItem('friskr_refresh');
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefresh();
  if (!refreshToken) return false;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) { clearTokens(); return false; }
  const data = await res.json();
  setTokens(data.jwt, data.refreshToken);
  return true;
}

async function request(method: string, path: string, body?: unknown, retry = true): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const jwt = getJwt();
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(method, path, body, false);
  }
  return res;
}

async function throwIfError(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText, code: 'INTERNAL' }));
    throw Object.assign(new Error(body.error ?? res.statusText), { code: body.code });
  }
  return res;
}

export const api = {
  get: async <T>(path: string): Promise<T> =>
    throwIfError(await request('GET', path)).then((r) => r.json()),

  post: async <T>(path: string, body?: unknown): Promise<T> =>
    throwIfError(await request('POST', path, body)).then((r) => r.json()),

  put: async <T>(path: string, body?: unknown): Promise<T> =>
    throwIfError(await request('PUT', path, body)).then((r) => r.json()),

  patch: async <T>(path: string, body?: unknown): Promise<T> =>
    throwIfError(await request('PATCH', path, body)).then((r) => r.json()),

  delete: async <T>(path: string): Promise<T> =>
    throwIfError(await request('DELETE', path)).then((r) => r.json()),
};

export { setTokens };
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts vite.config.ts
git commit -m "feat(frontend): add api.ts fetch wrapper and Vite proxy"
```

---

## Task 14: Frontend — rewrite auth.ts

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Rewrite src/lib/auth.ts**

Replace entire file contents:

```typescript
import { api, setTokens, clearTokens } from './api.js';

export async function signInWithEmail(email: string): Promise<void> {
  await api.post('/auth/otp/request', { email });
}

export async function verifyOtp(email: string, token: string): Promise<void> {
  const data = await api.post<{ jwt: string; refreshToken: string }>(
    '/auth/otp/verify',
    { email, code: token }
  );
  setTokens(data.jwt, data.refreshToken);
}

export async function signOut(): Promise<void> {
  const refreshToken = localStorage.getItem('friskr_refresh');
  await api.post('/auth/signout', { refreshToken }).catch(() => {});
  clearTokens();
}

export function onAuthChange(cb: (signedIn: boolean) => void): () => void {
  // Poll localStorage on storage events (cross-tab) + initial check
  const check = () => cb(!!localStorage.getItem('friskr_jwt'));
  check();
  window.addEventListener('storage', check);
  return () => window.removeEventListener('storage', check);
}

export async function currentUser(): Promise<{ id: string } | null> {
  const jwt = localStorage.getItem('friskr_jwt');
  if (!jwt) return null;
  // Decode without verification (verification is server-side)
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    return { id: payload.sub };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(frontend): rewrite auth.ts to use API endpoints"
```

---

## Task 15: Frontend — rewrite realtime.ts + friskr.ts

**Files:**
- Modify: `src/lib/realtime.ts`
- Modify: `src/lib/friskr.ts`
- Delete: `src/lib/supabase.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Rewrite src/lib/realtime.ts**

Replace entire file contents:

```typescript
const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export function subscribeHousehold(_householdId: string, onChange: () => void): () => void {
  const token = localStorage.getItem('friskr_jwt');
  if (!token) return () => {};

  const es = new EventSource(`${BASE}/api/realtime/household?token=${encodeURIComponent(token)}`);
  es.onmessage = () => onChange();
  es.onerror = () => {
    // EventSource auto-reconnects; nothing to do here
  };
  return () => es.close();
}
```

- [ ] **Step 2: Rewrite src/lib/friskr.ts — replace all supabase calls**

The shapes returned by each function are unchanged. Only the transport changes.

```typescript
import { api } from './api.js';
import { CATEGORIES, freezerDaysFor, THAW_DAYS } from './reference.js';
import { parseDate, daysUntil, isoDateInDays } from './dates.js';
import type { CategoryId, LocationId } from './database.types.js';

export interface Product {
  id: string; name: string; brand: string; cat: CategoryId;
  shelf: number | null; barcode?: string | null; householdId?: string | null;
}

export interface StockItem {
  id: string; pid: string; loc: LocationId; qty: number;
  off: number | null; expiryDate: Date | null;
  frozen: boolean; bestForOff: number | null; bestForDate: Date | null;
  note: string | null; price: number | null; addedBy: string | null;
  status: 'in_stock' | 'used_up' | 'discarded'; product: Product;
}

export interface Member {
  name: string; role: string; initial: string; hue: number; userId: string;
}
export interface Household { id: string; name: string; code: string; members: Member[] }

function mapStockRow(r: Record<string, unknown>): StockItem {
  const expiryDate = parseDate(r.expiryDate as string | null);
  const bestForDate = parseDate(r.bestForDate as string | null);
  return {
    id: r.id as string, pid: r.pid as string, loc: r.loc as LocationId,
    qty: Number(r.qty), off: r.off as number | null, expiryDate,
    frozen: !!r.frozen,
    bestForOff: daysUntil(bestForDate),
    bestForDate,
    note: (r.note as string) ?? null, price: r.price as number | null,
    addedBy: (r.addedBy as string) ?? null, status: r.status as StockItem['status'],
    product: r.product as Product,
  };
}

export async function listStock(householdId: string): Promise<StockItem[]> {
  void householdId; // householdId resolved from JWT server-side
  const rows = await api.get<Record<string, unknown>[]>('/api/stock');
  return rows.map(mapStockRow);
}

export function countsOf(items: StockItem[]) {
  let fresh = 0, soon = 0, expired = 0;
  for (const i of items) {
    const off = i.off;
    if (off != null && off < 0) expired++;
    else if (off != null && off <= 3) soon++;
    else fresh++;
  }
  return { fresh, soon, expired, total: items.length };
}

export interface SavePayload {
  product: Product; qty: number; loc: LocationId; off: number;
  note?: string | null; price?: number | null; editId?: string | null;
  frozen?: boolean; bestForOff?: number | null; thawed?: boolean;
}

export async function saveStock(_householdId: string, p: SavePayload): Promise<void> {
  const cat = p.product.cat;
  let expiryDate: string;
  let bestForDate: string | null;
  let frozen: boolean;

  if (p.frozen) {
    frozen = true;
    expiryDate = isoDateInDays(p.off != null && p.editId ? p.off : freezerDaysFor(cat));
    bestForDate = isoDateInDays(p.bestForOff ?? p.off);
  } else if (p.thawed) {
    frozen = false;
    expiryDate = isoDateInDays(THAW_DAYS);
    bestForDate = null;
  } else {
    frozen = false;
    expiryDate = isoDateInDays(p.off);
    bestForDate = null;
  }

  const body = {
    productId: p.product.id, locationId: p.loc, quantity: p.qty,
    expiryDate, frozen, bestForDate,
    note: p.note ?? null, priceNok: p.price ?? null,
  };

  if (p.editId) {
    await api.put(`/api/stock/${p.editId}`, body);
  } else {
    await api.post('/api/stock', body);
  }
}

export async function consumeStock(id: string): Promise<void> {
  await api.patch(`/api/stock/${id}/consume`);
}
export async function discardStock(id: string): Promise<void> {
  await api.patch(`/api/stock/${id}/discard`);
}
export async function restoreStock(id: string): Promise<void> {
  await api.patch(`/api/stock/${id}/restore`);
}

export async function householdStats(_householdId: string, since: Date) {
  return api.get<{ saved: number; savedKr: number; wasted: number }>(
    `/api/stock/stats?since=${since.toISOString()}`
  );
}

export async function listProducts(_householdId: string): Promise<Product[]> {
  return api.get<Product[]>('/api/products');
}

export async function createProduct(
  _householdId: string,
  p: { name: string; brand?: string; cat: CategoryId; shelf?: number | null; barcode?: string | null },
): Promise<Product> {
  return api.post<Product>('/api/products', p);
}

export async function getHousehold(): Promise<Household | null> {
  try {
    return await api.get<Household>('/api/household');
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'NOT_FOUND') return null;
    throw err;
  }
}

export async function listMembers(_householdId: string): Promise<Member[]> {
  return api.get<Member[]>('/api/household/members');
}

export async function createHousehold(name: string, displayName?: string) {
  const data = await api.post<{ jwt: string; household: Household }>(
    '/api/household', { name, displayName }
  );
  const { setTokens } = await import('./api.js');
  const refresh = localStorage.getItem('friskr_refresh') ?? '';
  setTokens(data.jwt, refresh);
  return data.household;
}

export async function joinHousehold(code: string, displayName?: string) {
  const data = await api.post<{ jwt: string; household: Household }>(
    '/api/household/join', { code, displayName }
  );
  const { setTokens } = await import('./api.js');
  const refresh = localStorage.getItem('friskr_refresh') ?? '';
  setTokens(data.jwt, refresh);
  return data.household;
}

export interface StorageLocation {
  id: string; label: string; icon: string; hue: number; freezer: boolean; householdId: string | null;
}

export async function listLocations(_householdId: string): Promise<StorageLocation[]> {
  return api.get<StorageLocation[]>('/api/locations');
}

export async function createLocation(
  _householdId: string,
  p: { id: string; label: string; icon: string; freezer: boolean; hue?: number },
): Promise<StorageLocation> {
  return api.post<StorageLocation>('/api/locations', p);
}

export async function updateLocation(
  id: string, patch: Partial<Pick<StorageLocation, 'label' | 'icon' | 'freezer' | 'hue'>>
): Promise<void> {
  await api.patch(`/api/locations/${id}`, patch);
}

export async function deleteLocation(id: string): Promise<void> {
  await api.delete(`/api/locations/${id}`);
}

export async function scanLookup(barcode: string) {
  return api.get<
    | { source: 'catalogue'; product: Product }
    | { source: 'openfoodfacts'; draft: { name: string; brand: string; cat: CategoryId; shelf: number | null; barcode: string } }
    | { source: 'none'; barcode: string }
  >(`/api/scan?barcode=${encodeURIComponent(barcode)}`);
}

export interface Notif {
  id: string; kind: 'expired' | 'soon' | 'activity';
  cat?: CategoryId; by?: string; title: string; body: string; item?: StockItem; unread: boolean;
}
export function buildNotifications(items: StockItem[], selfName = 'Mari'): Notif[] {
  const list: Notif[] = [];
  items.filter((i) => i.off != null && i.off < 0).sort((a, b) => (a.off! - b.off!)).forEach((i) => {
    list.push({ id: 'exp-' + i.id, kind: 'expired', cat: i.product.cat, title: i.product.name, body: 'Gikk ut på dato', item: i, unread: true });
  });
  items.filter((i) => i.off != null && i.off >= 0 && i.off <= 3).sort((a, b) => (a.off! - b.off!)).forEach((i) => {
    list.push({ id: 'soon-' + i.id, kind: 'soon', cat: i.product.cat, title: i.product.name, body: 'Utløper snart', item: i, unread: true });
  });
  items.filter((i) => i.addedBy && i.addedBy !== selfName).slice(0, 3).forEach((i) => {
    list.push({ id: 'act-' + i.id, kind: 'activity', by: i.addedBy!, title: `${i.addedBy} la til ${i.product.name}`, body: '', item: i, unread: false });
  });
  return list;
}

export { CATEGORIES };
```

- [ ] **Step 3: Delete src/lib/supabase.ts**

```bash
rm src/lib/supabase.ts
```

- [ ] **Step 4: Remove @supabase/supabase-js from root package.json**

```bash
cd /path/to/friskr && npm uninstall @supabase/supabase-js
```

- [ ] **Step 5: Run frontend typecheck**

```bash
npm run typecheck
```

Fix any type errors. Common ones: imports of `supabase` that weren't caught, missing types in the new friskr.ts vs what screens expect.

- [ ] **Step 6: Commit**

```bash
git add src/lib/realtime.ts src/lib/friskr.ts package.json package-lock.json
git rm src/lib/supabase.ts
git commit -m "feat(frontend): migrate data layer from Supabase to REST API"
```

---

## Task 16: End-to-end smoke test

- [ ] **Step 1: Start the server**

```bash
cd server && npm run dev
```

Expected: `Server running on port 3001`

- [ ] **Step 2: Start the frontend**

```bash
# In a separate terminal, from friskr root:
npm run dev
```

Expected: Vite dev server on http://localhost:5173

- [ ] **Step 3: Smoke test auth flow**

Open http://localhost:5173. Enter your email on the login screen. Check your inbox for the OTP email. Enter the code. Verify you land on the home screen.

- [ ] **Step 4: Smoke test pantry**

Create a household if prompted. Add a stock item. Verify it appears in the list. Mark it consumed. Verify it disappears.

- [ ] **Step 5: Smoke test realtime**

Open a second browser tab. Add an item in one tab. Verify the other tab updates without reload.

- [ ] **Step 6: Run full server test suite**

```bash
cd server && npm test
```

Expected: All tests pass.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete Supabase → custom backend migration"
```
