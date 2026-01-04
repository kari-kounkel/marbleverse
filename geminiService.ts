import { GoogleGenAI } from "@google/genai";
import { TonePreference } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateEncouragement(count: number, tone: TonePreference): Promise<string> {
  const prompt = `
    Context: The user is using an app called Marbleverse where they add a marble to a jar for small wins (self-care, rest, being kind).
    Current Milestone: They just reached ${count} marbles.
    Requested Tone Style: ${tone}
    
    CRITICAL TONE RULES:
    - NO museum labels. NO luxury brand copy. NO formal cadence.
    - NO "resting in a quiet glow" or "testament to presence."
    - DO NOT use grand metaphors.
    - DO use shorter, human sentences.
    - DO feel like a quiet smile or a friendly nod, not a seal of approval.
    - Slightly imperfect phrasing is good.
    - Speak TO the user, not ABOUT the marbles.
    
    EXAMPLES OF DIRECTION:
    - "${count} moments. All yours."
    - "Look at that. ${count}."
    - "That adds up, doesn't it?"
    - "These mattered."
    - "You showed up again. Nice."
    - "That's a lot of care, actually."
    
    TONE VARIATIONS:
    - Zen: Casual, minimal, peaceful.
    - Poetic: Warm, slightly whimsical, very short.
    - Grounded: Real, authentic, like a friend talking.
    
    Output: Only the message text. No quotes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.9,
      }
    });

    return response.text?.trim() || `Look at that. ${count} marbles.`;
  } catch (error) {
    console.error("Gemini Error:", error);
    return `${count} marbles. You're doing it.`;
  }
}