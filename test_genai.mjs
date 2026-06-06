import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'test' });
console.log(typeof ai.models.generateContent);
