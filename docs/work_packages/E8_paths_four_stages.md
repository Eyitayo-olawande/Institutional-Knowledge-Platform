# E8: Paths, modules and the four stage template

* **Status:** Approved 2 November 2026 (built ahead of groups: group enrolment is deferred, not needed for assignment by department, role level or unit); built.
* **Blueprint:** v3.1 section 5 (learning paths, assignment, path rules); Proposal v2.0 section 4
* **Prototype:** Path builder screen; path card on My Learning
* **Depends on:** learning areas, structure records. Group enrolment (out of scope here; see groups work package).

## Goal

A path is an ordered set of modules in four stages (Common, Department, Role, Certificate). A module points at one or more library items and never copies them.

## Behaviour

* New paths start from the four stage template; stage names and count are wording and template data.
* Content owners build paths for their department: add modules to stages, order them, set due days from start (defaults: Stage 1 in 14 days, Stage 2 in 42, Stage 3 in 70, certificate by day 90).
* A module used in several paths is completed once and counts in all of them.
* Assignment rules: department, role level and optionally unit; a joiner matching a rule is assigned on import with due dates from their start date. A mover is assigned their new department's path the same way, and keeps modules already completed in any stage shared with their old path. Enrolling a group by hand is out of scope until the groups work package is built.
* Stages open in order; modules inside a stage in any order.
* Tests and certificates are separate packages (E9); in this package a module is completed by opening each of its items and confirming "I have read this".

## Data

New tenant tables: paths, path stages, modules, module items (module to library item), assignment rules, assignments (person to path, with dates), module progress.

## Screens

Path builder (content owners): four columns, add module, reorder, due days. Learner path view: stages with status and modules as cards.

## Acceptance criteria

1. A new path has four stages with the default names and due days.
2. A module links to library items; editing an item changes what every path shows, with no copy.
3. Importing a Claims Officer joiner assigns the Claims Officer path with due dates from the start date.
4. A mover from Claims to Underwriting keeps modules already completed in shared Common modules.
5. Stage 2 modules stay locked until Stage 1 is complete.

## Tests

Unit tests for due date calculation and stage locking; integration tests for joiner and mover assignment; permission tests for the builder.

## Out of scope

Tests and certificates (E9), baseline test out (E9), change alerts (E10), drag and drop (buttons to move up and down are enough for version 1), group enrolment (groups work package).
