# ADR 0002: Web application

* **Status:** Accepted, 14 October 2026
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

Staff use the product on phone or laptop, often on slow connections, and need offline modules (Product Architecture principle 06). There is no app store distribution in version 1.

## Decision

Build apps/web with Next.js (React) as an installable web app with offline support.

## Why

Phone first, no app store, server and client in one project.

## Consequences

* Offline modules are built into the web app (epic E8).
* All screen text comes from translation files (see ADR 0011).

## Open questions

* None.
