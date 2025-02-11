import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertAnalysisSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export function registerRoutes(app: Express) {
  app.post("/api/analyze", async (req, res) => {
    try {
      const analysis = insertAnalysisSchema.parse(req.body);
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

  app.post("/api/parse-pdf", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: "Invalid file type. Please upload a PDF file" });
      }

      try {
        // Dynamically import pdf-parse
        const pdfParse = await import('pdf-parse');
        const data = await pdfParse.default(req.file.buffer);

        // Extract text and format it as guidelines
        const text = data.text
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .join('\n');

        if (!text.trim()) {
          return res.status(400).json({ error: "No text could be extracted from the PDF" });
        }

        res.json({ text });
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        res.status(400).json({ error: "Invalid PDF format or corrupted file" });
      }
    } catch (error) {
      console.error('PDF parsing error:', error);
      res.status(500).json({ error: "Failed to parse PDF file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}