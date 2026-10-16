# E4: Departments, units and role levels as records

* **Status:** Proposed, for the product owner to approve
* **Blueprint:** v3.1 sections 3 (Department Learning, one per department), 5 (paths by department and role level)
* **Architecture:** v1.1 sections 4 and 7 (Organisation area: departments, units, locations, role levels)
* **Depends on:** staff CSV import (done). Blocks: learning areas, groups, paths.

## Goal

Today a person's department is free text from the CSV. Learning areas and paths need a real list of departments, units, locations and role levels that administrators can see and tidy, and that people link to.

## Behaviour

* The staff import creates any department, unit, location or role level it has not seen before, matched by name ignoring case and extra spaces, and links each person to them.
* Administrators see the lists on a Structure page (under Administration), can rename an entry and can merge two entries that mean the same thing (for example "Claims" and "Claims Dept"). Merging moves people and history to the kept entry.
* Every structural word on screen comes from the wording labels (department, unit, location, role level).
* Every create, rename and merge writes to the activity log.

## Data

New tenant tables: departments, units (belongs to a department), locations, role levels (with an order number so paths can say "this level and above"). People gain links to each; the existing department text stays until the migration has copied it, then is removed in a later package.

## Screens

Structure page: four tabs (departments, units, locations, role levels), each a table with name, number of people, rename and merge actions. Uses the restyled app frame.

## Acceptance criteria

1. Importing the sample CSV creates the departments and links every person.
2. A second import with the same names creates nothing new.
3. Renaming a department changes it everywhere it is shown.
4. Merging two departments leaves one, with all people and history on it, and both actions appear in the activity log.
5. Only learning administrators can open the Structure page; the server refuses others.

## Tests

Unit tests for name matching; integration tests for import linking, rename and merge on a real tenant database; permission test for the page.

## Out of scope

Reporting lines beyond the existing manager field; locations on a map; HR system connection.
