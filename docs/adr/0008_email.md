# ADR 0008: Email

* **Status:** Proposed
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Technical lead (not yet named)
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

Notifications in version 1 go by work email and in app notices. Delivery records are evidence that a change alert was sent. Messages should come from the customer's own address where possible.

## Decision

Use a transactional email provider with per tenant sending domains, behind the notification service.

## Why

Deliverability and delivery records for evidence.

## Consequences

* Modules raise events; only the notification service talks to the provider, so the provider can be swapped.

## Open questions

* Provider not chosen. Deferred by the product owner on 14 October 2026.
