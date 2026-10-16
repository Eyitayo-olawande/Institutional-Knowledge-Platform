CREATE TYPE "public"."learning_area_kind" AS ENUM('common', 'department');--> statement-breakpoint
CREATE TABLE "area_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area_kind" "learning_area_kind" NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"rank" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "learning_area_kind" NOT NULL,
	"department_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "library_items" ADD COLUMN "area_id" uuid;--> statement-breakpoint
ALTER TABLE "library_items" ADD COLUMN "content_type_id" uuid;--> statement-breakpoint
ALTER TABLE "library_items" ADD COLUMN "needs_area_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "area_access_grants" ADD CONSTRAINT "area_access_grants_area_id_learning_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."learning_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_access_grants" ADD CONSTRAINT "area_access_grants_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_areas" ADD CONSTRAINT "learning_areas_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "area_access_grants_unique" ON "area_access_grants" USING btree ("area_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_types_kind_key_unique" ON "content_types" USING btree ("area_kind","key");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_areas_department_unique" ON "learning_areas" USING btree ("department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_areas_one_common" ON "learning_areas" USING btree ("kind") WHERE kind = 'common';--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_area_id_learning_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."learning_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_content_type_id_content_types_id_fk" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE no action ON UPDATE no action;;--> statement-breakpoint
-- Every tenant has Common Staff Learning, one area per department and the
-- default content types (DEFAULT_CONTENT_TYPES in areas.ts; a test keeps
-- the two lists the same).
INSERT INTO "learning_areas" ("kind", "changed_by") VALUES ('common', 'system:migration');--> statement-breakpoint
INSERT INTO "learning_areas" ("kind", "department_id", "changed_by")
SELECT 'department', "id", 'system:migration' FROM "departments";--> statement-breakpoint
INSERT INTO "activity_log" ("actor", "action", "entity_type", "entity_id", "details")
SELECT 'system:migration', 'areas.created', 'learning_area', "id"::text, jsonb_build_object('kind', "kind", 'department_id', "department_id") FROM "learning_areas";--> statement-breakpoint
INSERT INTO "content_types" ("area_kind", "key", "label", "rank", "changed_by") VALUES
  ('common', 'leadership', 'Leadership and management', 1, 'system:migration'),
  ('common', 'workplace_skills', 'Organisational and workplace skills', 2, 'system:migration'),
  ('common', 'communication', 'Communication and business etiquette', 3, 'system:migration'),
  ('common', 'culture', 'Company history, culture and core values', 4, 'system:migration'),
  ('common', 'customer_service', 'Customer service', 5, 'system:migration'),
  ('common', 'performance', 'Performance management', 6, 'system:migration'),
  ('common', 'compliance', 'Regulatory and compliance, including AML/CFT', 7, 'system:migration'),
  ('common', 'security', 'Information and cybersecurity awareness', 8, 'system:migration'),
  ('common', 'mandatory', 'Health, safety and other mandatory training', 9, 'system:migration'),
  ('common', 'other', 'Other organisation wide materials', 10, 'system:migration'),
  ('department', 'procedures', 'Policies and procedures', 1, 'system:migration'),
  ('department', 'manuals', 'Manuals and guides', 2, 'system:migration'),
  ('department', 'reference', 'Technical and reference materials', 3, 'system:migration'),
  ('department', 'training', 'Training materials', 4, 'system:migration'),
  ('department', 'other', 'Other department resources', 5, 'system:migration');--> statement-breakpoint
-- Existing items go to Common Staff Learning as "other", flagged so
-- content owners review where they belong.
UPDATE "library_items" SET
  "area_id" = (SELECT "id" FROM "learning_areas" WHERE "kind" = 'common'),
  "content_type_id" = (SELECT "id" FROM "content_types" WHERE "area_kind" = 'common' AND "key" = 'other'),
  "needs_area_review" = true;--> statement-breakpoint
ALTER TABLE "library_items" ALTER COLUMN "area_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "library_items" ALTER COLUMN "content_type_id" SET NOT NULL;
