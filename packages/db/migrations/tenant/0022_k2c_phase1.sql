ALTER TYPE "public"."employment_event_type" ADD VALUE 'role_change';--> statement-breakpoint
ALTER TABLE "employment_events" ADD COLUMN "from_role_level_id" uuid REFERENCES "public"."role_levels"("id");--> statement-breakpoint
ALTER TABLE "employment_events" ADD COLUMN "to_role_level_id" uuid REFERENCES "public"."role_levels"("id");--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "superseded_at" timestamp with time zone;
