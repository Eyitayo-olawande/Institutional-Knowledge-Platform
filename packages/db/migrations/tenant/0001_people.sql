CREATE TYPE "public"."employment_event_type" AS ENUM('join', 'move', 'leave');--> statement-breakpoint
CREATE TYPE "public"."person_status" AS ENUM('active', 'left');--> statement-breakpoint
CREATE TABLE "employment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"type" "employment_event_type" NOT NULL,
	"from_department" text,
	"to_department" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"full_name" text NOT NULL,
	"work_email" text NOT NULL,
	"department" text,
	"manager_employee_id" text,
	"status" "person_status" DEFAULT 'active' NOT NULL,
	"user_id" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "roles" text DEFAULT 'learner' NOT NULL;--> statement-breakpoint
ALTER TABLE "employment_events" ADD CONSTRAINT "employment_events_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employment_events_person_idx" ON "employment_events" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "people_employee_id_unique" ON "people" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "people_work_email_unique" ON "people" USING btree ("work_email");