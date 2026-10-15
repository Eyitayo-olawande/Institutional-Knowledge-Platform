# ADR 0019: Better Auth for sign in

* **Status:** Accepted, 15 October 2026
* **Date:** 15 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** ADR 0009 open question "Which library is not named in the source documents"

## Context

ADR 0009 calls for email one time codes, passwords with an optional second factor, and Microsoft and Google sign in, through an established library, built as a replaceable module. People and their sessions are personal data, so they must live in each tenant's own database.

## Decision

Use Better Auth, with one sign in instance per tenant over that tenant's database (Drizzle adapter), in packages/platform/src/identity.

## Why

* It covers email one time codes, passwords, a second factor, and Microsoft and Google sign in with its own plugins.
* It stores users, sessions and codes through our Drizzle schema, so each tenant's people stay in that tenant's database.
* It runs inside our app with no external service.

Alternative considered: Auth.js, which is weaker on passwords and a second factor.

## Consequences

* Sign up is switched off; people arrive through the staff import (E4). Development and tests use fictional people seeded by script.
* Sign in tables follow Better Auth's schema and timestamps instead of the changed_by column; sign in events go to the activity log once it exists.
* Until the email provider is chosen (ADR 0008), codes go to a local development outbox file, and production refuses to send.
* `MANTLE_AUTH_SECRET` (32 characters or more) is required in production.
* A tenant is chosen from the request address before its sign in instance; a session from one tenant is not accepted by another (tested).

## Open questions

* Second factor, Microsoft and Google sign in, roles and scopes are the remaining identity work packages (E3).
