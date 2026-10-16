# E5: Glossary

* **Status:** Proposed, for the product owner to approve
* **Blueprint:** v3.1 section 4; Proposal v2.0 section 5
* **Prototype:** Glossary screen (A to Z, category chips, French line)
* **Depends on:** learning areas.

## Goal

A plain language list of terms for the whole company and for each department, so new staff can look up words like indemnity, subrogation or FNOL.

## Behaviour

* A term has a name, a definition, a category and belongs to the company glossary (Common) or one department's area. Visibility follows the area rules.
* A term can hold versions in other languages; English is required, French optional. The screen shows the French line when present.
* Staff see an A to Z bar, a search box and category chips. Choosing a letter shows terms starting with it.
* Content owners create, edit and retire terms in their areas; changes are recorded in the activity log. No approval workflow in this package.
* Terms can be linked from a library item's body by a simple marker; the item page shows linked terms as links to the glossary.
* The insurance template seeds about 30 starter terms (from Blueprint v3.1 examples) that SUNU then adjusts.

## Data

New tenant tables: glossary terms (area, category, status), glossary term texts (term, language, name, definition).

## Screens

Glossary page (all staff); glossary manager list and term form (content owners). Menu: Glossary under the main section.

## Acceptance criteria

1. A Claims staff member sees company and Claims terms, not Underwriting terms.
2. Searching "subro" finds Subrogation; choosing S lists terms beginning with S.
3. A term with a French text shows it; one without shows nothing extra.
4. Only content owners for the area can edit its terms.
5. Retired terms disappear for staff but stay in history.

## Tests

Permission tests per area; unit tests for letter grouping and search; integration test for the starter seed.

## Out of scope

Automatic linking of every occurrence in text, audio pronunciation, approval workflow.
