-- E10-a: Content change alerts
-- Adds item_version tracking to item_views, and two new tables for change
-- alerts and per-person acknowledgements.

-- 1. Add item_version to item_views. Nullable so existing rows are unaffected;
--    recordItemView now sets it on every insert or upsert.
ALTER TABLE item_views ADD COLUMN item_version integer;

-- 2. Change classification enum.
CREATE TYPE change_classification AS ENUM ('minor', 'important', 'critical');

-- 3. Content change alerts: one row per re-publish that carries an alert.
--    Unique on (item_id, new_version) so a retry of publishDraft is safe.
CREATE TABLE content_change_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES library_items(id),
  previous_version integer NOT NULL,
  new_version integer NOT NULL,
  classification change_classification NOT NULL,
  change_description text NOT NULL DEFAULT '',
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  changed_by text NOT NULL
);

CREATE UNIQUE INDEX content_change_alerts_item_version_unique
  ON content_change_alerts (item_id, new_version);

CREATE INDEX content_change_alerts_item_idx
  ON content_change_alerts (item_id);

-- 4. Per-person acknowledgement records. One row per (alert, person).
--    acknowledged_at is null until the person explicitly confirms.
CREATE TABLE change_alert_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES content_change_alerts(id),
  person_id uuid NOT NULL REFERENCES people(id),
  notified_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_version integer,
  last_reminded_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  changed_by text NOT NULL
);

CREATE UNIQUE INDEX change_alert_acknowledgements_alert_person_unique
  ON change_alert_acknowledgements (alert_id, person_id);

CREATE INDEX change_alert_acknowledgements_person_idx
  ON change_alert_acknowledgements (person_id);

CREATE INDEX change_alert_acknowledgements_pending_idx
  ON change_alert_acknowledgements (alert_id)
  WHERE acknowledged_at IS NULL;
