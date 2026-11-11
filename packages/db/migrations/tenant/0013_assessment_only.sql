-- Mark library items that are assessment-only (knowledge checks) so they are
-- excluded from general library listings and search. These items are only
-- reachable via their learning module URL.
ALTER TABLE "library_items" ADD COLUMN "assessment_only" boolean DEFAULT false NOT NULL;
