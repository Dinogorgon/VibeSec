import { GoogleGenerativeAI } from '@google/generative-ai';
import { Vulnerability } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Debug: Log if API key is found (only in development)
if (import.meta.env.DEV) {
  console.log('Gemini API Key loaded:', API_KEY ? 'Yes (hidden)' : 'No');
  console.log('Environment variables:', {
    hasViteGeminiKey: !!import.meta.env.VITE_GEMINI_API_KEY,
    allEnvKeys: Object.keys(import.meta.env).filter(key => key.includes('GEMINI') || key.includes('VITE'))
  });
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const generateFix = async (
  vulnerability: Vulnerability,
  techStack: string[]
): Promise<string> => {
  if (!genAI) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env.local or .env file in the project root. Make sure to restart the dev server after adding the key.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a Senior Cybersecurity Expert. A vulnerability has been detected in a ${techStack.join(', ')} application.

Vulnerability Details:
- Title: ${vulnerability.title}
- Severity: ${vulnerability.severity}
- Description: ${vulnerability.description}
- Location: ${vulnerability.location}

Please provide a comprehensive fix for this vulnerability. Your response should include:

1. A brief explanation of the security issue
2. The vulnerable code (Before)
3. The fixed code (After)
4. Additional security recommendations if applicable

Format your response in Markdown with proper code blocks. Use clear headings and structure.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating fix:', error);
    throw new Error('Failed to generate fix. Please try again.');
  }
};

