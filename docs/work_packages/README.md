# Work packages

Specs for each work package. Version 1 has 15 epics and about 88 work packages (see [the roadmap](../ROADMAP_v1.md)).

Each spec is written or approved by the product owner and holds: the goal, acceptance criteria, screens or rules, and a link to the blueprint. Each work package is small enough to finish and review in a day or two, and becomes one branch and one pull request.

## Proposed specs (16 October 2026)

Drafted by Claude Code from Blueprint v3.1, Proposal v2.0, Architecture v1.1 and SUNU Prototype v0.1, for the product owner to approve. Suggested order:

1. [Departments, units and role levels as records](E4_structure_records.md)
2. [Learning areas and content types](E5_learning_areas.md)
3. [Glossary](E5_glossary.md)
4. [Paths, modules and the four stage template](E8_paths_four_stages.md) — built ahead of groups (see note below)
5. [My Learning page](E8_my_learning.md) — built with paths, above
6. [Groups, group enrolment and bulk actions](E4_groups_bulk.md)
7. [Fixed automations and scheduled report emails](E8_fixed_automations.md)

Each adds tenant tables, so each takes the next free migration number at the time it is built.

### Note (2 November 2026): paths built ahead of groups

The paths spec lists groups as a dependency, for group based enrolment. The
product owner asked for a full, end to end learning path demo first:
automatic assignment by department, role level and unit, a learner working
through stages, and completion. None of that needs manual group enrolment,
so paths and My Learning were built first and groups moved after them.
Enrolling a group onto a path by hand is still out of scope until the
groups work package is built.
