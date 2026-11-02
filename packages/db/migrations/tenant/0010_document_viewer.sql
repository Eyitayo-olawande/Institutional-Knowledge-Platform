CREATE TYPE "public"."conversion_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "conversion_status" "conversion_status";--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "rendition_key" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "rendition_converted_at" timestamp with time zone;