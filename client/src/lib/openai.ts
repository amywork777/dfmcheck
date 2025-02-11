import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: import.meta.env.VITE_OPENAI_API_KEY 
});

export async function analyzeDesign(imageBase64: string): Promise<string> {
  try {
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a Design for Manufacturing (DFM) expert analyzing uploaded designs. Provide detailed analysis based on manufacturability, usability, and design considerations."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this design image focusing on:
              1. Interaction with the World (functional interaction, real-world challenges, accessibility)
              2. Design Considerations (aesthetics, ergonomics, modularity, safety)
              3. Manufacturing Design Considerations (materials, surface finish, tolerances, structural support)
              4. Quality Control & Durability
              
              Provide a structured analysis with actionable recommendations.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ],
        },
      ],
      max_tokens: 1000,
    });

    return visionResponse.choices[0].message.content || "No analysis generated";
  } catch (error) {
    console.error("Error analyzing design:", error);
    throw new Error("Failed to analyze design image");
  }
}

export async function chatWithAI(message: string, context: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a DFM expert helping users understand their design analysis. Use the provided context to give specific, actionable advice."
        },
        {
          role: "assistant",
          content: context
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500
    });

    return response.choices[0].message.content || "I couldn't generate a response";
  } catch (error) {
    console.error("Error in chat:", error);
    throw new Error("Failed to get AI response");
  }
}
