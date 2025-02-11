import OpenAI from "openai";
import { DFMReport } from "@shared/schema";

if (!process.env.OPENAI_API_KEY) {
  console.warn("Warning: OPENAI_API_KEY is not set. AI insights will be disabled.");
}

const openai = new OpenAI();

export async function generateDesignInsights(
  report: DFMReport,
  process: string,
  designGuidelines?: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return "AI insights are currently disabled. Please configure OpenAI API key to enable this feature.";
  }

  const standardGuidelinesStatus = [
    `Wall Thickness: ${report.wallThickness.pass ? 'Passed' : `Failed with ${report.wallThickness.issues.length} issues`}`,
    `Overhangs: ${report.overhangs.pass ? 'Passed' : `Failed with ${report.overhangs.issues.length} issues`}`,
    `Material Recommendations: ${report.materialRecommendations.recommended.join(', ')}`
  ].join('\n');

  const customGuidelinesStatus = designGuidelines 
    ? `Custom Guidelines:\n${report.customGuidelines?.validations.map(v => 
        `- ${v.rule}: ${v.pass ? 'Passed' : 'Failed'}${v.details ? ` (${v.details})` : ''}`
      ).join('\n')}`
    : 'No custom guidelines provided';

  const prompt = `As a Design for Manufacturing (DFM) expert, analyze the following manufacturing report and provide comprehensive design insights. Consider both standard manufacturing requirements and custom guidelines.

Manufacturing Process: ${process}

Standard Guidelines Status:
${standardGuidelinesStatus}

${customGuidelinesStatus}

Please provide:
1. A summary of critical design issues
2. Specific recommendations for improvement
3. Manufacturing process considerations
4. Material selection insights

Keep the response concise and actionable.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a DFM (Design for Manufacturing) expert providing technical insights and recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content || "Failed to generate insights";
  } catch (error) {
    console.error("Failed to generate AI insights:", error);
    return "Unable to generate AI insights at this time. Please try again later.";
  }
}