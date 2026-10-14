# ADR 0005: Data access

* **Status:** Accepted, 14 October 2026
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

Every data access must go through the tenant context, and direct database connections elsewhere are blocked by a lint rule (CLAUDE.md). The data layer must open a connection per tenant.

## Decision

Use a typed query layer with migrations that can open a connection per tenant. The roadmap gives Drizzle as an example.

## Why

Supports database per tenant cleanly.

## Consequences

* Control and tenant schemas live in packages/db.
* A lint rule blocks database access outside the tenant context.

## Open questions

* Confirm Drizzle or name the alternative.
