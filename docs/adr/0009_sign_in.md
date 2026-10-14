# ADR 0009: Sign in

* **Status:** Accepted, 14 October 2026
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

Staff sign in with company email and a one time code, or a password with optional second factor, or Microsoft 365 or Google Workspace. The sign in module must be replaceable so enterprise single sign on and phone number sign in can be added later.

## Decision

Use an established authentication library for email one time code, passwords, second factor, and Microsoft and Google sign in.

## Why

No home made security code.

## Consequences

* Sign in has rate limiting and lockout, and session timeouts set per tenant.
* Permissions are checked on the server for every request.

## Open questions

* Which library is not named in the source documents.
