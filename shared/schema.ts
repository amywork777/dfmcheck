import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const manufacturingProcesses = [
  "3d_printing",
  "cnc_machining", 
  "injection_molding",
  "sheet_metal"
] as const;

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileContent: text("file_content").notNull(),
  process: text("process", {enum: manufacturingProcesses}).notNull(),
  report: jsonb("report").notNull(),
  imageContent: text("image_content"),
  imageAnalysis: jsonb("image_analysis"),
});

export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  fileName: true,
  fileContent: true,
  process: true,
  report: true,
  imageContent: true,
  imageAnalysis: true
});

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;

export type DFMReport = {
  wallThickness: {
    issues: string[];
    pass: boolean;
  };
  overhangs: {
    issues: string[];
    pass: boolean;
  };
  holeSize: {
    issues: string[];
    pass: boolean;
  };
  draftAngles: {
    issues: string[];
    pass: boolean;
  };
};

export type ImageAnalysis = {
  designConsiderations: {
    aesthetic: string[];
    ergonomics: string[];
    modularity: string[];
    safety: string[];
  };
  manufacturingConsiderations: {
    materials: string[];
    processes: string[];
    limitations: string[];
    suggestions: string[];
  };
  qualityControl: {
    testingPoints: string[];
    potentialDefects: string[];
    lifecycle: string[];
  };
};