-- Migration 0022: Soft-delete for org structure entries.
--
-- archived_at marks a department, unit or role level as inactive.
-- Archived entries are hidden from the structure UI by default and
-- excluded from new-person assignment, but all FK-linked rows and
-- history are retained intact.

ALTER TABLE departments
  ADD COLUMN archived_at timestamptz;

ALTER TABLE units
  ADD COLUMN archived_at timestamptz;

ALTER TABLE role_levels
  ADD COLUMN archived_at timestamptz;
