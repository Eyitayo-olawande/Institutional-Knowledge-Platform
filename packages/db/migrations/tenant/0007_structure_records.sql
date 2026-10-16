CREATE TYPE "public"."structure_kind" AS ENUM('department', 'unit', 'location', 'role_level');--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"rank" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "structure_names" (
	"kind" "structure_kind" NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"name_key" text NOT NULL,
	"entry_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employment_events" ADD COLUMN "from_department_id" uuid;--> statement-breakpoint
ALTER TABLE "employment_events" ADD COLUMN "to_department_id" uuid;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "unit_id" uuid;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "role_level_id" uuid;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "structure_names_unique" ON "structure_names" USING btree ("kind","scope","name_key");--> statement-breakpoint
CREATE INDEX "structure_names_entry_idx" ON "structure_names" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "units_department_idx" ON "units" USING btree ("department_id");--> statement-breakpoint
ALTER TABLE "employment_events" ADD CONSTRAINT "employment_events_from_department_id_departments_id_fk" FOREIGN KEY ("from_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_events" ADD CONSTRAINT "employment_events_to_department_id_departments_id_fk" FOREIGN KEY ("to_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_role_level_id_role_levels_id_fk" FOREIGN KEY ("role_level_id") REFERENCES "public"."role_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Copy the free text departments into records and link people and their
-- history to them. Names are matched as nameKey() does in structure.ts:
-- trimmed, runs of spaces made single, ignoring case.
CREATE FUNCTION pg_temp.clean_name(value text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(regexp_replace(regexp_replace(value, '^\s+|\s+$', '', 'g'), '\s+', ' ', 'g'), '')
$$;--> statement-breakpoint
-- Where spellings differ only in case, the most used one becomes the name.
INSERT INTO "departments" ("name", "changed_by")
SELECT DISTINCT ON (lower(n)) n, 'system:migration'
FROM (
  SELECT pg_temp.clean_name("department") AS n FROM "people"
  UNION ALL SELECT pg_temp.clean_name("from_department") FROM "employment_events"
  UNION ALL SELECT pg_temp.clean_name("to_department") FROM "employment_events"
) AS found
WHERE n IS NOT NULL
GROUP BY n
ORDER BY lower(n), count(*) DESC, n COLLATE "C";--> statement-breakpoint
INSERT INTO "structure_names" ("kind", "name_key", "entry_id", "changed_by")
SELECT 'department', lower("name"), "id", 'system:migration' FROM "departments";--> statement-breakpoint
INSERT INTO "activity_log" ("actor", "action", "entity_type", "entity_id", "details")
SELECT 'system:migration', 'structure.created', 'department', "id"::text, jsonb_build_object('name', "name") FROM "departments";--> statement-breakpoint
UPDATE "people" SET "department_id" = d."id"
FROM "departments" d WHERE lower(pg_temp.clean_name("people"."department")) = lower(d."name");--> statement-breakpoint
UPDATE "employment_events" SET "from_department_id" = d."id"
FROM "departments" d WHERE lower(pg_temp.clean_name("employment_events"."from_department")) = lower(d."name");--> statement-breakpoint
UPDATE "employment_events" SET "to_department_id" = d."id"
FROM "departments" d WHERE lower(pg_temp.clean_name("employment_events"."to_department")) = lower(d."name");
