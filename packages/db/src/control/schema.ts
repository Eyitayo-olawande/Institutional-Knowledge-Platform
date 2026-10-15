import { check, integer, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditColumns } from "../columns.ts";

// Control database (Product Architecture v1, section 6). One per platform,
// owned by Design Streams. It holds tenant records, plans, groups and
// releases, and never customer staff or learning data.
//
// Industries, templates, regulator packs, subscriptions, invoices and
// payments are added by their own work packages (E7 and E13).

export const tenantTier = pgEnum("tenant_tier", ["shared", "dedicated"]);
export const tenantStatus = pgEnum("tenant_status", ["onboarding", "active", "read_only", "suspended", "offboarded"]);

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ...auditColumns,
});

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    // Naira, in kobo, per active staff member per month (section 11).
    pricePerActiveStaffKobo: integer("price_per_active_staff_kobo"),
    staffLimit: integer("staff_limit"),
    ...auditColumns,
  },
  (t) => [uniqueIndex("plans_code_unique").on(t.code)],
);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    tier: tenantTier("tier").notNull(),
    // Lower case domain the tenant is served on; see tenant resolution.
    domain: text("domain").notNull(),
    // Where the tenant's data lives, agreed with the customer (section 9).
    hostingLocation: text("hosting_location").notNull(),
    // Name of the tenant's own database.
    databaseName: text("database_name").notNull(),
    status: tenantStatus("status").notNull().default("onboarding"),
    planId: uuid("plan_id").references(() => plans.id),
    groupId: uuid("group_id").references(() => groups.id),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex("tenants_domain_unique").on(t.domain),
    uniqueIndex("tenants_database_name_unique").on(t.databaseName),
    check("tenants_domain_lower_case", sql`${t.domain} = lower(${t.domain})`),
    check("tenants_database_name_safe", sql`${t.databaseName} ~ '^[a-z][a-z0-9_]{0,62}$'`),
  ],
);

export const releases = pgTable(
  "releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: text("version").notNull(),
    ...auditColumns,
  },
  (t) => [uniqueIndex("releases_version_unique").on(t.version)],
);

// Which release each tenant instance runs (section 12: dedicated instances
// may be at most one release behind).
export const tenantReleases = pgTable("tenant_releases", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id),
  releaseId: uuid("release_id")
    .notNull()
    .references(() => releases.id),
  ...auditColumns,
});
