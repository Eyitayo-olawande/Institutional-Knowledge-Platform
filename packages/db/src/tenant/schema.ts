import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns } from "../columns.ts";

// Tenant database (Product Architecture v1, section 6). One per customer;
// all personal data lives here and nowhere else.
//
// Sign in tables follow Better Auth's core schema (ADR 0019). They are
// written by the sign in library itself, so they carry its own timestamps
// rather than the changed_by column; sign in events reach the activity log
// once it exists (E2).

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Role names, comma separated, for example "learner,learning_administrator".
  // Full roles and scopes arrive with the identity epic (E3).
  roles: text("roles").notNull().default("learner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// People and organisation (Product Architecture v1, section 5). A person is
// a member of staff known to the organisation; signing in is separate and
// linked through userId.
export const personStatus = pgEnum("person_status", ["active", "left"]);
export const employmentEventType = pgEnum("employment_event_type", ["join", "move", "leave"]);

export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: text("employee_id").notNull(),
    fullName: text("full_name").notNull(),
    workEmail: text("work_email").notNull(),
    department: text("department"),
    managerEmployeeId: text("manager_employee_id"),
    status: personStatus("status").notNull().default("active"),
    userId: text("user_id").references(() => users.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    ...auditColumns,
  },
  (t) => [uniqueIndex("people_employee_id_unique").on(t.employeeId), uniqueIndex("people_work_email_unique").on(t.workEmail)],
);

// Joiners, movers and leavers drive everything (section 5): later work
// packages react to these events (paths, handover packs).
export const employmentEvents = pgTable(
  "employment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id),
    type: employmentEventType("type").notNull(),
    // For a move: the department before and after.
    fromDepartment: text("from_department"),
    toDepartment: text("to_department"),
    ...auditColumns,
  },
  (t) => [index("employment_events_person_idx").on(t.personId)],
);

// Activity log (Product Architecture v1, section 5): an append only record
// of every change and result. Updates and deletes are refused by the
// database itself (see the migration). Retention (E14) will archive rows
// through a separate, audited path.
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    // Who: a user id ("user:<id>"), a Design Streams actor, or "system:<job>".
    actor: text("actor").notNull(),
    // What happened, as a dotted name, for example "people.joined".
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    // Field names and before/after values where useful.
    details: jsonb("details").$type<Record<string, unknown>>(),
  },
  (t) => [index("activity_log_entity_idx").on(t.entityType, t.entityId), index("activity_log_at_idx").on(t.at)],
);
