-- Migration 0023: Configurable RBAC — tenant_roles table.
--
-- Replaces the hardcoded seven-role TypeScript constant with a DB-driven
-- table so each tenant can customise role labels and permissions.
-- System roles (is_system=true) may have their label and actions updated
-- but cannot be archived. Custom roles can be archived when no users hold
-- them.

CREATE TABLE tenant_roles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  label       text        NOT NULL,
  actions     text        NOT NULL DEFAULT '',
  is_system   boolean     NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed the seven system roles with their current static permissions.
-- This preserves all existing access exactly as before.
INSERT INTO tenant_roles (name, label, actions, is_system) VALUES
  ('learner',                 'Learner',                  'library.view', true),
  ('line_manager',            'Line Manager',             'library.view,nominations.manage', true),
  ('content_owner',           'Content Owner',            'library.view,library.edit,paths.edit,nominations.manage', true),
  ('compliance_reviewer',     'Compliance Reviewer',      'library.view', true),
  ('learning_administrator',  'Learning Administrator',   'people.view,people.import,roles.manage,wording.edit,structure.manage,activity.view,library.view,library.edit,library.all_areas,areas.manage,paths.edit,nominations.manage,candidates.manage,reports.view', true),
  ('group_viewer',            'Group Viewer',             '', true),
  ('external_learner',        'External Learner',         '', true);
