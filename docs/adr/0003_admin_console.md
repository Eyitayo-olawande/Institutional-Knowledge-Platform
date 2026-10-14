# ADR 0003: Admin console

* **Status:** Accepted, 14 October 2026
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

Design Streams staff manage tenants, templates and packs, plans, support access and instance health. These tools must stay off customer domains.

## Decision

Build apps/console as a separate Next.js app on its own domain.

## Why

Keeps Design Streams tools off customer domains.

## Consequences

* The console shares packages/ui and packages/platform with the web app.
* Design Streams roles (support agent, content team, engineer, account owner) exist only in the console.

## Open questions

* Console domain, to be chosen with the product domains.
