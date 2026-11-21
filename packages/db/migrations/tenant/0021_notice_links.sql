-- Migration 0021: Add link column to notices for direct navigation.
--
-- Existing notices carry no link (null).  New notices created by nomination
-- approval and change-alert flows populate the link so the in-app notice
-- page can render a "Go to My Learning" or "View in Library" action.

ALTER TABLE notices
  ADD COLUMN link text;
