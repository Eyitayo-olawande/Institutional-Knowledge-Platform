# ADR 0015: Monitoring

* **Status:** Accepted, 14 October 2026
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

The reliability targets need uptime checks for every tenant domain, error tracking, slow page alerts, failed email alerts, and a status page customers can see.

## Decision

Use error tracking, uptime checks and a public status page.

## Why

Required by the reliability targets.

## Consequences

* No personal data is sent to monitoring or logs.

## Open questions

* Services not chosen. Deferred by the product owner on 14 October 2026.
