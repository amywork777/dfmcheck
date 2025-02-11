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

  const prompt = `As a DFM expert, provide 3-4 very brief but critical manufacturing insights about this report. Each insight should be 1-2 sentences max, focusing on immediate actions needed. Format each insight starting with **.

Manufacturing Process: ${process}
Report Details:
${JSON.stringify(report, null, 2)}

Focus areas:
1. Critical manufacturing issues
2. Quick improvements
3. Key constraints`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a DFM expert providing extremely concise, actionable manufacturing insights. Keep each insight to 1-2 sentences."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Failed to generate AI summary:", error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key is missing or invalid. Please check your configuration.');
      }
      if (error.message.includes('insufficient_quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your API key configuration.');
      }
    }
    throw error;
  }
}