# ADR 0020: Visual direction

* **Status:** Accepted, 16 October 2026
* **Date:** 16 October 2026
* **Drafted by:** Claude Code
* **Approver:** Eyitayo Falana, product owner and technical lead
* **Source:** Development Roadmap v1.2, epic E15 (UX and visual design); SUNU Prototype v0.1

## Context

The design tokens in packages/ui were neutral placeholders until the visual direction was set. Roadmap v1.2 has Claude Code set the visual direction from SUNU's brand instead of engaging a separate designer, with the product owner approving. A clickable prototype (SUNU Prototype v0.1, 23 screens across five roles) was reviewed and approved on 16 October 2026.

## Decision

* **Brand:** SUNU red #BA0C2F as the primary colour, #9A0A27 for hover, #FBEAEE as a light tint, #FF4255 as an accent for small marks such as the notification dot. Taken from sunuassurancesnigeria.com.
* **Red is for the brand and the one main action on a screen.** Everything else is white, light grey (#F6F7F9 page) and dark ink (#1F2430).
* **Risk and errors use orange red (#B23A0A), not the brand red,** so a main button never reads as a warning.
* **Status is always a word plus a colour.** Badge tones: success, info, neutral, warning, danger, brand, strong. The four knowledge levels map to danger (Not yet), warning (Developing), success (Proficient) and strong (Strong).
* **Every text and background pair meets WCAG AA (4.5 to 1).** The prototype's lighter muted grey (#7A7F8C) and amber (#B26A00) failed for small text and are replaced by #5E6472 and #8F5500. A test checks every pair.
* **Type:** Inter, falling back to the system font. 16px body on screens, 13px for small text.
* **Phone first:** 44px touch targets in every button size; one column and bottom navigation under 860px.
* **Light pages:** no stock photos. Module covers use a colour per path stage (Common red, Department charcoal, Role blue, Certificate amber).
* **Components in packages/ui:** Button (primary, secondary, ghost; md and sm), Badge, Card, ProgressBar, StatTile. All text comes from the caller.

## Why

SUNU staff already know the red brand from SUNU's website and documents, so the platform feels like SUNU's own. Keeping red for one action per screen stops the interface from feeling alarming, and a separate risk colour keeps warnings clear. AA contrast matters for staff on phones in bright light at branches.

## Consequences

* Token names used by existing screens are unchanged; their values change, so existing screens pick up the new look without code changes. A follow up work package restyles the ten screens built so far to the prototype layouts.
* Brand colours become tenant settings later, so another customer can use its own brand without a code change. These values are SUNU's defaults.
* Inter is not yet loaded by the apps; it falls back to the system font until the restyle work package loads it locally (no request to an outside font service, so private hosting keeps working).

## Open questions

* SUNU's official logo files and brand guidelines are requested at discovery; the prototype uses the logo from SUNU's website.
* Feedback from 3 to 5 SUNU staff on the prototype may adjust details before the learner screens are built.
