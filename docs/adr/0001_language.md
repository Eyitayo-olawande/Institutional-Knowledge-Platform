# ADR 0001: Language

* **Status:** Accepted, 14 October 2026
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

Version 1 has a customer web app, an admin console, background jobs and infrastructure scripts. The roadmap favours one language across the whole product, widely used and well supported tools, and as few moving parts as possible, so Claude Code works in familiar territory and the team can maintain it.

## Decision

Use TypeScript everywhere: web app, admin console, worker, shared packages and scripts.

## Why

One language for web, server, jobs and scripts.

## Consequences

* Business rules in packages/core and services in packages/platform are shared by every app without translation between languages.
* Type checks run as part of the Check step for every work package.

## Open questions

* None.
