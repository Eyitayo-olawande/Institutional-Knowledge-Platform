CREATE TYPE "public"."delivery_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TABLE "delivery_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "delivery_status" NOT NULL,
	"error" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_records_user_idx" ON "delivery_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "delivery_records_event_idx" ON "delivery_records" USING btree ("event");--> statement-breakpoint
CREATE INDEX "notices_user_idx" ON "notices" USING btree ("user_id");