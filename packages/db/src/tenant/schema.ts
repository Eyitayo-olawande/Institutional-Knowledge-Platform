import { boolean, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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

// Wording labels (Product Architecture v1, section 3): every structural
// term shown to people is a label the template sets and the organisation
// can change, so a hospital sees "ward" where an insurer sees "department".
export const wordingLabels = pgTable("wording_labels", {
  key: text("key").primaryKey(),
  singular: text("singular").notNull(),
  plural: text("plural").notNull(),
  ...auditColumns,
});

// Knowledge library (Product Architecture v1, section 5): items with
// versions, owners, review dates and a publishing workflow. Staff see the
// published version; editors work on a draft until it is published.
export const libraryItemStatus = pgEnum("library_item_status", ["draft", "published", "retired"]);

export const libraryItems = pgTable("library_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  ownerUserId: text("owner_user_id").references(() => users.id),
  reviewDate: date("review_date"),
  status: libraryItemStatus("status").notNull().default("draft"),
  publishedVersion: integer("published_version"),
  ...auditColumns,
});

export const libraryItemVersions = pgTable(
  "library_item_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => libraryItems.id),
    version: integer("version").notNull(),
    body: text("body").notNull(),
    changeNote: text("change_note"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: text("published_by"),
    ...auditColumns,
  },
  (t) => [uniqueIndex("library_item_versions_item_version_unique").on(t.itemId, t.version)],
);

// Notifications (Product Architecture v1, section 8). In app notices a
// person sees in the product, and a delivery record for every message on
// every channel, used as evidence that, for example, a change alert was sent.
export const notificationChannel = pgEnum("notification_channel", ["email", "in_app"]);
export const deliveryStatus = pgEnum("delivery_status", ["sent", "failed"]);

export const notices = pgTable(
  "notices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    event: text("event").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notices_user_idx").on(t.userId)],
);

export const deliveryRecords = pgTable(
  "delivery_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    event: text("event").notNull(),
    channel: notificationChannel("channel").notNull(),
    status: deliveryStatus("status").notNull(),
    error: text("error"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("delivery_records_user_idx").on(t.userId), index("delivery_records_event_idx").on(t.event)],
);

// Files (Product Architecture v1, section 5): stored in the tenant's own
// storage area; this table holds what is needed to find and check them.
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  storageKey: text("storage_key").notNull().unique(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  sha256: text("sha256").notNull(),
  ...auditColumns,
});

export const libraryItemFiles = pgTable(
  "library_item_files",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => libraryItems.id),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id),
    ...auditColumns,
  },
  (t) => [uniqueIndex("library_item_files_unique").on(t.itemId, t.fileId)],
);
