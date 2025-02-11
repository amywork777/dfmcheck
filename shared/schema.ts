import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const manufacturingProcesses = [
  "3d_printing",
  "cnc_machining", 
  "injection_molding",
  "sheet_metal"
] as const;

// Material recommendations based on manufacturing process
export const processBasedMaterials = {
  '3d_printing': ['PLA', 'PETG', 'ABS', 'TPU', 'Nylon'],
  'cnc_machining': ['Aluminum 6061', 'Brass', 'Steel 1018', 'Stainless Steel 304', 'PEEK'],
  'injection_molding': ['ABS', 'Polypropylene', 'Polyethylene', 'Polycarbonate', 'Nylon'],
  'sheet_metal': ['Aluminum', 'Steel', 'Stainless Steel', 'Copper', 'Brass']
} as const;

export type MaterialCost = {
  materialName: string;
  costPerUnit: number;  // Cost per kg or per sheet
  minimumOrder: number; // Minimum order quantity
  leadTime: string;     // Estimated lead time
};

export type CostEstimate = {
  materialCost: number;
  laborCost: number;
  setupCost: number;
  totalCost: number;
  volumeDiscounts: Array<{
    quantity: number;
    discountPercentage: number;
    pricePerUnit: number;
  }>;
};

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
  materialRecommendations: {
    recommended: string[];
    notRecommended: string[];
    reasoning: string;
  };
  costEstimate: CostEstimate;
};

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileContent: text("file_content").notNull(),
  process: text("process", {enum: manufacturingProcesses}).notNull(),
  report: jsonb("report").notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  fileName: true,
  fileContent: true,
  process: true,
  report: true
});

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;