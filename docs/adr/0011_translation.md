# ADR 0011: Translation

* **Status:** Proposed
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Technical lead (not yet named)
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

No screen text may be typed into code, and every structural word comes from the tenant's wording labels. English is needed at go live, with French and others later.

## Decision

Use message files for all screen text from day one.

## Why

English at go live, French and others later.

## Consequences

* A lint or test check should catch hard coded screen text.
* Wording labels (department, unit, role level) are tenant data, separate from message files.

## Open questions

* Translation library not named in the source documents.
