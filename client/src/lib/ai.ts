import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

export async function generateDFMSummary(report: any, process: string) {
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    console.warn('OpenAI API key is missing');
    return null;
  }

  const prompt = `You are a Design for Manufacturing (DFM) expert. Analyze this manufacturing report and provide 3-4 actionable insights focusing on key issues and improvements. Format your response as complete sentences starting with **. Ensure each insight is a complete thought.

Manufacturing Process: ${process}
Report Details:
${JSON.stringify(report, null, 2)}

Focus on:
1. Major issues that need immediate attention
2. Quick wins for improvement
3. Critical manufacturing constraints`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a DFM expert providing concise, actionable manufacturing insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Failed to generate AI summary:", error);
    return null;
  }
}