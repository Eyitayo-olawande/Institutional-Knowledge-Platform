# packages/db

Schemas and migrations for the control database (one, owned by Design Streams, no personal data) and the tenant database (one per customer).

Migrations must be safe on a live system and run against every tenant database in tests.

Proposed in the roadmap: PostgreSQL with a typed query layer and migrations (for example Drizzle) that can open a connection per tenant. Not confirmed until the decision records are approved.

Epic: E2, then every epic that adds data.
