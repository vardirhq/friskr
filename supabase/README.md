# Legacy Supabase material — not active infrastructure

> **This directory is retained for historical reference only.**
> Friskr no longer runs on Supabase.

The application now runs against the self-hosted Fastify + PostgreSQL API under
[`../server`](../server). Authentication, realtime (SSE + `LISTEN/NOTIFY`), and
all data access are handled there. The migrations, edge functions, RLS policies,
and seed data in this folder describe the **previous** Supabase-based backend and
are **not** applied to, nor kept in sync with, the current system.

Do not treat anything here as the source of truth:

- The authoritative schema and migrations live in
  [`../server/src/db/migrations`](../server/src/db/migrations).
- The authoritative API lives in [`../server/src`](../server/src).

This material is kept only so the migration history remains auditable. It can be
removed once it is no longer useful for reference.
