# E8: Fixed automations and scheduled report emails

* **Status:** Proposed, for the product owner to approve
* **Blueprint:** v3.1 section 12 (automatic reminders)
* **Architecture:** v1.1 section 6 (fixed automations in version 1), section 9 (digest and scheduled reports)
* **Depends on:** paths and assignments; email channel (provider choice is open).

## Goal

A small fixed set of reminders runs by itself, so administrators do not chase people by hand.

## Behaviour

Five rules, each switchable per tenant with its timing in Settings:

| Rule | Default |
| --- | --- |
| Remind a learner who has not started an assigned path | After 5 working days, then weekly |
| Assign the next path when one is finished | Immediately, where a next path is set |
| Assign recertification before a certificate expires | 30 days before expiry (active once certificates exist) |
| Tell the manager about overdue items in their team | Weekly summary |
| Send scheduled reports to managers and HR | Managers weekly; HR and management monthly |

* Rules run in the background worker on a daily schedule, in the tenant's time zone; working days skip weekends.
* Every reminder goes through the notification service, so it gets an in app notice, an email once the provider exists, and a delivery record.
* Low priority reminders are grouped into one daily or weekly digest.
* A person never gets the same reminder twice for the same item in one period.

## Data

New tenant tables: automation settings (rule, on or off, timing), automation runs (rule, period, person, item) to prevent repeats.

## Screens

Settings page: Reminders tab with each rule, a switch and its timing.

## Acceptance criteria

1. A learner assigned 5 working days ago with no progress gets one reminder, and one more a week later.
2. Switching the rule off stops further reminders.
3. A manager receives one weekly summary listing their team's overdue items.
4. Running the daily job twice in a day sends nothing extra.

## Tests

Unit tests for working day counting and repeat prevention; integration tests running the job against a tenant database with a fixed clock.

## Out of scope

A general rule builder; SMS and WhatsApp channels.
