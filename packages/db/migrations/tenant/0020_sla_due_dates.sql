-- Migration 0020: SLA due dates for change-alert acknowledgements and staff attestations.
--
-- Adds a due_by column to change_alert_acknowledgements so compliance managers
-- can distinguish overdue items from items pending within SLA.  Existing rows
-- receive a retroactive due_by of 14 days from their notified_at timestamp.
--
-- staff_attestations records a completed act (the person already attested) so
-- a due_by on that table is not meaningful.  SLA for attestations is tracked
-- via change_alert_acknowledgements.

ALTER TABLE change_alert_acknowledgements
  ADD COLUMN due_by date;

-- Back-fill: 14-day SLA from notification date for all existing rows.
UPDATE change_alert_acknowledgements
  SET due_by = (notified_at + INTERVAL '14 days')::date
  WHERE due_by IS NULL;
