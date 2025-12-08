import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

let genAI: GoogleGenerativeAI | null = null;

/**
 * Inicializa Google Gemini
 */
export const initializeGemini = (): GoogleGenerativeAI => {
  if (genAI) {
    return genAI;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno');
  }

  genAI = new GoogleGenerativeAI(apiKey);
  console.log('✅ Google Gemini inicializado correctamente');
  return genAI;
};

/**
 * Obtiene la instancia de Gemini
 */
export const getGeminiInstance = (): GoogleGenerativeAI => {
  if (!genAI) {
    return initializeGemini();
  }
  return genAI;
};

/**
 * Obtiene el modelo de Gemini para generar texto
 */
export const getGeminiModel = (modelName: string = 'gemini-pro') => {
  const genAI = getGeminiInstance();
  return genAI.getGenerativeModel({ model: modelName });
};

