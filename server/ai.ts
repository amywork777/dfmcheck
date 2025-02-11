import OpenAI from "openai";
import { DFMReport } from "@shared/schema";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("Warning: OPENAI_API_KEY is not set. AI insights will be disabled.");
}

const openai = new OpenAI({ apiKey });

export async function generateDesignInsights(
  report: DFMReport,
  process: string,
  designGuidelines?: string
): Promise<string> {
  if (!apiKey) {
    console.warn("AI insights disabled: No API key available");
    return "AI insights are currently disabled. Please configure OpenAI API key to enable this feature.";
  }

  console.log('Generating AI insights for process:', process);

  try {
    const standardGuidelinesStatus = [
      `Wall Thickness: ${report.wallThickness.pass ? 'Passed' : `Failed with ${report.wallThickness.issues.length} issues`}`,
      `Overhangs: ${report.overhangs.pass ? 'Passed' : `Failed with ${report.overhangs.issues.length} issues`}`,
      `Material Recommendations: ${report.materialRecommendations.recommended.join(', ')}`
    ].join('\n');

    const customGuidelinesStatus = report.customGuidelines 
      ? `Custom Guidelines Analysis:\n${report.customGuidelines.validations.map(v => 
          `- ${v.rule}: ${v.pass ? 'Passed' : 'Failed'}${v.details ? ` (${v.details})` : ''}`
        ).join('\n')}`
      : 'No custom guidelines provided';

    const prompt = `As a DFM expert, analyze this manufacturing report and provide insights focused on both standard requirements and custom guidelines. Structure your response as follows:

• Summary of Critical Design Issues
  - Analyze standard manufacturing requirements
  - Evaluate custom guideline compliance
  - Highlight key measurements and quantities

• Required Design Modifications
  - List specific changes needed
  - Include target measurements
  - Address custom guideline violations

• Process-Specific Guidelines
  - ${process} specific recommendations
  - Material selection insights
  - Tooling considerations

Manufacturing Process: ${process}

Standard Analysis:
${standardGuidelinesStatus}

${customGuidelinesStatus}

Format your response using clear bullet points, maintaining the above structure. Each point should be specific and actionable.`;

    console.log('Sending request to OpenAI...');

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a DFM expert providing clear, structured manufacturing insights. Format your response using bullet points with clear sections. Ensure each recommendation is specific and actionable."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    console.log('Successfully received OpenAI response');
    return response.choices[0].message.content || "Failed to generate insights";
  } catch (error: any) {
    console.error("Failed to generate AI insights:", error);
    if (error.code === 'insufficient_quota') {
      return "OpenAI API quota exceeded. Please check your API key configuration.";
    }
    if (error.code === 'invalid_api_key') {
      return "Invalid OpenAI API key. Please check your API key configuration.";
    }
    return `Unable to generate AI insights: ${error.message}`;
  }
}