CREATE TYPE "aptitude_section_key" AS ENUM ('general_aptitude', 'company_knowledge');

CREATE TABLE "candidates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "candidate_ref" text NOT NULL UNIQUE,
  "first_name" text NOT NULL,
  "surname" text NOT NULL,
  "middle_name" text,
  "email" text NOT NULL UNIQUE,
  "phone" text NOT NULL,
  "position_applied_for" text NOT NULL,
  "department" text NOT NULL,
  "highest_qualification" text,
  "institution" text,
  "registered_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" text NOT NULL
);

CREATE TABLE "aptitude_tests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "instructions" text NOT NULL DEFAULT '',
  "duration_minutes" integer NOT NULL DEFAULT 60,
  "num_questions" integer NOT NULL DEFAULT 20,
  "total_marks" integer NOT NULL DEFAULT 100,
  "pass_mark" integer NOT NULL DEFAULT 50,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" text NOT NULL
);

CREATE TABLE "aptitude_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "test_id" uuid NOT NULL REFERENCES "aptitude_tests"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "section_key" "aptitude_section_key" NOT NULL,
  "weight_percent" integer NOT NULL DEFAULT 50,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" text NOT NULL,
  UNIQUE ("test_id", "section_key")
);

CREATE TABLE "aptitude_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "test_id" uuid NOT NULL REFERENCES "aptitude_tests"("id") ON DELETE CASCADE,
  "section_id" uuid NOT NULL REFERENCES "aptitude_sections"("id") ON DELETE CASCADE,
  "question_text" text NOT NULL,
  "marks" integer NOT NULL DEFAULT 1,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" text NOT NULL
);

CREATE TABLE "aptitude_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question_id" uuid NOT NULL REFERENCES "aptitude_questions"("id") ON DELETE CASCADE,
  "option_text" text NOT NULL,
  "is_correct" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" text NOT NULL
);

CREATE TABLE "aptitude_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "test_id" uuid NOT NULL REFERENCES "aptitude_tests"("id") ON DELETE CASCADE,
  "candidate_id" uuid NOT NULL REFERENCES "candidates"("id") ON DELETE CASCADE,
  "access_pin_hash" text,
  "pin_set_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" text NOT NULL,
  UNIQUE ("test_id", "candidate_id")
);

CREATE TABLE "aptitude_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "test_id" uuid NOT NULL REFERENCES "aptitude_tests"("id"),
  "candidate_id" uuid NOT NULL REFERENCES "candidates"("id"),
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "submitted_at" timestamp with time zone,
  "total_score" integer,
  "general_aptitude_score" integer,
  "company_knowledge_score" integer,
  "passed" boolean,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" text NOT NULL
);

CREATE TABLE "aptitude_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL REFERENCES "aptitude_attempts"("id") ON DELETE CASCADE,
  "question_id" uuid NOT NULL REFERENCES "aptitude_questions"("id"),
  "option_id" uuid NOT NULL REFERENCES "aptitude_options"("id"),
  "is_correct" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" text NOT NULL
);
