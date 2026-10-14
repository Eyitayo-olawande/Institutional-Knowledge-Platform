# Threat model, version 1 (draft)

* **Status:** Draft, for approval by the technical lead (Eyitayo Falana) in Sprint 1
* **Scope:** tenancy, sign in and support access, as set by Development Roadmap v1 section 10
* **Drafted by:** Claude Code, 14 October 2026

Every control below is taken from Product Architecture v1 (sections 4, 7 and 9) or Development Roadmap v1 (sections 5, 9 and 10). Items marked **Gap** are questions the documents leave open.

## What we protect

| Asset | Where it lives |
| --- | --- |
| Staff personal data and learning records | Each tenant's own database |
| Uploaded files (SOPs, audio, video) | Each tenant's own storage area |
| Tenant records, plans, pack subscriptions | Control database (no personal data) |
| Sessions and sign in secrets | Identity service; secrets in a managed secret store |
| Activity log | Each tenant's database, append only |
| Evidence packs and certificates | Each tenant's database and storage |

## Who interacts with the system

| Actor | Reaches |
| --- | --- |
| Staff, managers, customer administrators | Customer app on the tenant's domain |
| External learners (agents, brokers) | Customer app, only their assigned paths, items and certificates |
| Design Streams team | Admin console only, on its own domain |
| Outside services | Email provider, monitoring (providers not yet chosen) |

## Trust boundaries

1. Browser to the customer app: every request is mapped to exactly one tenant from its domain.
2. Customer app to tenant database and storage: only through the tenant context.
3. Admin console to tenant data: only through a time limited support access grant.
4. Platform to outside services: no personal data in logs, monitoring or usage events.

## Tenancy threats

| Threat | Controls in the documents |
| --- | --- |
| A request reads or writes another tenant's data | Tenant resolved from the domain before any data is read; database per tenant; all data access through the tenant context, enforced by a lint rule; isolation tests with two tenants on every change |
| A background job runs against the wrong tenant | **Gap:** the documents do not say how jobs carry their tenant. See ADR 0006 |
| Files reached across tenants | Separate storage area and access key per tenant |
| Personal data leaks into the control database, logs or usage events | Rule in CLAUDE.md; usage tracking counts events without personal content |
| A migration damages a tenant database | Migrations safe on a live system and tested against several tenant databases |
| A spoofed or misconfigured domain maps to the wrong tenant | **Gap:** domain verification and custom domain setup are not described |

## Sign in threats

| Threat | Controls in the documents |
| --- | --- |
| Password guessing or one time code guessing | Rate limiting and lockout; optional second factor |
| Weak home made authentication code | Established authentication library (ADR 0009) |
| Stolen or long lived sessions | Session timeouts set per tenant |
| A user acts beyond their role | Permission checks on the server for every request; permission tests for each role against actions it must not perform |
| External learner sees internal content | External learner role limited to assigned paths, items and certificates |
| Microsoft or Google sign in links to the wrong tenant | **Gap:** how an outside identity is matched to a tenant and person is not described |

## Support access threats

| Threat | Controls in the documents |
| --- | --- |
| Design Streams staff read customer data without permission | Time limited grant, recorded in the tenant's activity log where the customer can see it |
| Admin console exposed on customer domains | Console is a separate app on its own domain |
| Production credentials misused | Production access limited to the technical lead and named engineers; Claude Code never holds production credentials or SUNU personal data |
| Grant outlives its purpose | **Gap:** who can approve a grant and the maximum length are not stated |

## Checks that run on every change

Security review on the pull request, dependency vulnerability scanning, tenant isolation tests and permission tests (Development Roadmap v1, section 10).

## Open items for the technical lead

1. How background jobs carry and enforce their tenant.
2. How tenant domains, including custom domains, are verified.
3. How Microsoft and Google identities are matched to a tenant and a person.
4. Who approves support access grants, and their maximum length.
