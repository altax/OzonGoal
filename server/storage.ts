import { eq, and, desc, asc, sql, gte, lt, ne } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  goals,
  shifts,
  goalAllocations,
  type User,
  type InsertUser,
  type Goal,
  type InsertGoal,
  type UpdateGoal,
  type Shift,
  type InsertShift,
  type UpdateShift,
  type GoalAllocation,
  type InsertGoalAllocation,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: string, amount: string): Promise<User | undefined>;
  
  getGoals(userId: string): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, goal: UpdateGoal): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<boolean>;
  reorderGoals(userId: string, goalIds: string[]): Promise<void>;
  setPrimaryGoal(userId: string, goalId: string): Promise<void>;
  getGoalsSummary(userId: string): Promise<{ count: number; totalTarget: number; totalCurrent: number }>;
  
  getShifts(userId: string): Promise<Shift[]>;
  getShift(id: string): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: string, shift: UpdateShift): Promise<Shift | undefined>;
  cancelShift(id: string): Promise<Shift | undefined>;
  markNoShow(id: string): Promise<Shift | undefined>;
  recordEarnings(shiftId: string, earnings: string, allocations: { goalId: string; amount: string }[]): Promise<Shift | undefined>;
  checkShiftConflict(userId: string, date: Date, shiftType: "day" | "night", excludeId?: string): Promise<boolean>;
  getShiftsSummary(userId: string): Promise<{ past: number; scheduled: number; current: Shift | null }>;
  
  getAllocationsForShift(shiftId: string): Promise<GoalAllocation[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserBalance(userId: string, amount: string): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ balance: sql`${users.balance}::numeric + ${amount}::numeric` })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.isPrimary), asc(goals.orderIndex), desc(goals.createdAt));
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    const result = await db.select().from(goals).where(eq(goals.id, id));
    return result[0];
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const maxOrder = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${goals.orderIndex}), 0)` })
      .from(goals)
      .where(eq(goals.userId, goal.userId as string));
    
    const result = await db
      .insert(goals)
      .values({ ...goal, orderIndex: (maxOrder[0]?.maxOrder || 0) + 1 })
      .returning();
    return result[0];
  }

  async updateGoal(id: string, goal: UpdateGoal): Promise<Goal | undefined> {
    const updateData: UpdateGoal & { updatedAt: Date; completedAt?: Date } = {
      ...goal,
      updatedAt: new Date(),
    };

    if (goal.status === "completed") {
      updateData.completedAt = new Date();
    }

    const result = await db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, id))
      .returning();
    return result[0];
  }

  async deleteGoal(id: string): Promise<boolean> {
    const result = await db.delete(goals).where(eq(goals.id, id)).returning();
    return result.length > 0;
  }

  async reorderGoals(userId: string, goalIds: string[]): Promise<void> {
    for (let i = 0; i < goalIds.length; i++) {
      await db
        .update(goals)
        .set({ orderIndex: i, updatedAt: new Date() })
        .where(and(eq(goals.id, goalIds[i]), eq(goals.userId, userId)));
    }
  }

  async setPrimaryGoal(userId: string, goalId: string): Promise<void> {
    await db
      .update(goals)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(goals.userId, userId));
    
    await db
      .update(goals)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  }

  async getGoalsSummary(userId: string): Promise<{ count: number; totalTarget: number; totalCurrent: number }> {
    const result = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        totalTarget: sql<number>`COALESCE(SUM(${goals.targetAmount}::numeric), 0)::float`,
        totalCurrent: sql<number>`COALESCE(SUM(${goals.currentAmount}::numeric), 0)::float`,
      })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, "active")));
    
    return result[0] || { count: 0, totalTarget: 0, totalCurrent: 0 };
  }

  async getShifts(userId: string): Promise<Shift[]> {
    return await db
      .select()
      .from(shifts)
      .where(eq(shifts.userId, userId))
      .orderBy(desc(shifts.scheduledStart));
  }

  async getShift(id: string): Promise<Shift | undefined> {
    const result = await db.select().from(shifts).where(eq(shifts.id, id));
    return result[0];
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const result = await db.insert(shifts).values(shift).returning();
    return result[0];
  }

  async updateShift(id: string, shift: UpdateShift): Promise<Shift | undefined> {
    const result = await db
      .update(shifts)
      .set({ ...shift, updatedAt: new Date() })
      .where(eq(shifts.id, id))
      .returning();
    return result[0];
  }

  async cancelShift(id: string): Promise<Shift | undefined> {
    const result = await db
      .update(shifts)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(shifts.id, id))
      .returning();
    return result[0];
  }

  async markNoShow(id: string): Promise<Shift | undefined> {
    const result = await db
      .update(shifts)
      .set({ status: "no_show", updatedAt: new Date() })
      .where(eq(shifts.id, id))
      .returning();
    return result[0];
  }

  async recordEarnings(
    shiftId: string,
    earnings: string,
    allocations: { goalId: string; amount: string }[]
  ): Promise<Shift | undefined> {
    const shift = await this.getShift(shiftId);
    if (!shift) return undefined;

    const shiftResult = await db
      .update(shifts)
      .set({
        status: "completed",
        earnings,
        earningsRecordedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shifts.id, shiftId))
      .returning();

    let totalAllocated = 0;
    for (const allocation of allocations) {
      await db.insert(goalAllocations).values({
        shiftId,
        goalId: allocation.goalId,
        amount: allocation.amount,
      });

      await db
        .update(goals)
        .set({
          currentAmount: sql`${goals.currentAmount}::numeric + ${allocation.amount}::numeric`,
          updatedAt: new Date(),
        })
        .where(eq(goals.id, allocation.goalId));

      totalAllocated += parseFloat(allocation.amount);

      const goal = await this.getGoal(allocation.goalId);
      if (goal && parseFloat(goal.currentAmount) >= parseFloat(goal.targetAmount)) {
        await db
          .update(goals)
          .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
          .where(eq(goals.id, allocation.goalId));
      }
    }

    const remainder = parseFloat(earnings) - totalAllocated;
    if (remainder > 0 && shift.userId) {
      await this.updateUserBalance(shift.userId, remainder.toString());
    }

    return shiftResult[0];
  }

  async checkShiftConflict(
    userId: string,
    date: Date,
    shiftType: "day" | "night",
    excludeId?: string
  ): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const conditions = [
      eq(shifts.userId, userId),
      eq(shifts.shiftType, shiftType),
      gte(shifts.scheduledDate, startOfDay),
      lt(shifts.scheduledDate, endOfDay),
      ne(shifts.status, "canceled"),
    ];

    if (excludeId) {
      conditions.push(ne(shifts.id, excludeId));
    }

    const result = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(shifts)
      .where(and(...conditions));

    return (result[0]?.count || 0) > 0;
  }

  async getShiftsSummary(userId: string): Promise<{ past: number; scheduled: number; current: Shift | null }> {
    const now = new Date();

    const pastResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(shifts)
      .where(
        and(
          eq(shifts.userId, userId),
          eq(shifts.status, "completed")
        )
      );

    const scheduledResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(shifts)
      .where(
        and(
          eq(shifts.userId, userId),
          eq(shifts.status, "scheduled"),
          gte(shifts.scheduledStart, now)
        )
      );

    const currentResult = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.userId, userId),
          eq(shifts.status, "in_progress")
        )
      )
      .limit(1);

    return {
      past: pastResult[0]?.count || 0,
      scheduled: scheduledResult[0]?.count || 0,
      current: currentResult[0] || null,
    };
  }

  async getAllocationsForShift(shiftId: string): Promise<GoalAllocation[]> {
    return await db
      .select()
      .from(goalAllocations)
      .where(eq(goalAllocations.shiftId, shiftId));
  }
}

export const storage = new DatabaseStorage();
