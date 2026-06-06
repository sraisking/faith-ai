import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function generateAIContent(prompt: string, config: any = {}) {
  const models = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError: any = null;
  for (const model of models) {
    try {
      console.log(`Trying LLM model on frontend: ${model}`);
      const result = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: config
      });
      if (result && result.text) {
        console.log(`Successfully generated content with model: ${model}`);
        return result;
      }
    } catch (err: any) {
      console.warn(`Model ${model} failed:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error("All LLM models failed");
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    const prompt = `You are a wise and compassionate guide, channeling the teachings of the Quran and Islamic wisdom.
A user is respectfully seeking your guidance.

User's query: "${message}"

IMPORTANT: Detect the language of the User's query and respond ENTIRELY in that same language.

Provide a response that MUST include:
1. A relevant moral teaching or guidance from Islamic principles.
2. A very short, impactful story or parable (from Islamic history, Hadith, or an illustrative metaphor).
3. Any scientific or psychological value that aligns with this ancient wisdom (briefly mentioned, as the Quran often encourages reflection on nature and self).

Format your response EXCLUSIVELY as a valid JSON object. 
The JSON must have exactly two keys:
- "reply": The main textual response encompassing the teaching, the short story, and the scientific/psychological insight. (You can use markdown like bolding or italics if helpful).
- "reference": The specific verses or Hadith you cited (e.g., "Surah Al-Baqarah 2:177, Sahih Bukhari").`;

    const response = await generateAIContent(prompt, {
      responseMimeType: "application/json"
    });

    const aiText = response.text;
    if (!aiText) {
      throw new Error("Empty response from AI");
    }

    const { reply, reference } = JSON.parse(aiText);

    return NextResponse.json({ reply, reference });

  } catch (error) {
    console.error('Error in Quran API:', error);
    return NextResponse.json({ error: 'Failed to seek guidance. Ensure your GEMINI_API_KEY is set.' }, { status: 500 });
  }
}
