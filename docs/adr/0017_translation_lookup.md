# ADR 0017: Translation lookup

* **Status:** Proposed
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, technical lead
* **Source:** ADR 0011 open question "Translation library not named in the source documents"

## Context

ADR 0011 puts all screen text in message files from day one but leaves the library open. Version 1 needs English only, with French and others later. Server rendered pages and the worker (for emails) both need lookups.

## Decision

Use a small lookup in packages/platform (`createTranslator`) over JSON message files per app and locale, with English as the fallback. No third party translation library for now.

## Why

The roadmap favours as few moving parts as possible. Version 1 needs keyed lookups with simple `{name}` parameters, which this covers in about forty lines with tests. A library can replace it later behind the same `t()` call if plural rules or date formatting by locale are needed.

## Consequences

* A lint rule blocks text typed into JSX in apps and packages/ui.
* A test checks every locale file has the same keys as English.
* Plurals and locale date and number formats are not covered yet.

## Open questions

* Revisit when French is added: plural rules may justify a library.
