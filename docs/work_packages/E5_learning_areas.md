# E5: Learning areas and content types

* **Status:** Proposed, for the product owner to approve
* **Blueprint:** v3.1 section 3 (the library and the two learning areas); Proposal v2.0 section 4
* **Architecture:** v1.1 section 4 (learning areas and path structure)
* **Prototype:** Library screen (area and type filter chips), Department library screen
* **Depends on:** departments as records (E4 structure records).

## Goal

Every library item belongs to one learning area (Common Staff Learning, or one department's Department Learning) and has one content type, so staff can browse by area and no material is copied between departments.

## Behaviour

* Common Staff Learning exists in every tenant. Each department gets its own Department Learning area automatically when the department is created.
* Content types are data from the industry template. Defaults for Common: leadership and management; organisational and workplace skills; communication and business etiquette; company history, culture and core values; customer service; performance management; regulatory and compliance, including AML/CFT; information and cybersecurity awareness; health, safety and other mandatory training; other organisation wide materials. Defaults for Department: policies and procedures; manuals and guides; technical and reference materials; training materials; other department resources.
* Creating an item requires choosing an area and a content type. Existing items are put in Common Staff Learning with the type "other organisation wide materials" by the migration, and listed for content owners to move.
* Who sees an area: all staff see Common; a Department area is seen by that department's staff and anyone granted access. The server checks this on every library read, including search.
* The library page shows filter chips for area and type; search respects the person's areas.
* Moving an item to another area is an edit, recorded in the activity log.

## Data

New tenant tables: learning areas (kind common or department, linked department), content types (belongs to area kind, order, label), area access grants (person or group to area). Library items gain area and content type.

## Screens

Library: chips for All, Common Staff Learning, each department the person can see, and content types. New item and item edit forms: area and type selects. Item page: area and type shown as badges.

## Acceptance criteria

1. A new tenant has Common Staff Learning and one area per department.
2. A staff member in Claims sees Common and Claims items, and not Underwriting items, in lists, search and direct links.
3. A person granted access to Underwriting sees its items.
4. An item cannot be saved without an area and a content type.
5. Existing items appear in Common after the migration and are flagged for review.

## Tests

Permission tests for each area rule (list, search, direct link); integration tests for the migration of existing items; unit tests for default content types.

## Out of scope

Classification levels (Restricted and so on), regulatory tagging (Compliance package), templates loading content types (E7 applies them later).
