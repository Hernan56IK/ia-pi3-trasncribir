import dotenv from 'dotenv';
import OpenAI from 'openai';
import Groq from 'groq-sdk';

dotenv.config();

type Provider = 'openai' | 'groq';
type FileCtor = new (blobParts: any[], fileName: string, options?: { type?: string }) => any;

/**
 * Servicio para transcribir audio con múltiples proveedores (OpenAI / Groq)
 * Requiere:
 *   - GROQ_API_KEY cuando se use Groq (recomendado)
 *   - OPENAI_API_KEY cuando se use OpenAI
 * Puedes controlar el orden con TRANSCRIPTION_PROVIDERS (ej: "groq,openai")
 */
export class AudioTranscriptionService {
  private readonly openai: OpenAI | null;
  private readonly groq: Groq | null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 segundos
  private readonly providers: Provider[];

  constructor() {
    this.providers = (process.env.TRANSCRIPTION_PROVIDERS || process.env.TRANSCRIPTION_PROVIDER || 'groq,openai')
      .split(',')
      .map((p) => p.trim().toLowerCase() as Provider)
      .filter((p) => p === 'groq' || p === 'openai');

    if (this.providers.length === 0) {
      throw new Error('No hay proveedores de transcripción configurados. Define TRANSCRIPTION_PROVIDERS (groq,openai).');
    }

    // Inicializar clientes solo si hay API keys disponibles
    this.groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  }

  /**
   * Transcribe audio desde base64 o buffer
   */
  async transcribeAudio(audioData: string | Buffer): Promise<string> {
    // Convertir base64 a Buffer si es string
    const audioBuffer = Buffer.isBuffer(audioData)
      ? audioData
      : Buffer.from(
          audioData.includes(',') ? audioData.split(',')[1] : audioData,
          'base64'
        );

    console.log(`🎤 Audio recibido para transcripción (${audioBuffer.length} bytes)`);

    const errors: string[] = [];

    for (const provider of this.providers) {
      try {
        console.log(`🤖 Intentando transcripción con proveedor: ${provider.toUpperCase()}`);
        const text = await this.transcribeWithProvider(provider, audioBuffer);

        if (!text || text.trim().length === 0) {
          throw new Error(`Transcripción vacía recibida de ${provider}`);
        }

        console.log(`✅ Transcripción exitosa con ${provider} (${text.length} caracteres): ${text.substring(0, 100)}...`);
        return text.trim();
      } catch (error: any) {
        const message = error?.message || String(error);
        errors.push(`${provider}: ${message}`);
        console.error(`❌ Error usando ${provider}: ${message}`);
        // Intentar siguiente proveedor si existe
      }
    }

    throw new Error(`No se pudo transcribir el audio con los proveedores configurados. Detalles: ${errors.join(' | ')}`);
  }

  /**
   * Intenta transcribir con un proveedor específico aplicando reintentos
   */
  private async transcribeWithProvider(provider: Provider, audioBuffer: Buffer): Promise<string> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Intento ${attempt}/${this.MAX_RETRIES} con ${provider}...`);

        const audioFile = await this.buildAudioFile(audioBuffer);

        if (provider === 'groq') {
          if (!this.groq) {
            throw new Error('GROQ_API_KEY no está configurada');
          }

          const transcription = await this.groq.audio.transcriptions.create({
            file: audioFile as any,
            model: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3',
            language: 'es',
          });

          return transcription.text;
        }

        if (provider === 'openai') {
          if (!this.openai) {
            throw new Error('OPENAI_API_KEY no está configurada');
          }

          const transcription = await this.openai.audio.transcriptions.create({
            file: audioFile as any,
            model: process.env.OPENAI_WHISPER_MODEL || 'whisper-1',
            language: 'es',
          });

          return transcription.text;
        }

        throw new Error(`Proveedor de transcripción no soportado: ${provider}`);
      } catch (error: any) {
        const isRateLimit = error?.status === 429 || error?.message?.includes('rate limit');
        const isAuth = error?.status === 401;
        const isRetryable =
          isRateLimit ||
          error?.message?.includes('timeout') ||
          error?.message?.includes('network') ||
          (error?.status && error?.status >= 500);

        if (isAuth) {
          // Error de credenciales: no vale la pena reintentar
          throw error;
        }

        if (isRetryable && attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY * attempt;
          console.warn(`⚠️ Error con ${provider} (intento ${attempt}), reintentando en ${delay / 1000}s...`);
          console.warn(`   Detalle: ${error?.message || error}`);
          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw new Error(`No se pudo transcribir con ${provider} después de ${this.MAX_RETRIES} intentos`);
  }

  /**
   * Prepara el audio para ser enviado a la API (File o Blob)
   */
  private async buildAudioFile(audioBuffer: Buffer): Promise<any> {
    const FileClass = (global as any).File as FileCtor | undefined;

    if (FileClass) {
      return new FileClass([audioBuffer], 'audio.webm', { type: 'audio/webm' });
    }

    const { Blob } = await import('buffer');
    return new Blob([audioBuffer], { type: 'audio/webm' });
  }

  /**
   * Transcribe audio desde un archivo
   */
  async transcribeAudioFile(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    const audioBuffer = await fs.readFile(filePath);
    return this.transcribeAudio(audioBuffer);
  }

  /**
   * Transcribe audio desde una URL
   */
  async transcribeAudioFromUrl(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error descargando audio: ${response.status}`);
    }
    const audioBuffer = await response.arrayBuffer();
    return this.transcribeAudio(Buffer.from(audioBuffer));
  }

  /**
   * Helper para sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

