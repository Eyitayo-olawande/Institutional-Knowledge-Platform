CREATE TABLE "wording_labels" (
	"key" text PRIMARY KEY NOT NULL,
	"singular" text NOT NULL,
	"plural" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL
);
