import { GoogleGenAI } from "@google/genai";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateScript = async (topic: string): Promise<string> => {
  if (!topic) return "";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, engaging video script (approx 100 words) about: "${topic}". 
      Format it for a teleprompter. 
      Use *asterisks* around key words that should be highlighted.
      Do not include scene directions, just the spoken text.`,
    });

    return response.text || "";
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
};