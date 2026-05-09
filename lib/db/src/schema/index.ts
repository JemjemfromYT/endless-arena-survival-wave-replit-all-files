import { pgTable, text, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  pin: text("pin").notNull(),
  sp: integer("sp").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const heroUnlocksTable = pgTable(
  "hero_unlocks",
  {
    id: serial("id").primaryKey(),
    profileName: text("profile_name")
      .notNull()
      .references(() => profilesTable.name),
    heroId: text("hero_id").notNull(),
    unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  },
  (t) => [unique("hero_unlocks_uniq").on(t.profileName, t.heroId)],
);

export const pendingPaymentsTable = pgTable("pending_payments", {
  id: serial("id").primaryKey(),
  profileName: text("profile_name").notNull(),
  heroId: text("hero_id").notNull(),
  paymongoLinkId: text("paymongo_link_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const leaderboardTable = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hero: text("hero").notNull(),
  score: integer("score").notNull().default(0),
  wave: integer("wave").notNull().default(0),
  mode: text("mode").notNull().default("single"),
  time: text("time").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Profile = typeof profilesTable.$inferSelect;
export type HeroUnlock = typeof heroUnlocksTable.$inferSelect;
export type PendingPayment = typeof pendingPaymentsTable.$inferSelect;
export type LeaderboardEntry = typeof leaderboardTable.$inferSelect;
