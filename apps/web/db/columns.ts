import { text, timestamp } from "drizzle-orm/pg-core";

/**
 * Full audit trail fields for primary application tables.
 * Spread into pgTable column definitions: { ...auditFields }
 */
export const auditFields = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text("created_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
  updatedBy: text("updated_by").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: text("deleted_by"),
};

/**
 * Lightweight timestamps for junction/linking tables.
 * Spread: { ...timestamps }
 */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
};
