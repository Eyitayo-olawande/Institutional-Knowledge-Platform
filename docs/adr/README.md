# Architecture decision records

Every significant choice is recorded here before code depends on it, so later sessions follow earlier decisions instead of deciding again. Claude Code drafts each record; the technical lead approves it.

## Decisions needed before Sprint 1

The roadmap asks for one decision record per line of the proposed stack. All 16 are drafted with status Proposed and wait for the technical lead's approval. The product owner deferred the choice of email, monitoring and cloud providers on 14 October 2026.

| Record | Proposed in the roadmap | Status |
| --- | --- | --- |
| [0001 Language](0001_language.md) | TypeScript everywhere | Proposed |
| [0002 Web application](0002_web_application.md) | Next.js (React), installable web app with offline support | Proposed |
| [0003 Admin console](0003_admin_console.md) | A separate Next.js app on its own domain | Proposed |
| [0004 Database](0004_database.md) | PostgreSQL: one control database, one database per tenant | Proposed |
| [0005 Data access](0005_data_access.md) | A typed query layer with migrations (for example Drizzle) that can open a connection per tenant | Proposed |
| [0006 Background jobs](0006_background_jobs.md) | A PostgreSQL based job queue (for example pg boss) | Proposed |
| [0007 Files](0007_files.md) | S3 compatible object storage, one area and key per tenant | Proposed |
| [0008 Email](0008_email.md) | A transactional email provider with per tenant sending domains | Proposed; provider deferred |
| [0009 Sign in](0009_sign_in.md) | Email one time code and passwords, plus Microsoft and Google sign in, through an established authentication library | Proposed |
| [0010 Documents](0010_documents.md) | Headless Chromium for PDFs; a spreadsheet library for Excel exports | Proposed |
| [0011 Translation](0011_translation.md) | Message files for all screen text from day one | Proposed |
| [0012 Testing](0012_testing.md) | Vitest for unit and integration tests; Playwright for end to end tests | Proposed |
| [0013 Infrastructure](0013_infrastructure.md) | Terraform for all cloud resources; containers for the app and worker | Proposed |
| [0014 Pipeline](0014_pipeline.md) | GitHub with GitHub Actions | Proposed |
| [0015 Monitoring](0015_monitoring.md) | Error tracking, uptime checks and a public status page | Proposed; provider deferred |
| [0016 Hosting](0016_hosting.md) | A major cloud provider with a region close to Nigeria, or in country hosting if SUNU requires it | Proposed; provider deferred |
| [0017 Translation lookup](0017_translation_lookup.md) | Small built in lookup over JSON message files (answers the open question in 0011) | Proposed |

## Statuses

* **Proposed:** drafted, waiting for the technical lead.
* **Accepted:** approved; code may depend on it.
* **Superseded:** replaced by a later record, which it links to.

A record is never edited after it is accepted; a change is a new record that supersedes it.
