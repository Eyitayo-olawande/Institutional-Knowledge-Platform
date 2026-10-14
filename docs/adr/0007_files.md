# ADR 0007: Files

* **Status:** Proposed
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Technical lead (not yet named)
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

Uploaded files (SOPs, short videos, expert capture audio and video) must be stored per tenant with separate access keys, scanned for malware, and limited by type and size.

## Decision

Use S3 compatible object storage, with one area and one access key per tenant.

## Why

Standard, cheap, available in most regions.

## Consequences

* Files are reached only through the files service in packages/platform.

## Open questions

* Storage service depends on the cloud provider choice (ADR 0016).
* Malware scanning tool is not named in the source documents.
