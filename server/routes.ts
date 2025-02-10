import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertAnalysisSchema } from "@shared/schema";

export function registerRoutes(app: Express) {
  app.post("/api/analyze", async (req, res) => {
    try {
      const analysis = insertAnalysisSchema.parse(req.body);
      const result = await storage.createAnalysis(analysis);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: "Invalid analysis data" });
    }
  });

  app.get("/api/analysis/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const analysis = await storage.getAnalysis(id);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    res.json(analysis);
  });

  const httpServer = createServer(app);
  return httpServer;
}
