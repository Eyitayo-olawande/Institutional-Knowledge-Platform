# E4: Groups, group enrolment and bulk actions

* **Status:** Proposed, for the product owner to approve
* **Blueprint:** v3.1 section 5 (group enrolment); Proposal v2.0 section 5
* **Prototype:** People and groups screen (tabs, checkboxes, "with selected" actions)
* **Depends on:** structure records. Enrolment on paths arrives with the path packages; this package delivers groups and bulk changes to people.

## Goal

Administrators can act on many people at once: a team, a branch or a new hire intake.

## Behaviour

* A group is either a saved list of people, or a rule (department, unit, location, role level, joined after a date) whose members update when the staff import changes.
* The People page gains checkboxes and actions for selected people: add to group, remove from group, mark as left. Each action asks for confirmation showing how many people are affected.
* Every bulk action writes one activity log entry per person, plus one summary entry.
* Groups are used later by path enrolment, area access grants and scheduled reports.

## Data

New tenant tables: groups (name, kind list or rule, rule definition), group members (for list groups).

## Screens

People page: Groups tab with name, kind, member count; group detail with members; selection checkboxes and a "with selected" bar on the People tab.

## Acceptance criteria

1. A rule group "Claims, joined after 1 October" lists exactly the matching people and updates after the next import.
2. Selecting 3 people and choosing "add to group" adds them and logs 3 entries plus a summary.
3. Bulk "mark as left" is refused for the person doing it.
4. Only learning administrators can create groups or run bulk actions.

## Tests

Unit tests for rule matching; integration tests for bulk actions and logging; permission tests.

## Out of scope

Enrolling groups on paths (paths packages), nested groups.
