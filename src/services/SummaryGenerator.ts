import { generateWithGroq } from '../config/groq';
import { MeetingData, MeetingSummary, Task } from '../models/Meeting';

/**
 * Servicio para generar resúmenes usando Groq AI
 */
export class SummaryGenerator {
  /**
   * Genera un resumen completo de la reunión
   */
  async generateSummary(meeting: MeetingData): Promise<MeetingSummary> {
    const participants = Array.from(meeting.participants.values());
    
    // Procesar mensajes de chat
    const chatText = meeting.chatMessages.length > 0
      ? meeting.chatMessages
      .map((m) => `${m.userName}: ${m.message}`)
          .join('\n')
      : '';

    // Procesar transcripciones de audio
    const audioText = meeting.audioTranscriptions.length > 0
      ? meeting.audioTranscriptions
      .map((t) => `${t.userName}: ${t.text}`)
          .join('\n')
      : '';

    // Combinar chat y audio, asegurando que ambos se procesen
    const allContent = [chatText, audioText]
      .filter(text => text && text.trim().length > 0)
      .join('\n\n---\n\n') || 'No hay contenido registrado.';

    console.log(`📝 Contenido para resumen:`);
    console.log(`   - Mensajes de chat: ${meeting.chatMessages.length}`);
    console.log(`   - Transcripciones de audio: ${meeting.audioTranscriptions.length}`);
    
    if (meeting.chatMessages.length > 0) {
      console.log(`   📄 Primeros mensajes de chat:`, meeting.chatMessages.slice(0, 3).map(m => `${m.userName}: ${m.message.substring(0, 50)}...`));
    } else {
      console.log(`   ⚠️ No hay mensajes de chat registrados`);
    }
    
    if (meeting.audioTranscriptions.length > 0) {
      console.log(`   🎤 Primeras transcripciones de audio:`, meeting.audioTranscriptions.slice(0, 3).map(t => `${t.userName}: ${t.text.substring(0, 50)}...`));
    } else {
      console.log(`   ⚠️ No hay transcripciones de audio registradas`);
      console.log(`   💡 El frontend debe enviar eventos 'audio-transcription' o usar el endpoint REST /api/audio/transcription`);
    }
    
    console.log(`📄 Contenido combinado (primeros 500 caracteres): ${allContent.substring(0, 500)}...`);

    // Generar resumen con Groq AI
    const summaryPrompt = `Eres un asistente experto que genera resúmenes profesionales de reuniones.

INFORMACIÓN DE LA REUNIÓN:
- Título: ${meeting.title}
- Participantes: ${participants.map((p) => p.userName).join(', ')}
- Duración: ${this.calculateDuration(
      meeting.startTime,
      meeting.endTime || new Date().toISOString()
    )} minutos
- Mensajes de chat: ${meeting.chatMessages.length}
- Transcripciones de audio: ${meeting.audioTranscriptions.length}

CONTENIDO COMPLETO DE LA REUNIÓN:
${allContent}

INSTRUCCIONES:
Genera un resumen profesional y estructurado que incluya:

1. RESUMEN EJECUTIVO: Un resumen breve de los temas principales discutidos en la reunión.

2. PUNTOS CLAVE: Lista los puntos más importantes mencionados, identificando quién dijo qué cuando sea relevante.

3. DECISIONES TOMADAS: Si hubo decisiones, listarlas claramente.

4. CONCLUSIONES: Cualquier conclusión o acuerdo alcanzado.

IMPORTANTE:
- Usa los nombres de los participantes cuando menciones quién dijo algo
- Sé específico y claro
- Organiza la información de manera profesional
- Responde completamente en español
- NO incluyas el texto completo de las transcripciones, solo el resumen

Formato: Texto estructurado con títulos y listas cuando sea apropiado.`;

    let summary: string;
    let tasks: Task[] = [];

    try {
      console.log(`🤖 Generando resumen con IA para reunión ${meeting.meetingId}...`);
      summary = await this.generateWithRetry(summaryPrompt);
      console.log(`✅ Resumen generado exitosamente con IA (${summary.length} caracteres)`);

      // Extraer tareas
      console.log(`🔍 Extrayendo tareas y compromisos...`);
      tasks = await this.extractTasksWithRetry(allContent, participants);
      console.log(`✅ ${tasks.length} tareas extraídas`);

    } catch (error: any) {
      console.error('❌ Error generando resumen con IA:', error);
      console.error('   Detalles:', error?.message || error);
      
      // Si es error de rate limit o cuota, intentar con resumen básico
      if (error?.message?.includes('429') || error?.message?.includes('rate limit') || error?.message?.includes('quota')) {
        console.warn('⚠️ Error de rate limit o cuota, generando resumen básico sin IA...');
        const basicSummary = this.generateBasicSummary(meeting);
        return basicSummary;
      }
      
      // Para cualquier otro error, también generar resumen básico
      console.warn('⚠️ Error generando resumen con IA, usando resumen básico...');
      const basicSummary = this.generateBasicSummary(meeting);
      return basicSummary;
    }

    // Si llegamos aquí, tenemos un resumen generado con IA
    const meetingSummary: MeetingSummary = {
      meetingId: meeting.meetingId,
      title: meeting.title || `Reunión ${meeting.meetingId}`,
      startTime: meeting.startTime,
      endTime: meeting.endTime || new Date().toISOString(),
      duration: this.calculateDuration(
        meeting.startTime,
        meeting.endTime || new Date().toISOString()
      ),
      participants,
      summary,
      tasks,
      chatHighlights: this.extractHighlights(meeting.chatMessages),
      createdAt: new Date().toISOString(),
    };

    return meetingSummary;
  }

  /**
   * Genera contenido con reintentos en caso de error
   */
  private async generateWithRetry(prompt: string, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Intento ${attempt}/${maxRetries} de generar resumen con Groq AI...`);
        const result = await generateWithGroq(prompt);
        console.log(`✅ Resumen generado exitosamente en intento ${attempt}`);
        return result;
      } catch (error: any) {
        const isRateLimitError = error?.message?.includes('429') || error?.message?.includes('rate limit') || error?.message?.includes('quota');
        
        if (isRateLimitError && attempt < maxRetries) {
          const retryDelay = 2000 * attempt; // Backoff exponencial: 2s, 4s, 6s
          console.warn(`⚠️ Error de rate limit, reintentando en ${retryDelay/1000}s (intento ${attempt}/${maxRetries})...`);
          await this.sleep(retryDelay);
          continue;
        }
        
        console.error(`❌ Error en intento ${attempt}:`, error?.message || error);
        throw error;
      }
    }
    throw new Error('No se pudo generar el resumen después de múltiples intentos');
  }

  /**
   * Extrae tareas con reintentos
   */
  private async extractTasksWithRetry(content: string, participants: Array<{ userName: string }>, maxRetries = 2): Promise<any[]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.extractTasks(content, participants);
      } catch (error: any) {
        const isRateLimitError = error?.message?.includes('429') || error?.message?.includes('rate limit');
        if (isRateLimitError && attempt < maxRetries) {
          console.warn(`⚠️ Error de rate limit al extraer tareas, reintentando...`);
          await this.sleep(2000 * attempt);
          continue;
        }
        // Si falla, retornar array vacío en lugar de lanzar error
        console.warn('⚠️ No se pudieron extraer tareas, retornando array vacío');
        return [];
      }
    }
    return [];
  }

  /**
   * Extrae el tiempo de espera sugerido del error
   */
  private extractRetryDelay(error: any): number | null {
    try {
      const errorMessage = error?.message || '';
      const match = errorMessage.match(/retry in (\d+\.?\d*)s/i);
      if (match) {
        return Math.ceil(parseFloat(match[1]));
      }
    } catch (e) {
      // Ignorar errores al parsear
    }
    return null;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Genera un resumen básico sin usar IA cuando hay problemas de cuota
   */
  private generateBasicSummary(meeting: MeetingData): MeetingSummary {
    const participants = Array.from(meeting.participants.values());
    const chatMessages = meeting.chatMessages;
    const transcriptions = meeting.audioTranscriptions;

    // Resumen básico sin IA
    const basicSummary = `
Resumen de la reunión "${meeting.title || meeting.meetingId}"

Participantes: ${participants.map(p => p.userName).join(', ')}

Duración: ${this.calculateDuration(meeting.startTime, meeting.endTime || new Date().toISOString())} minutos

Mensajes de chat: ${chatMessages.length}
Transcripciones de audio: ${transcriptions.length}

Contenido:
${chatMessages.length > 0 ? chatMessages.map(m => `${m.userName}: ${m.message}`).join('\n') : 'No hay mensajes de chat registrados.'}
${transcriptions.length > 0 ? '\n\nTranscripciones:\n' + transcriptions.map(t => `${t.userName}: ${t.text}`).join('\n') : ''}

Nota: Este es un resumen básico generado automáticamente. La generación con IA no está disponible en este momento.
    `.trim();

    return {
      meetingId: meeting.meetingId,
      title: meeting.title || `Reunión ${meeting.meetingId}`,
      startTime: meeting.startTime,
      endTime: meeting.endTime || new Date().toISOString(),
      duration: this.calculateDuration(meeting.startTime, meeting.endTime || new Date().toISOString()),
      participants,
      summary: basicSummary,
      tasks: [], // Sin tareas si no hay IA
      chatHighlights: this.extractHighlights(chatMessages),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Extrae tareas y compromisos del contenido
   */
  private async extractTasks(
    content: string,
    participants: Array<{ userName: string }>
  ): Promise<Task[]> {
    const taskPrompt = `Analiza el siguiente contenido de una reunión y extrae todas las tareas, compromisos o acciones asignadas.

Contenido:
${content}

Participantes: ${participants.map((p) => p.userName).join(', ')}

Para cada tarea identificada, proporciona:
- Descripción clara de la tarea
- Persona asignada (si se menciona)
- Prioridad (low, medium, high) si es evidente

Responde SOLO con un JSON válido en este formato:
{
  "tasks": [
    {
      "description": "Descripción de la tarea",
      "assignedToName": "Nombre de la persona",
      "priority": "medium"
    }
  ]
}

Si no hay tareas, devuelve {"tasks": []}. Responde en español.`;

    try {
      console.log(`🔍 Extrayendo tareas con Groq AI...`);
      const responseText = await generateWithGroq(taskPrompt);

      // Limpiar respuesta (puede tener markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;

      const parsed = JSON.parse(jsonText);
      const tasks = parsed.tasks || [];

      return Array.isArray(tasks) ? tasks : [];
    } catch (error) {
      console.error('❌ Error extrayendo tareas:', error);
      return [];
    }
  }

  /**
   * Extrae highlights del chat
   */
  private extractHighlights(
    messages: Array<{ message: string; userName: string }>
  ): string[] {
    // Tomar los últimos 5 mensajes más importantes o todos si son menos de 10
    if (messages.length <= 10) {
      return messages.map((m) => `${m.userName}: ${m.message}`);
    }
    return messages.slice(-5).map((m) => `${m.userName}: ${m.message}`);
  }

  /**
   * Calcula la duración en minutos
   */
  private calculateDuration(startTime: string, endTime: string): number {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }
}

