import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { insertGoalSchema, updateGoalSchema, insertShiftSchema, recordEarningsSchema } from "@shared/schema";
import { z } from "zod";

const DEFAULT_USER_ID = "default-user";

async function ensureDefaultUser() {
  let user = await storage.getUser(DEFAULT_USER_ID);
  if (!user) {
    user = await storage.getUserByUsername("default");
    if (!user) {
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      await db.insert(users).values({
        id: DEFAULT_USER_ID,
        username: "default",
        password: "default",
        balance: "0",
      }).onConflictDoNothing();
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await ensureDefaultUser();

  app.get("/api/user", async (_req: Request, res: Response) => {
    try {
      const user = await storage.getUser(DEFAULT_USER_ID);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.get("/api/goals", async (_req: Request, res: Response) => {
    try {
      const goals = await storage.getGoals(DEFAULT_USER_ID);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get goals" });
    }
  });

  app.get("/api/goals/summary", async (_req: Request, res: Response) => {
    try {
      const summary = await storage.getGoalsSummary(DEFAULT_USER_ID);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to get goals summary" });
    }
  });

  app.get("/api/goals/:id", async (req: Request, res: Response) => {
    try {
      const goal = await storage.getGoal(req.params.id);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      res.json(goal);
    } catch (error) {
      res.status(500).json({ message: "Failed to get goal" });
    }
  });

  app.post("/api/goals", async (req: Request, res: Response) => {
    try {
      const data = insertGoalSchema.parse({ ...req.body, userId: DEFAULT_USER_ID });
      const goal = await storage.createGoal(data);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

  app.put("/api/goals/:id", async (req: Request, res: Response) => {
    try {
      const data = updateGoalSchema.parse(req.body);
      const goal = await storage.updateGoal(req.params.id, data);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update goal" });
    }
  });

  app.delete("/api/goals/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteGoal(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Goal not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  app.post("/api/goals/reorder", async (req: Request, res: Response) => {
    try {
      const { goalIds } = req.body as { goalIds: string[] };
      if (!Array.isArray(goalIds)) {
        return res.status(400).json({ message: "goalIds must be an array" });
      }
      await storage.reorderGoals(DEFAULT_USER_ID, goalIds);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder goals" });
    }
  });

  app.post("/api/goals/:id/primary", async (req: Request, res: Response) => {
    try {
      await storage.setPrimaryGoal(DEFAULT_USER_ID, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to set primary goal" });
    }
  });

  app.get("/api/shifts", async (_req: Request, res: Response) => {
    try {
      const shifts = await storage.getShifts(DEFAULT_USER_ID);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get shifts" });
    }
  });

  app.get("/api/shifts/summary", async (_req: Request, res: Response) => {
    try {
      const summary = await storage.getShiftsSummary(DEFAULT_USER_ID);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to get shifts summary" });
    }
  });

  app.get("/api/shifts/:id", async (req: Request, res: Response) => {
    try {
      const shift = await storage.getShift(req.params.id);
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      res.json(shift);
    } catch (error) {
      res.status(500).json({ message: "Failed to get shift" });
    }
  });

  app.post("/api/shifts", async (req: Request, res: Response) => {
    try {
      const { operationType, shiftType, scheduledDate } = req.body;
      
      const date = new Date(scheduledDate);
      
      const hasConflict = await storage.checkShiftConflict(
        DEFAULT_USER_ID,
        date,
        shiftType
      );
      
      if (hasConflict) {
        return res.status(400).json({ 
          message: "Смена на этот день и время уже существует" 
        });
      }

      let scheduledStart: Date;
      let scheduledEnd: Date;
      
      if (shiftType === "day") {
        scheduledStart = new Date(date);
        scheduledStart.setHours(8, 0, 0, 0);
        scheduledEnd = new Date(date);
        scheduledEnd.setHours(20, 0, 0, 0);
      } else {
        scheduledStart = new Date(date);
        scheduledStart.setHours(20, 0, 0, 0);
        scheduledEnd = new Date(date);
        scheduledEnd.setDate(scheduledEnd.getDate() + 1);
        scheduledEnd.setHours(8, 0, 0, 0);
      }

      const now = new Date();
      const status = scheduledStart <= now && now < scheduledEnd ? "in_progress" : "scheduled";

      const data = insertShiftSchema.parse({
        userId: DEFAULT_USER_ID,
        operationType,
        shiftType,
        scheduledDate: date,
        scheduledStart,
        scheduledEnd,
        status,
      });

      const shift = await storage.createShift(data);
      res.status(201).json(shift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Shift creation error:", error);
      res.status(500).json({ message: "Failed to create shift" });
    }
  });

  app.post("/api/shifts/:id/cancel", async (req: Request, res: Response) => {
    try {
      const shift = await storage.cancelShift(req.params.id);
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      res.json(shift);
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel shift" });
    }
  });

  app.post("/api/shifts/:id/no-show", async (req: Request, res: Response) => {
    try {
      const shift = await storage.markNoShow(req.params.id);
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      res.json(shift);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark no show" });
    }
  });

  app.post("/api/shifts/:id/earnings", async (req: Request, res: Response) => {
    try {
      const { totalEarnings, allocations } = req.body;
      
      const shift = await storage.recordEarnings(
        req.params.id,
        totalEarnings,
        allocations || []
      );
      
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      res.json(shift);
    } catch (error) {
      console.error("Record earnings error:", error);
      res.status(500).json({ message: "Failed to record earnings" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
