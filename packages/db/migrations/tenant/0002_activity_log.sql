CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE INDEX "activity_log_entity_idx" ON "activity_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_log_at_idx" ON "activity_log" USING btree ("at");--> statement-breakpoint
CREATE FUNCTION activity_log_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'activity_log is append only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER activity_log_no_update_or_delete BEFORE UPDATE OR DELETE ON "activity_log" FOR EACH ROW EXECUTE FUNCTION activity_log_append_only();
