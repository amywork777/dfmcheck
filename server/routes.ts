import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertAnalysisSchema, type DFMReport } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { generateDesignInsights } from "./ai";

export function registerRoutes(app: Express) {
  app.post("/api/analyze", async (req, res) => {
    try {
      console.log('Starting analysis with data:', {
        fileName: req.body.fileName,
        process: req.body.process,
        hasGuidelines: !!req.body.designGuidelines
      });

      const analysis = insertAnalysisSchema.parse(req.body);

      // Ensure report matches DFMReport type
      const report = analysis.report as DFMReport;
      if (!report || !report.wallThickness || !report.overhangs || !report.holeSize || !report.draftAngles) {
        throw new Error("Invalid report structure");
      }

      // Generate AI insights considering both standard and custom guidelines
      const aiInsights = await generateDesignInsights(
        report,
        analysis.process,
        analysis.designGuidelines
      );

      // Add AI insights to the report
      analysis.report = {
        ...report,
        aiInsights
      };

      const result = await storage.createAnalysis(analysis);
      console.log('Analysis created:', result.id);
      res.json(result);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        const validationError = fromZodError(error);
        console.error('Validation error:', validationError.message);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error('Analysis error:', error);
        res.status(500).json({ error: "Failed to process analysis. Please try again." });
      }
    }
  });

  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.error('Invalid ID:', req.params.id);
        return res.status(400).json({ error: "Invalid ID" });
      }

      const analysis = await storage.getAnalysis(id);
      if (!analysis) {
        console.error('Analysis not found:', id);
        return res.status(404).json({ error: "Analysis not found" });
      }

      console.log('Analysis retrieved:', id);
      res.json(analysis);
    } catch (error) {
      console.error('Get analysis error:', error);
      res.status(500).json({ error: "Failed to retrieve analysis" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}