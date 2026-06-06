import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 1. Initialize Clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''; // Use ANON KEY for frontend/API
const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // Step 1: Turn the user's question into an Embedding Vector using Gemini
    const queryEmbedding = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: message,
    });
    const queryVector = queryEmbedding.embeddings?.[0]?.values;
    if (!queryVector) {
      throw new Error("Failed to generate embedding");
    }

    // Step 2: Query the Supabase Vector Database
    // We strictly filter for 'hinduism' themes
    const { data: matchedVerses, error } = await supabase.rpc('match_verses', {
      query_embedding: queryVector,
      match_threshold: 0.75, // Only return verses that have a 75% mathematical match
      match_count: 5,        // Get the top 5 most relevant verses
      filter_religion: 'hinduism'
    });

    if (error) throw error;

    // Compile the retrieved verses into a readable format for Gemini
    const contextText = matchedVerses.map((verse: any) => 
      `Chapter ${verse.chapter}, Verse ${verse.verse}: "${verse.content}"`
    ).join('\n');

    // Step 3: Augment the Prompt
    const prompt = `You are a wise and compassionate guide, channeling ancient Vedic wisdom.
A user is respectfully seeking your guidance.

User's query: "${message}"

IMPORTANT: Detect the language of the User's query and respond ENTIRELY in that same language.

Here are the EXACT retrieved scriptures that mathematically match the user's question:
${contextText}

Using ONLY the provided verses above, provide a response that MUST include:
1. A relevant moral teaching resolving the user's query perfectly aligned with the retrieved verses.
2. A very short, impactful story or analogy.
3. Any scientific or psychological value that aligns with this truth.

Format your response EXCLUSIVELY as a valid JSON object. 
The JSON must have exactly two keys:
- "reply": The main textual response encompassing the teaching, the short story, and the scientific insight.
- "reference": The specific verses you cited from the provided context (e.g., "Bhagavad Gita 2.47").`;

    // Step 4: Generation!
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const aiText = response.text;
    if (!aiText) {
      throw new Error("Empty response from AI");
    }

    const { reply, reference } = JSON.parse(aiText);

    return NextResponse.json({ reply, reference });

  } catch (error) {
    console.error('Error in Krishna RAG API:', error);
    return NextResponse.json({ error: 'Failed to retrieve wisdom from the RAG Database.' }, { status: 500 });
  }
}
