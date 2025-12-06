import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  pgEnum,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const goalStatusEnum = pgEnum("goal_status", ["active", "completed"]);

export const goals = pgTable("goals", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  iconKey: text("icon_key").notNull().default("target"),
  iconColor: text("icon_color").notNull().default("#3B82F6"),
  iconBgColor: text("icon_bg_color").notNull().default("#E0E7FF"),
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: goalStatusEnum("status").notNull().default("active"),
  isPrimary: boolean("is_primary").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const updateGoalSchema = createInsertSchema(goals).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type UpdateGoal = z.infer<typeof updateGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export const operationTypeEnum = pgEnum("operation_type", ["returns", "receiving"]);
export const shiftTypeEnum = pgEnum("shift_type", ["day", "night"]);
export const shiftStatusEnum = pgEnum("shift_status", [
  "scheduled",
  "in_progress",
  "completed",
  "canceled",
  "no_show",
]);

export const shifts = pgTable("shifts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  operationType: operationTypeEnum("operation_type").notNull(),
  shiftType: shiftTypeEnum("shift_type").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  status: shiftStatusEnum("status").notNull().default("scheduled"),
  earnings: decimal("earnings", { precision: 12, scale: 2 }),
  earningsRecordedAt: timestamp("earnings_recorded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  earningsRecordedAt: true,
});

export const updateShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type UpdateShift = z.infer<typeof updateShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

export const goalAllocations = pgTable("goal_allocations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id")
    .references(() => shifts.id)
    .notNull(),
  goalId: varchar("goal_id")
    .references(() => goals.id)
    .notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGoalAllocationSchema = createInsertSchema(goalAllocations).omit({
  id: true,
  createdAt: true,
});

export type InsertGoalAllocation = z.infer<typeof insertGoalAllocationSchema>;
export type GoalAllocation = typeof goalAllocations.$inferSelect;

export const recordEarningsSchema = z.object({
  shiftId: z.string(),
  totalEarnings: z.string(),
  allocations: z.array(
    z.object({
      goalId: z.string(),
      amount: z.string(),
    })
  ),
});

export type RecordEarningsInput = z.infer<typeof recordEarningsSchema>;
