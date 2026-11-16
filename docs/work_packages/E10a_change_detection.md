# E10-a: Content Change Detection and Staff Notification

Sprint 4 (weeks 7-8) | Epic E10 Change Alerts

## Scope

When a library item is re-published, the system must:
1. Record the change with a classification (minor, important, critical) and optional description.
2. Find all staff who have an active assignment that includes that item, and have already viewed it.
3. Create an outstanding acknowledgement row for each of them and send them an in-app notice.

This work package covers detection and notification only. The staff-facing acknowledgement banner and the completion gate block are E10-b.

## Schema changes (migration 0018)

### Extend `item_views`
Add `item_version integer` (nullable). Set on every new view or re-view to the item's current `published_version`. Existing rows backfill as null; they are treated as "version unknown" and do not block the new gate (E10-b handles that transition).

### New enum `change_classification`
Values: `minor`, `important`, `critical`.

### New table `content_change_alerts`
One row per published version of an item that carries a change alert. Unique on `(item_id, new_version)` to be safe against retry.

| Column | Type |
|---|---|
| id | uuid PK |
| item_id | uuid FK library_items |
| previous_version | int |
| new_version | int |
| classification | change_classification |
| change_description | text |
| created_by | text |
| created_at | timestamptz |
| audit columns | |

### New table `change_alert_acknowledgements`
One row per person per alert. Unique on `(alert_id, person_id)`.

| Column | Type |
|---|---|
| id | uuid PK |
| alert_id | uuid FK content_change_alerts |
| person_id | uuid FK people |
| notified_at | timestamptz |
| acknowledged_at | timestamptz nullable |
| acknowledged_version | int nullable |
| last_reminded_at | timestamptz nullable |
| reminder_count | int default 0 |
| audit columns | |

## Behaviour changes

### `recordItemView` (assessments.ts)
Change `onConflictDoNothing` to `onConflictDoUpdate` to refresh `viewedAt` and `item_version` whenever a person re-reads an item. The unique constraint remains unchanged.

### `publishDraft` (library.ts)
Add optional `changeAlert?: { classification: ChangeClassification; description: string }` parameter. When provided AND the item already had a `publishedVersion` (i.e., this is a re-publish), call `createChangeAlerts` inside the same transaction.

### `createChangeAlerts` (library.ts)
Inside the transaction:
1. Insert `content_change_alerts` row; on conflict (item_id, new_version) do nothing (idempotent retry safety).
2. Find affected people: active people with an active assignment that covers a module containing this item, AND an existing `item_views` row for this item.
3. Bulk-insert `change_alert_acknowledgements` using `onConflictDoNothing`.
4. For each affected person who has a `userId`, call `addNotice` with event `change_alert.<alertId>`.

### `publishItem` server action (library/actions.ts)
Read `changeClassification` and `changeDescription` from the form. If the item already has a `publishedVersion`, validate both fields and pass to `publishDraft`. First-time publishes pass nothing.

### Admin publish UI (library/[id]/page.tsx)
When a draft exists AND the item already has a published version: replace the bare "Publish version N" button with an inline form that also shows a classification `<select>` and an optional description `<textarea>`.

## What is NOT in this work package
- Staff-facing acknowledgement banner: E10-b
- Completion gate block: E10-b
- Admin change-alerts list and detail pages: E10-c
- Worker reminder job: E10-c
