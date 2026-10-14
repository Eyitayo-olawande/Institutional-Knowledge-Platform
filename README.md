# Mantle

Mantle is the working name, chosen on 14 October 2026, for the Knowledge and Learning Platform. Product owner: Eyitayo Falana. Technical lead: not yet named.

One global product that helps organisations in any industry keep, teach and prove their institutional knowledge. Design Streams builds it, and SUNU Assurances Nigeria is the first customer, going live on the dedicated tier in week 13, three months after signing.

This repository holds the whole product. It currently contains the version 1 starting structure: folders, rules, the roadmap, the proposed decision records and a draft threat model. No application code or dependencies have been added yet, because every line of the proposed technology stack must first be approved in a decision record (see [docs/adr](docs/adr/README.md)).

## Source documents

Everything here is mapped to two internal Design Streams documents (October 2026, version 1.0):

* **Product Architecture v1**: the structure that lets one product serve every customer.
* **Development Roadmap v1**: how version 1 is built in six two week sprints with Claude Code.

Feature behaviour is defined in the SUNU blueprint. Where this repository and those documents disagree, the documents win until a decision record says otherwise.

## Design principles

1. **One codebase, never forked.** Differences between customers live in settings, templates and packs, never in custom code.
2. **Configuration over code.** Departments, role levels, wording, certificate rules, pass marks, evidence packs and regulator content are data.
3. **Separate data per customer.** Each customer has its own database, on shared or dedicated infrastructure.
4. **Provision now, build later.** Capabilities needed later get a clean place in the core from version 1.
5. **Simple for the customer.** Short modules and clear paths; administrators manage content without developers.
6. **Built for Nigerian conditions.** Phone first, light pages, offline modules, naira pricing, evidence for Nigerian regulators and the ITF.
7. **People approve, the platform assists.** Any automated help produces drafts that a named person approves.

## What version 1 contains

* Tenancy with a database per tenant, a control database, and the dedicated tier deployment for SUNU
* The seven customer parts: knowledge library, learning paths, tests, certificates, change alerts, reports and evidence packs, role profiles and handover
* The industry template and regulator pack mechanism, with the insurance template and the Nigerian pack
* Email and in app notifications
* Admin console, release pipeline, monitoring and backups
* Retention settings, offboarding export and the trust pack
* Billing records and invoicing for the shared tier
* External learners (agents, brokers and distributors) invited by email or CSV

Prepared but not built in version 1: shared tier self sign up, observed assessment, formal electronic signatures, further templates, SMS, WhatsApp and push, public API and HR connectors, AI drafting, SCORM import, self registration by external learners, online payments.

## Repository layout

| Folder | Holds |
| --- | --- |
| [apps/web](apps/web) | Customer application |
| [apps/console](apps/console) | Design Streams admin console |
| [apps/worker](apps/worker) | Background jobs |
| [packages/core](packages/core) | Business rules for the seven parts |
| [packages/platform](packages/platform) | Tenancy, permissions, activity log, notifications, files, settings |
| [packages/db](packages/db) | Control and tenant schemas and migrations |
| [packages/ui](packages/ui) | Design system |
| [packages/documents](packages/documents) | Certificates, evidence packs, exports |
| [content](content) | Insurance template and Nigerian pack as data |
| [infra](infra) | Infrastructure for all environments |
| [tests/e2e](tests/e2e) | End to end and isolation tests |
| [docs/adr](docs/adr) | Architecture decision records |
| [docs/security](docs/security) | Threat model |
| [docs/work_packages](docs/work_packages) | Work package specs |
| [CLAUDE.md](CLAUDE.md) | Rules every Claude Code session follows |

## Roadmap

The version 1 plan, with epics, sprints and milestones, is in [docs/ROADMAP_v1.md](docs/ROADMAP_v1.md).

## How work arrives

Each work package is built in one Claude Code session on its own branch, delivered as one pull request with tests, reviewed and merged by the technical lead, and accepted on staging by the product owner. See [docs/work_packages](docs/work_packages/README.md).
