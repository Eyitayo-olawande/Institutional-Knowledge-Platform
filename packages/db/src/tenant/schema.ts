import { sql } from "drizzle-orm";
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

// Organisation structure (Product Architecture v1.1, sections 4 and 7):
// departments, units, locations and role levels as records that people link
// to. Names are matched ignoring case and extra spaces through
// structure_names, which also keeps old and merged names so a later staff
// file using them still lands on the right entry.
export const structureKind = pgEnum("structure_kind", ["department", "unit", "location", "role_level"]);

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ...auditColumns,
});

export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id),
    name: text("name").notNull(),
    ...auditColumns,
  },
  (t) => [index("units_department_idx").on(t.departmentId)],
);

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ...auditColumns,
});

// Rank orders levels from junior (1) upwards, so a path can say "this level
// and above".
export const roleLevels = pgTable("role_levels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  rank: integer("rank").notNull(),
  ...auditColumns,
});

// Every name an entry answers to. Units are named within their department
// (scope is the department id); the other kinds use an empty scope.
export const structureNames = pgTable(
  "structure_names",
  {
    kind: structureKind("kind").notNull(),
    scope: text("scope").notNull().default(""),
    nameKey: text("name_key").notNull(),
    entryId: uuid("entry_id").notNull(),
    ...auditColumns,
  },
  (t) => [uniqueIndex("structure_names_unique").on(t.kind, t.scope, t.nameKey), index("structure_names_entry_idx").on(t.entryId)],
);

export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: text("employee_id").notNull(),
    fullName: text("full_name").notNull(),
    workEmail: text("work_email").notNull(),
    // Free text from the staff file; replaced by departmentId and removed in
    // a later work package.
    department: text("department"),
    departmentId: uuid("department_id").references(() => departments.id),
    unitId: uuid("unit_id").references(() => units.id),
    locationId: uuid("location_id").references(() => locations.id),
    roleLevelId: uuid("role_level_id").references(() => roleLevels.id),
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
    fromDepartmentId: uuid("from_department_id").references(() => departments.id),
    toDepartmentId: uuid("to_department_id").references(() => departments.id),
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

// Learning areas (Blueprint v3.1, section 3): Common Staff Learning, seen
// by all staff, and one Department Learning area per department, seen by
// that department's staff and anyone granted access. Every library item
// sits in exactly one area, so nothing is copied between departments.
export const learningAreaKind = pgEnum("learning_area_kind", ["common", "department"]);

export const learningAreas = pgTable(
  "learning_areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: learningAreaKind("kind").notNull(),
    departmentId: uuid("department_id").references(() => departments.id),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex("learning_areas_department_unique").on(t.departmentId),
    uniqueIndex("learning_areas_one_common").on(t.kind).where(sql`kind = 'common'`),
  ],
);

// Content types per kind of area. Set by the industry template (E7); the
// defaults are loaded by the migration.
export const contentTypes = pgTable(
  "content_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    areaKind: learningAreaKind("area_kind").notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    rank: integer("rank").notNull(),
    ...auditColumns,
  },
  (t) => [uniqueIndex("content_types_kind_key_unique").on(t.areaKind, t.key)],
);

// Access to a department's area for someone outside it. Group grants
// arrive with groups (E4 groups).
export const areaAccessGrants = pgTable(
  "area_access_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    areaId: uuid("area_id")
      .notNull()
      .references(() => learningAreas.id),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id),
    ...auditColumns,
  },
  (t) => [uniqueIndex("area_access_grants_unique").on(t.areaId, t.personId)],
);

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
  areaId: uuid("area_id")
    .notNull()
    .references(() => learningAreas.id),
  contentTypeId: uuid("content_type_id")
    .notNull()
    .references(() => contentTypes.id),
  // Set on items the migration placed in Common Staff Learning, until a
  // content owner confirms or moves them.
  needsAreaReview: boolean("needs_area_review").notNull().default(false),
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
//
// Staff view a file in Mantle rather than downloading it (ADR 0021). A PDF,
// PNG, JPG or MP4 needs no conversion and is viewed from the original, so
// conversionStatus stays null. A DOCX, PPTX or XLSX is converted to PDF on
// upload; conversionStatus and renditionKey track that converted copy. The
// original is always kept, for a content owner to re-edit it.
export const conversionStatus = pgEnum("conversion_status", ["pending", "ready", "failed"]);

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  storageKey: text("storage_key").notNull().unique(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  sha256: text("sha256").notNull(),
  conversionStatus: conversionStatus("conversion_status"),
  renditionKey: text("rendition_key"),
  renditionConvertedAt: timestamp("rendition_converted_at", { withTimezone: true }),
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

// Learning paths (work package E8). A path has four fixed stages; each
// stage holds modules; a module points at one or more library items and
// never copies them, so editing an item changes every path that uses it.
export const pathStageKind = pgEnum("path_stage_kind", ["common", "department", "role", "certificate"]);

export const paths = pgTable("paths", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // The department that owns and built this path; null for a company wide path.
  departmentId: uuid("department_id").references(() => departments.id),
  ...auditColumns,
});

export const pathStages = pgTable(
  "path_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pathId: uuid("path_id")
      .notNull()
      .references(() => paths.id),
    kind: pathStageKind("kind").notNull(),
    // Days from the person's assignment start date; defaults 14/42/70/90.
    dueDays: integer("due_days").notNull(),
    ...auditColumns,
  },
  (t) => [uniqueIndex("path_stages_path_kind_unique").on(t.pathId, t.kind)],
);

// A module is a reusable building block: the same module can sit in more
// than one path's stage, and a person completes it once for all of them.
export const modules = pgTable("modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  ...auditColumns,
});

export const moduleItems = pgTable(
  "module_items",
  {
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => libraryItems.id),
    rank: integer("rank").notNull(),
    ...auditColumns,
  },
  (t) => [uniqueIndex("module_items_unique").on(t.moduleId, t.itemId)],
);

export const stageModules = pgTable(
  "stage_modules",
  {
    stageId: uuid("stage_id")
      .notNull()
      .references(() => pathStages.id),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id),
    rank: integer("rank").notNull(),
    ...auditColumns,
  },
  (t) => [uniqueIndex("stage_modules_unique").on(t.stageId, t.moduleId)],
);

// Who gets a path automatically on joining (E4 groups adds manual
// enrolment later). unitId is optional, narrowing department and role.
export const assignmentRules = pgTable("assignment_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  pathId: uuid("path_id")
    .notNull()
    .references(() => paths.id),
  departmentId: uuid("department_id").references(() => departments.id),
  roleLevelId: uuid("role_level_id").references(() => roleLevels.id),
  unitId: uuid("unit_id").references(() => units.id),
  ...auditColumns,
});

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pathId: uuid("path_id")
      .notNull()
      .references(() => paths.id),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id),
    // Due dates are startDate + each stage's dueDays, not stored directly.
    startDate: date("start_date").notNull(),
    ...auditColumns,
  },
  (t) => [uniqueIndex("assignments_path_person_unique").on(t.pathId, t.personId)],
);

// One row per person per module, so completing a module shared by several
// paths counts in all of them (Behaviour, E8 paths spec).
export const moduleProgress = pgTable(
  "module_progress",
  {
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...auditColumns,
  },
  (t) => [uniqueIndex("module_progress_unique").on(t.personId, t.moduleId)],
);
