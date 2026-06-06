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

console.log('API Key starts with:', apiKey.substring(0, 10));

const ai = new GoogleGenAI({ apiKey });

async function test() {
  try {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-pro'];
    for (const model of modelsToTry) {
      try {
        console.log(`Testing model: ${model}`);
        const response = await ai.models.generateContent({
          model: model,
          contents: 'Say "active!" if you receive this.',
        });
        console.log(`Success with ${model}:`, response.text.trim());
        break;
      } catch (err) {
        console.log(`Failed with ${model}:`, err.message);
      }
    }
  } catch (e) {
    console.error('Test error:', e);
  }
}
test();
