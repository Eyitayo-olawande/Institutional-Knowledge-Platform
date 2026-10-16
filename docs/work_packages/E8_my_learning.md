# E8: My Learning page

* **Status:** Proposed, for the product owner to approve
* **Blueprint:** v3.1 section 11 (My Learning page)
* **Prototype:** My Learning screen
* **Depends on:** paths, modules and the four stage template.

## Goal

Every staff member's home page shows their learning at a glance: what is next, how far they are, and their certificates.

## Behaviour

* Four tiles: paths enrolled; modules completed (for example 12 of 19); completion rate; average score (shown once tests exist; until then hidden).
* Next up: the next open module, items due within 7 days, and change alerts waiting (once E10 exists).
* Each path as a card: name, due date, status badge (Not started, In progress, Due soon, Overdue, Completed), the four stage bar, and up to three module cards with Start, Continue or Review.
* Completed modules always say Review, never Start.
* For people with no path, the page shows the library and glossary cards instead.
* The page replaces the current home cards for staff; administrators still see their administration cards below.

## Data

No new tables; reads assignments and progress.

## Screens

My Learning (home). Phone layout: tiles two by two, cards in one column.

## Acceptance criteria

1. A person with 12 of 19 modules complete sees "12 of 19" and 63%.
2. A path due in 5 days shows Due soon; past its date, Overdue.
3. A completed module shows Review.
4. A person with no path sees the library and glossary cards.
5. The page meets the 44px touch target and AA contrast rules on phone and laptop.

## Tests

Unit tests for status rules (due soon, overdue); render tests for the tiles; an end to end test of the new hire journey once Playwright is set up.

## Out of scope

Weekly refresher (E9), certificates list contents (E9).
