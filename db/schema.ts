import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const availability = sqliteTable("availability", {
  date: text("date").primaryKey(),
  status: text("status", { enum: ["available", "booked", "closed"] }).notNull(),
  updatedAt: text("updated_at").notNull(),
});
