# packages/db

Schemas and migrations for the control database (one, owned by Design Streams, no personal data) and the tenant database (one per customer).

Migrations must be safe on a live system and run against every tenant database in tests.

Proposed in the roadmap: PostgreSQL with a typed query layer and migrations (for example Drizzle) that can open a connection per tenant. Not confirmed until the decision records are approved.

Epic: E2, then every epic that adds data.

In place: development database setup (`npm run db:setup`) using the `pg` driver, with integration tests against a real PostgreSQL server. Schemas and migrations arrive with the control database work package.

Control database (ADR 0018, Drizzle): schema in src/control/schema.ts (groups, plans, tenants, releases, tenant releases), SQL migrations in migrations/control, a tenant lookup by domain for tenant resolution, and a fictional development seed.
