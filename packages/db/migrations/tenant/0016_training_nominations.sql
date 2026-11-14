CREATE TYPE "nomination_status" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "nomination_reason" AS ENUM (
  'performance_improvement',
  'skills_gap',
  'assessment_results',
  'compliance_requirement',
  'new_role',
  'manager_recommendation',
  'refresher_training',
  'career_development'
);

CREATE TABLE "training_nominations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "person_id" uuid NOT NULL REFERENCES "people"("id"),
  "path_id" uuid NOT NULL REFERENCES "paths"("id"),
  "nominated_by" text NOT NULL,
  "reason" "nomination_reason" NOT NULL,
  "reason_detail" text,
  "suggested_start_date" date,
  "status" "nomination_status" NOT NULL DEFAULT 'pending',
  "reviewed_by" text,
  "review_note" text,
  "approved_start_date" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" text NOT NULL
);
