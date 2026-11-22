CREATE TABLE "item_applicability_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "item_id" uuid NOT NULL REFERENCES "public"."library_items"("id") ON DELETE CASCADE,
  "department_id" uuid REFERENCES "public"."departments"("id"),
  "role_level_id" uuid REFERENCES "public"."role_levels"("id"),
  "unit_id" uuid REFERENCES "public"."units"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" text NOT NULL DEFAULT 'migration'
);
