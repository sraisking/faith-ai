import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const envPath = './.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && key.trim() === 'GEMINI_API_KEY') {
    apiKey = valueParts.join('=').trim();
  }
});

const ai = new GoogleGenAI({ apiKey });

async function test() {
  try {
    console.log('Testing gemini-3.5-flash...');
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Hello, are you active?',
    });
    console.log('Success with gemini-3.5-flash:', response.text.trim());
  } catch (err) {
    console.log('Failed with gemini-3.5-flash:', err.message);
  }
}
test();
