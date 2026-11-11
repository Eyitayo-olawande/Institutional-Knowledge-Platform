CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"path_id" uuid NOT NULL,
	"stage_kind" "path_stage_kind" NOT NULL,
	"module_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL,
	CONSTRAINT "certificates_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_path_id_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_person_path_stage_unique" ON "certificates" USING btree ("person_id","path_id","stage_kind");--> statement-breakpoint
CREATE INDEX "certificates_reference_idx" ON "certificates" USING btree ("reference");
