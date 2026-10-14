# Architecture decision records

Every significant choice is recorded here before code depends on it, so later sessions follow earlier decisions instead of deciding again. Claude Code drafts each record; the technical lead approves it.

## Decisions needed before Sprint 1

The roadmap asks for one decision record per line of the proposed stack. None is approved yet.

| Area | Proposed in the roadmap | Status |
| --- | --- | --- |
| Language | TypeScript everywhere | Not recorded |
| Web application | Next.js (React), installable web app with offline support | Not recorded |
| Admin console | A separate Next.js app on its own domain | Not recorded |
| Database | PostgreSQL: one control database, one database per tenant | Not recorded |
| Data access | A typed query layer with migrations (for example Drizzle) that can open a connection per tenant | Not recorded |
| Background jobs | A PostgreSQL based job queue (for example pg boss) | Not recorded |
| Files | S3 compatible object storage, one area and key per tenant | Not recorded |
| Email | A transactional email provider with per tenant sending domains | Not recorded |
| Sign in | Email one time code and passwords, plus Microsoft and Google sign in, through an established authentication library | Not recorded |
| Documents | Headless Chromium for PDFs; a spreadsheet library for Excel exports | Not recorded |
| Translation | Message files for all screen text from day one | Not recorded |
| Testing | Vitest for unit and integration tests; Playwright for end to end tests | Not recorded |
| Infrastructure | Terraform for all cloud resources; containers for the app and worker | Not recorded |
| Pipeline | GitHub with GitHub Actions | Not recorded |
| Monitoring | Error tracking, uptime checks and a public status page | Not recorded |
| Hosting | A major cloud provider with a region close to Nigeria, or in country hosting if SUNU requires it | Not recorded |
