# ADR 0006: Background jobs

* **Status:** Accepted, 14 October 2026
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

The product sends alerts, reminders and digests, and runs imports and exports in the background.

## Decision

Use a PostgreSQL based job queue, run by apps/worker. The roadmap gives pg boss as an example.

## Why

Alerts, reminders, imports and exports without adding another data store.

## Consequences

* Jobs must carry the tenant they belong to and run inside that tenant's context.

## Open questions

* Confirm pg boss or name the alternative.
* Whether the queue lives in the control database or each tenant database is not stated in the source documents and needs a decision.
