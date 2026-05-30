import { pgEnum, pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["pending", "processing", "completed", "cancelled"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User profiles table - stores onboarding/profile information
 */
export const userProfiles = pgTable("userProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  location: varchar("location", { length: 255 }).notNull(), // Tashkent
  deliveryAddress: varchar("deliveryAddress", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Orders table - stores all order submissions
 */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  location: varchar("location", { length: 255 }).notNull(),
  day: integer("day").notNull(),
  month: varchar("month", { length: 20 }).notNull(),
  year: integer("year").notNull(),
  hour: integer("hour").notNull(),
  minute: integer("minute").notNull(),
  mainTitle: varchar("mainTitle", { length: 255 }).notNull(),
  line1: varchar("line1", { length: 255 }).notNull(),
  line2: varchar("line2", { length: 255 }).notNull(),
  message: text("message"), // Optional
  hideTime: integer("hideTime").default(0).notNull(), // 0 = false, 1 = true
  deliveryAddress: varchar("deliveryAddress", { length: 500 }).notNull(),
  status: statusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;