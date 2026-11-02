# ADR 0021: Document viewer, no raw downloads

* **Status:** Accepted, 2 November 2026
* **Date:** 2 November 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** Product owner review of the alpha build, 2 November 2026

## Context

Library files currently serve as a plain download: `apps/web/src/app/files/[id]/route.ts` sends every attachment with `content-disposition: attachment`, so opening a PDF, a slide deck or a spreadsheet saves a copy to the viewer's device instead of showing it inside Mantle. The product owner's direction is that company-owned content is viewed in place, never downloaded, with one exception: a genuinely external resource (for example a YouTube link) is not company-owned and may open directly. The original uploaded file is still kept, both for conversion and so a content owner can re-edit it in its native application.

## Decision

* Render every viewable document in the browser inline (`content-disposition: inline`), using the browser's own built-in PDF viewer rather than bundling a separate PDF.js dependency.
* Convert uploaded DOCX, PPTX and XLSX files to PDF synchronously, as part of the upload action itself, using headless LibreOffice. The converted PDF is what staff see; the original is kept in storage but is not served to a learner.
* PNG and JPG render inline as images. MP4 streams inline. None of these offer a "save" control to a learner.
* A content item that only holds an external link (no uploaded file) opens or embeds that link directly; there is nothing to convert or protect. (No such item type exists yet; this applies once one does.)
* Only people with `library.edit` get a "Download original" action, to re-edit the source file. Learners never see a download control.

## Why

* The browser's own PDF viewer already renders a PDF inline with no plugin and no added dependency; converting every Office format to PDF lets that one viewer cover every document type instead of building a separate renderer per format. A dedicated PDF.js integration (page thumbnails, in-page search) is a reasonable later upgrade, not required for this decision.
* Headless LibreOffice is the standard self-hosted Office-to-PDF converter and keeps the stack free of a third-party SaaS dependency, consistent with the dedicated-tier, on-prem-capable deployment model already assumed elsewhere in the architecture.
* Keeping the original (rather than discarding it after conversion) is the explicit product owner decision: content owners need it to re-edit in Word, PowerPoint or Excel, since Mantle has no in-browser document editor.

Alternative considered: embedding a third-party viewer (for example Office Online or Google Docs viewer). Rejected because it would mean sending tenant content to an external service, which contradicts the reason for not allowing downloads in the first place.

**Synchronous, not in the worker.** ADR 0010 runs document generation in the worker, and this ADR originally proposed the same for conversion. Planning found that `apps/worker` has no real job-queue mechanism yet — ADR 0006 accepted the idea of a background job queue but left the engine (pg-boss or otherwise) and its database an open question, and nothing has needed an answer until now. Standing that up is a separate decision, better made when a work package actually needs it (E6 notifications is the likely candidate). For this package, LibreOffice converts a file inline during the upload request, which an editor already expects to take a moment; a learner is never waiting on it. This can move to the worker later without changing anything a viewer sees.

## Consequences

* `apps/web/src/app/files/[id]/route.ts` changes from an unconditional download to a permission-checked view response; a separate, more tightly scoped `.../original` route serves the original to `library.edit` holders only.
* Conversion runs inside the upload action in `apps/web`, not in `apps/worker`. An attachment's status is `ready` or `failed` by the time the upload finishes; the schema also allows `pending`, kept for when conversion does move to the worker, but nothing sets it today.
* `packages/documents` is a new workspace package, holding the LibreOffice-based conversion step; `apps/documents`'s own README still separately proposes headless Chromium and a spreadsheet library for certificates and exports (ADR 0010, not yet built).
* LibreOffice becomes a required local, CI and production dependency, documented in `docs/local_development.md`, the same category of requirement as Postgres.app.
* This does not change the four-stage learning path (Common, Department, Role, Certificate); that stays the structural backbone for paths. This ADR only changes how an item's content is opened once someone reaches it.

## Open questions

* Whether the rendered view should also carry a per-viewer watermark (name, email, timestamp), as the original blueprint's content-protection goal anticipated. Worth its own work package if wanted.
* Whether a converted rendition follows the same retention period as the original, or is regenerated on demand and not retained independently.
* When E6 (or another package) needs a real background job queue, conversion is a reasonable first job to move onto it, settling ADR 0006's remaining open question at that point rather than this one.
