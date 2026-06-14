import { pgEnum, pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["pending", "processing", "completed", "cancelled"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  balance: integer("balance").default(0).notNull(),
  referredByUserId: integer("referredByUserId"),
  referralName: varchar("referralName", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userProfiles = pgTable("userProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  location: varchar("location", { length: 255 }).notNull(),
  deliveryAddress: varchar("deliveryAddress", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

export const referralLinks = pgTable("referralLinks", {
  name: varchar("name", { length: 320 }).primaryKey(),
  type: varchar("type", { length: 32 }).default("marketing").notNull(),
  title: varchar("title", { length: 320 }),
  ownerUserId: integer("ownerUserId"),
  clicks: integer("clicks").default(0).notNull(),
  signups: integer("signups").default(0).notNull(),
  ordersBought: integer("ordersBought").default(0).notNull(),
  totalTopUp: integer("totalTopUp").default(0).notNull(),
  commissionPercent: integer("commissionPercent").default(10).notNull(),
  commissionPaid: integer("commissionPaid").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ReferralLink = typeof referralLinks.$inferSelect;
export type InsertReferralLink = typeof referralLinks.$inferInsert;

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
  message: text("message"),
  hideTime: integer("hideTime").default(0).notNull(),
  deliveryAddress: varchar("deliveryAddress", { length: 500 }).notNull(),
  referralName: varchar("referralName", { length: 320 }),
  status: statusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;