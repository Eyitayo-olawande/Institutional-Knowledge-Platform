# ADR 0014: Pipeline

* **Status:** Proposed
* **Date:** 14 October 2026
* **Drafted by:** Claude Code
* **Approver:** Technical lead (not yet named)
* **Source:** Development Roadmap v1, section 4; Product Architecture v1

## Context

Every work package is one pull request with automated checks; merge to main deploys to staging automatically; production releases are approved by the technical lead.

## Decision

Use GitHub with GitHub Actions.

## Why

Pull request reviews, checks and deployments in one place.

## Consequences

* Checks on every change: tests, type checks, linting, tenant isolation tests, dependency scanning.
* End to end tests on every merge to main.

## Open questions

* None.
