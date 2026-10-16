# Version 1 Roadmap

Source: Development Roadmap v1.1 (sections 7 to 9, 12 and 13) and Product Architecture v1.1 (section 16), both issued 15 October 2026. They replace v1.0 of each. Feature behaviour is defined in SUNU Blueprint v3.1, which every work package links to; scope and commercial terms are in SUNU Proposal v2.0.

## What changed in v1.1

* New: learning areas (Common Staff Learning for all staff, Department Learning for each department) with content types, so every library item is stored once and paths point to it.
* New: a glossary, company wide and per department, with language versions.
* New: a four stage path template (Common, Department, Role, Certificate), groups with group enrolment and bulk actions, and a My Learning page for every learner.
* New: fixed automations (inactive reminders, next path on completion, refresher before certificate expiry, overdue alerts to managers) and scheduled report emails to managers and HR.
* Moved to after go live (still designed in the architecture): external learners, expert capture with audio and video, and the key person risk report.
* Milestones and the week 13 go live date are unchanged.

Version 1 is built in six two week sprints plus a go live week. SUNU goes live in week 13, three months after signing. Foundations come first because every later module depends on them; the learning loop is demonstrable by week 6, everything is built by week 10, and weeks 11 and 12 are kept for security testing, acceptance and production readiness.

Each sprint's work packages are planned at the start of the sprint from the work breakdown below, so the order inside a sprint can change while the milestones hold.

## Sprints at a glance

| Sprint | Weeks | Epics in progress | Milestone at the end |
| --- | --- | --- | --- |
| Before Sprint 1 | | Decisions and setup | M0 Ready to build |
| Sprint 1 | 1 and 2 | E1, E2, E3, E4 | M1 Walking skeleton |
| Sprint 2 | 3 and 4 | E4, E5, E6, E7, E13 | M2 Content can flow |
| Sprint 3 | 5 and 6 | E7, E8, E9 | M3 Learning loop |
| Sprint 4 | 7 and 8 | E8, E9, E10, E11 | M4 Knowledge kept |
| Sprint 5 | 9 and 10 | E11, E12, E13, E14 | M5 Feature complete |
| Sprint 6 | 11 and 12 | E14, penetration test, acceptance | M6 Ready for production |
| Go live | 13 | | SUNU live for all staff |

## Epics

About 81 work packages across 14 epics (77 in v1.0). Each work package is one Claude Code session and one pull request. Counts are estimates for the technical lead to refine.

| Epic | Main work packages | Count | Sprint | Main code location |
| --- | --- | --- | --- | --- |
| E1 Foundation | Repository, CLAUDE.md, pipeline, environments, design system base, translation setup, decision records | 6 | 1 | repository root, packages/ui, infra, docs/adr |
| E2 Tenancy and platform | Control database, tenant database creation, tenant resolution by domain, permissions, activity log, settings and wording labels, feature switches | 7 | 1 | packages/platform, packages/db |
| E3 Identity | Email one time code, passwords and second factor, Microsoft and Google sign in, sessions, roles and scopes | 4 | 1 | packages/platform |
| E4 People and organisation | Departments, units, locations, role levels, staff CSV import, joiners, movers and leavers events, groups, group enrolment and bulk actions (external learners moved to after go live) | 6 | 1 to 2 | packages/platform |
| E5 Knowledge library | Items and versions, publishing workflow, files and bulk upload, search, review dates, owners, learning areas and content types, glossary with language versions | 8 | 2 | packages/core |
| E6 Notifications | Notification service, email channel, templates, digests, delivery records | 4 | 2 | packages/platform, apps/worker |
| E7 Templates and packs | Template and pack format, apply at onboarding, proposed updates and review, insurance template with default Common Staff Learning topics and starter glossary, Nigerian regulator pack | 5 | 2 to 3 | packages/platform, content |
| E8 Learning paths | Paths and modules, four stage path template, assignment rules, learner pages, My Learning page, progress, offline modules, fixed automations | 8 | 3 to 4 | packages/core, apps/web |
| E9 Tests and certificates | Question bank and approval, tests with confidence rating, baseline and test out, certificates with verification, renewals and suspension, weekly refreshers | 7 | 3 to 4 | packages/core, packages/documents |
| E10 Change alerts | Change detection, affected staff, confirmation flow, overdue chasing | 3 | 4 | packages/core, apps/worker |
| E11 Role profiles and handover | Role profiles, handover packs, successor paths, first 30 days checklist, gap requests, ownership transfer (expert capture moved to after go live) | 6 | 4 to 5 | packages/core |
| E12 Reports and evidence | Gap measurement, learner and team views, department overview, document change tracker, scheduled report emails, ITF, regulatory, data protection and individual evidence packs (key person risk moved to after go live) | 7 | 5 | packages/core, packages/documents |
| E13 Admin console and billing | Tenant management, pack publishing, support access grants, instance health, plans and invoices | 5 | 2 and 5 | apps/console |
| E14 Data protection and operations | Retention settings, offboarding export, monitoring, backups and restore tests, dedicated instance script, status page | 5 | 5 to 6 | packages/platform, infra |

The "Main code location" column is a mapping from the repository structure in the roadmap (section 5) and is not stated in the source documents; the technical lead may change it.

## Milestones and review gates

Each milestone ends with a demonstration on staging and a go or adjust decision by the product owner and technical lead.

| Milestone | When | Shown working | Gate decision |
| --- | --- | --- | --- |
| M0 Ready to build | Before week 1 | Decisions recorded, accounts set up, repository and pipeline running | Start Sprint 1 |
| M1 Walking skeleton | End of week 2 | Admin console creates a tenant; a user signs in on the tenant's domain; staff import works; isolation tests pass | Foundation patterns approved |
| M2 Content can flow | End of week 4 | Library with learning areas and content types, publishing, bulk upload, glossary, groups, email notifications; insurance template loaded | SUNU content owners start loading materials on staging |
| M3 Learning loop | End of week 6 | Four stage path drawing on both learning areas, module, test with confidence rating, certificate and My Learning page, for a sample role | First demo to SUNU sponsor |
| M4 Knowledge kept | End of week 8 | Change alerts with confirmation; fixed automations; role profiles; handover pack triggered by a leaver | Scope check: anything at risk moves to the included support period |
| M5 Feature complete | End of week 10 | Reports, scheduled report emails, evidence packs, retention and export | Feature freeze; only fixes after this |
| M6 Ready for production | End of week 12 | Penetration test findings fixed, SUNU acceptance testing signed off, restore test passed | Go live approval |
| Go live | Week 13 | SUNU live for all staff | Included support period starts |

## Security and data protection through the sprints

| When | Activity |
| --- | --- |
| Sprint 1 | Threat model for tenancy, sign in and support access; secret management and least privilege cloud accounts |
| Every change | Security review on the pull request, dependency scanning, tenant isolation and permission tests |
| Sprint 3 | Data protection review; records of processing drafted |
| Sprint 5 | Retention, anonymisation, export and offboarding built and tested; trust pack documents drafted |
| Week 11 | Independent penetration test of the dedicated SUNU environment |
| Week 12 | Findings fixed and retested; data processing agreement reviewed by a lawyer; incident response rehearsed |

## SUNU parallel track

| Weeks | Activity |
| --- | --- |
| 1 to 2 | Discovery with each department head and HR; organisation chart, grades, staff CSV format; inventory of learning materials for each department and for Common Staff Learning; hosting and sign in agreed with SUNU IT |
| 3 to 4 | Insurance template adjusted to SUNU's structure; Common Staff Learning list agreed with HR; regulatory library list agreed with Compliance; starter glossary shared |
| 5 to 8 | Content owners load department materials on staging; content workshops; role profiles drafted; question banks and glossary terms written and approved |
| 9 to 10 | Remaining content gaps closed; groups set up for teams and branches; administrator and manager training |
| 11 to 12 | Acceptance testing by SUNU testers; staff guides issued; communication from the sponsor |
| 13 | Go live by department |

## Environments

| Environment | Purpose | Data |
| --- | --- | --- |
| Development | Claude Code sessions and local runs | Fictional test insurer only |
| Preview | A temporary copy for each pull request | Fictional |
| Staging | Shared and dedicated tier setups as in production; demos and acceptance testing | Fictional, plus SUNU content without personal data until acceptance testing |
| Production shared | Future shared tier customers | Real |
| Production SUNU | SUNU's dedicated instance, created by script in week 9 | Real, from week 12 |

Merge to main deploys to staging automatically; production releases are approved by the technical lead and run through the pipeline.

## Before Sprint 1 (M0)

These come from the roadmap (section 15) and the architecture (section 17). Progress is noted against each item; the threat model draft is in [docs/security](security/threat_model_v1.md).

* [ ] Name the product owner and technical lead, and confirm the technical lead's daily review time (both: Eyitayo Falana; daily review time not yet confirmed)
* [x] Approve the technology stack, one decision record per line of the stack table (all 16 accepted on 14 October 2026, see [docs/adr](adr/README.md))
* [x] Create the GitHub organisation and repository, and connect it to Claude Code
* [ ] Open the cloud account and choose the default region; create development and staging environments (deferred)
* [ ] Choose the transactional email provider and register the sending domain (deferred)
* [ ] Choose error tracking and uptime monitoring services (deferred)
* [ ] Product name and domains for the customer app and admin console (working name Mantle; domains open)
* [ ] Designer engaged for visual direction in weeks 1 to 2
* [ ] Penetration testing firm booked for week 11
* [ ] Lawyer engaged for the data processing agreement review
* [ ] SUNU contract signed on Proposal v2.0 and SUNU coordinator named
* [ ] Hosting location for SUNU's dedicated instance, agreed with SUNU IT
* [ ] Default retention period for leavers' records, with legal advice
* [ ] Recovery targets confirmed against the hosting choice
* [ ] Who in Design Streams owns industry templates and regulator packs

## Scope risk

If the scope check at M4 or the developer estimate shows the team cannot carry everything, billing, shared tier extras and less used reports move to the included support period first, since SUNU does not depend on them. Optional extras listed in SUNU Proposal v2.0 (comments, assignment uploads, attendance, surveys, provider results import, SCORM) stay out of version 1 unless a written change request adds them.
