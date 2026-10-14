# ADR 0013: Infrastructure

* **Status:** Proposed
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Technical lead (not yet named)
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

All infrastructure is described as code so a new dedicated instance is created by running a script. The same build goes to shared and dedicated instances.

## Decision

Use Terraform for all cloud resources, with containers for the app and the worker.

## Why

Dedicated instances created by script.

## Consequences

* infra holds Terraform for development, preview, staging and both production setups.

## Open questions

* Depends on the cloud provider choice (ADR 0016).
