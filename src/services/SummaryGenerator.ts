import { getGeminiModel } from '../config/gemini';
import { MeetingData, MeetingSummary, Task } from '../models/Meeting';

/**
 * Servicio para generar resúmenes usando Google Gemini
 */
export class SummaryGenerator {
  /**
   * Genera un resumen completo de la reunión
   */
  async generateSummary(meeting: MeetingData): Promise<MeetingSummary> {
    const participants = Array.from(meeting.participants.values());
    const chatText = meeting.chatMessages
      .map((m) => `${m.userName}: ${m.message}`)
      .join('\n');

    const audioText = meeting.audioTranscriptions
      .map((t) => `${t.userName}: ${t.text}`)
      .join('\n');

    const allContent = chatText || audioText || 'No hay contenido registrado.';

    // Generar resumen con Gemini
    const summaryPrompt = `Eres un asistente experto que genera resúmenes profesionales de reuniones.

Reunión: ${meeting.title}
Participantes: ${participants.map((p) => p.userName).join(', ')}
Duración: ${this.calculateDuration(
      meeting.startTime,
      meeting.endTime || new Date().toISOString()
    )} minutos

Contenido de la reunión:
${allContent}

Genera un resumen profesional que incluya:
1. Resumen ejecutivo de los temas discutidos
2. Puntos clave mencionados
3. Decisiones tomadas (si las hay)

Formato: Texto claro y estructurado. Responde en español.`;

    try {
      const model = getGeminiModel('gemini-pro');
      const result = await model.generateContent(summaryPrompt);
      const response = result.response;
      const summary = response.text();

      // Extraer tareas
      const tasks = await this.extractTasks(allContent, participants);

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
    } catch (error) {
      console.error('❌ Error generando resumen:', error);
      throw error;
    }
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
      const model = getGeminiModel('gemini-pro');
      const result = await model.generateContent(taskPrompt);
      const response = result.response;
      const responseText = response.text();

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

