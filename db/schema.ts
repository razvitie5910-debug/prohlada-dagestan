import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const availability = sqliteTable("availability", {
  date: text("date").primaryKey(),
  status: text("status", { enum: ["available", "booked", "closed"] }).notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const pricingSettings = sqliteTable("pricing_settings", {
  id: integer("id").primaryKey(),
  dayPrice: integer("day_price").notNull().default(15000),
  overnightPrice: integer("overnight_price").notNull().default(15000),
  updatedAt: text("updated_at").notNull(),
});

export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guestName: text("guest_name").notNull(),
  phone: text("phone").notNull(),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  adults: integer("adults").notNull().default(1),
  children: integer("children").notNull().default(0),
  stayType: text("stay_type", { enum: ["day", "overnight"] }).notNull().default("overnight"),
  checkinTime: text("checkin_time").notNull().default(""),
  checkoutTime: text("checkout_time").notNull().default(""),
  deposit: integer("deposit").notNull().default(0),
  total: integer("total").notNull().default(0),
  status: text("status", { enum: ["new", "confirmed", "paid", "cancelled"] }).notNull().default("new"),
  notes: text("notes").notNull().default(""),
  source: text("source", { enum: ["site", "manual", "whatsapp", "phone"] }).notNull().default("site"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_bookings_dates").on(table.checkIn, table.checkOut),
  index("idx_bookings_status_check_in").on(table.status, table.checkIn),
]);
