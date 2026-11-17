-- Library item-level visibility (categorisation) and staff attestation.
-- Visibility gates access within an area: 'area' is the default (unchanged),
-- 'role_level' restricts to listed role levels, 'restricted' restricts to
-- a named list of people. Attestation records a staff member's formal
-- confirmation that they have read and understood a document.

CREATE TYPE item_visibility AS ENUM ('area', 'role_level', 'restricted');

ALTER TABLE library_items
  ADD COLUMN visibility item_visibility NOT NULL DEFAULT 'area',
  ADD COLUMN requires_attestation boolean NOT NULL DEFAULT false;

-- Per-item access rules. kind must be 'role_level' or 'person'.
CREATE TABLE library_item_access_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('role_level', 'person')),
  ref_id          uuid NOT NULL,
  changed_by      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX library_item_access_rules_unique
  ON library_item_access_rules(item_id, kind, ref_id);

CREATE INDEX library_item_access_rules_item_idx
  ON library_item_access_rules(item_id);

-- Staff read-and-understand attestations. Unique per person per item per version.
CREATE TABLE staff_attestations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       uuid NOT NULL REFERENCES people(id),
  item_id         uuid NOT NULL REFERENCES library_items(id),
  version         integer NOT NULL,
  attested_at     timestamptz NOT NULL DEFAULT now(),
  changed_by      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX staff_attestations_person_item_version_unique
  ON staff_attestations(person_id, item_id, version);

CREATE INDEX staff_attestations_item_idx ON staff_attestations(item_id);
CREATE INDEX staff_attestations_person_idx ON staff_attestations(person_id);
