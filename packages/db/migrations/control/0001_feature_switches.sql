CREATE TABLE "feature_switches" (
	"tenant_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL,
	CONSTRAINT "feature_switches_tenant_id_feature_pk" PRIMARY KEY("tenant_id","feature")
);
--> statement-breakpoint
ALTER TABLE "feature_switches" ADD CONSTRAINT "feature_switches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;