# ADR 0016: Hosting

* **Status:** Accepted, 14 October 2026
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

Hosting location is recorded per tenant, and transfers outside the agreed location need the customer's written approval. SUNU's dedicated instance location is agreed with SUNU IT.

## Decision

Use a major cloud provider with a region close to Nigeria, or in country hosting if SUNU requires it.

## Why

Decided with SUNU IT under the data protection rules.

## Consequences

* Staging runs on the default region until the SUNU hosting decision is made.

## Open questions

* Cloud provider and default region not chosen. Deferred by the product owner on 14 October 2026.
* SUNU hosting location, to be agreed with SUNU IT in week 1.
