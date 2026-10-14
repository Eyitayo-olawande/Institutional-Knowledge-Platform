# ADR 0010: Documents

* **Status:** Accepted, 14 October 2026
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

The product produces PDF certificates and evidence packs, and Excel exports for reports and offboarding.

## Decision

Use headless Chromium for PDF certificates and evidence packs, and a spreadsheet library for Excel exports, in packages/documents.

## Why

Same approach already used for the proposal PDFs.

## Consequences

* Document generation runs in the worker, not in the request.

## Open questions

* Spreadsheet library not named in the source documents.
