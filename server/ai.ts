import type { DFMReport } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateDesignInsights(
  report: DFMReport,
  process: string,
  designGuidelines?: string
) {
  try {
    const customGuidelines = designGuidelines ? `\nCustom Guidelines:\n${designGuidelines}` : '';

    const prompt = `As a DFM expert, analyze this manufacturing report and provide detailed geometric modifications. Focus on:

1. Brief Status (2-3 lines)
- Critical violations overview
- Most urgent changes needed

2. Geometric Modifications (Main focus)
- Exact dimensions and tolerances needed
- Specific locations requiring changes
- Step-by-step modification instructions
- Manufacturing implications
- Cost impact analysis

Process: ${process}
Custom Guidelines: ${customGuidelines}
Report Data: ${JSON.stringify(report, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "user",
        content: prompt
      }],
      temperature: 0.7,
      max_tokens: 1000
    });

    return completion.choices[0].message.content || "Failed to generate insights";
  } catch (error) {
    console.error('Failed to generate insights:', error);
    throw new Error('Failed to generate AI insights');
  }
}