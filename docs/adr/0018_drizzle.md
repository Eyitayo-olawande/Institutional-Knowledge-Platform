# ADR 0018: Drizzle for data access and migrations

* **Status:** Accepted, 15 October 2026
* **Date:** 15 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** ADR 0005 open question "Confirm Drizzle or name the alternative"

## Context

ADR 0005 calls for a typed query layer with migrations that can open a connection per tenant, and gives Drizzle as an example. Every tenant has its own database, so the layer must switch connections per request cheaply, and migrations must be safe on a live system and run against every tenant database.

## Decision

Use Drizzle ORM for queries and Drizzle Kit to generate migrations, on top of the `pg` driver, all inside packages/db.

## Why

* A tenant connection is a Drizzle instance over a normal `pg` pool, so per tenant connections need no special support.
* Tables are defined in TypeScript, so queries are type checked.
* Migrations are generated as plain SQL files that can be reviewed before they run.
* It is a thin layer close to SQL with no separate engine process, and it works with any PostgreSQL host, so ADR 0016 stays open.

Alternatives considered: Prisma (built around one fixed connection, heavier engine), Kysely (no schema or migration tooling), plain SQL with `pg` (no type checking).

## Consequences

* Only packages/db imports `pg` or `drizzle-orm` (existing lint rule).
* Production needs a connection pooler such as PgBouncer because of the number of tenant databases; this follows from the architecture, not from Drizzle.
* Drizzle Kit pulls in an older esbuild with a moderate advisory that affects its development server only; it is a development dependency and never ships.

## Open questions

* None.
