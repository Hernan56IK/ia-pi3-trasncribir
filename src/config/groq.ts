import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

let groqClient: Groq | null = null;

/**
 * Inicializa Groq AI
 */
export const initializeGroq = (): Groq => {
  if (groqClient) {
    return groqClient;
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY no está configurada en las variables de entorno');
  }

  groqClient = new Groq({
    apiKey: apiKey,
  });
  console.log('✅ Groq AI inicializado correctamente');
  return groqClient;
};

/**
 * Obtiene la instancia de Groq
 */
export const getGroqInstance = (): Groq => {
  if (!groqClient) {
    return initializeGroq();
  }
  return groqClient;
};

/**
 * Genera contenido usando Groq
 * Modelos disponibles:
 * - llama-3.1-8b-instant (rápido, recomendado)
 * - llama-3.1-70b-versatile (más potente)
 * - mixtral-8x7b-32768 (muy rápido)
 */
export const generateWithGroq = async (
  prompt: string,
  modelName?: string
): Promise<string> => {
  const groq = getGroqInstance();
  const model = modelName || process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: model,
      temperature: 0.7,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('❌ Error generando contenido con Groq:', error);
    throw error;
  }
};




