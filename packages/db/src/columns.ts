import { text, timestamp } from "drizzle-orm/pg-core";

// Rules for every table (CLAUDE.md): a creation and change timestamp and
// who made the change. In the control database the actor is a Design
// Streams staff or system identifier, never customer personal data.
export const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  changedBy: text("changed_by").notNull(),
};
