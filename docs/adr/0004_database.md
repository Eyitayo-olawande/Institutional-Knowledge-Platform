# ADR 0004: Database

* **Status:** Proposed
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Technical lead (not yet named)
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

Each customer has its own database so data cannot leak between customers, and a customer can move between tiers by copying its data. A central control database holds tenant records, plans, hosting location and pack subscriptions, never personal data.

## Decision

Use PostgreSQL: one control database, and one database per tenant.

## Why

Matches the architecture; mature, low cost, managed versions widely available.

## Consequences

* Migrations must run against every tenant database and be safe on a live system.
* Isolation tests use at least two test tenants.

## Open questions

* Managed PostgreSQL service depends on the cloud provider choice (ADR 0016).
