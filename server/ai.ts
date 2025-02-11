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

    const prompt = `As a DFM expert, analyze this manufacturing report and provide detailed geometric modifications. Review both standard manufacturing requirements and any custom design guidelines provided. Structure your response as follows:

1. Brief Status (2-3 lines)
- Overview of critical violations
- Most urgent modifications needed
- Custom guidelines compliance status

2. Required Modifications:
For each issue found, provide:

WHAT TO CHANGE:
- Exact geometric modifications needed
- Specific dimensions and tolerances
- Required feature additions/modifications

WHERE TO APPLY:
- Precise locations requiring changes
- Affected features and regions
- Key measurement points

WHY THESE CHANGES:
- Manufacturing process requirements
- Impact on part quality
- Custom guideline compliance
- Structural considerations

HOW TO IMPLEMENT:
- Step-by-step modification instructions
- Feature creation/modification sequence
- Verification steps

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