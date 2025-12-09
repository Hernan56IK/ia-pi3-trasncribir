import { MeetingData, Participant, ChatMessage, AudioTranscription } from '../models/Meeting';

/**
 * Servicio para rastrear reuniones en tiempo real
 */
export class MeetingTracker {
  private meetings: Map<string, MeetingData> = new Map();

  /**
   * Inicia el tracking de una reunión
   */
  startMeeting(
    meetingId: string,
    userId: string,
    userName: string,
    userEmail?: string,
    title?: string
  ): void {
    if (this.meetings.has(meetingId)) {
      // Si ya existe, solo agregar participante
      this.addParticipant(meetingId, userId, userName, userEmail);
      return;
    }

    const meeting: MeetingData = {
      meetingId,
      title: title || `Reunión ${meetingId}`,
      startTime: new Date().toISOString(),
      participants: new Map(),
      chatMessages: [],
      audioTranscriptions: [],
      isActive: true,
    };

    meeting.participants.set(userId, {
      userId,
      userName,
      userEmail,
      joinedAt: new Date().toISOString(),
    });

    this.meetings.set(meetingId, meeting);
    console.log(`📝 Iniciado tracking de reunión: ${meetingId}`);
  }

  /**
   * Agrega un participante a la reunión
   */
  addParticipant(
    meetingId: string,
    userId: string,
    userName: string,
    userEmail?: string
  ): void {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      console.warn(`⚠️ Reunión ${meetingId} no encontrada`);
      return;
    }

    if (!meeting.participants.has(userId)) {
      meeting.participants.set(userId, {
        userId,
        userName,
        userEmail,
        joinedAt: new Date().toISOString(),
      });
      console.log(`👤 Participante agregado: ${userName} a ${meetingId}`);
    }
  }

  /**
   * Remueve un participante de la reunión
   * @returns {boolean} true si la reunión debe finalizarse (no hay participantes activos)
   */
  removeParticipant(meetingId: string, userId: string): boolean {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      console.warn(`⚠️ Reunión ${meetingId} no encontrada al remover participante ${userId}`);
      return false;
    }

    const participant = meeting.participants.get(userId);
    if (participant) {
      participant.leftAt = new Date().toISOString();
      console.log(`👋 Participante removido: ${participant.userName} (${userId}) de ${meetingId}`);
    } else {
      console.warn(`⚠️ Participante ${userId} no encontrado en reunión ${meetingId}`);
      return false;
    }

    // Contar participantes activos (que no han salido)
    const activeParticipants = Array.from(meeting.participants.values()).filter(
      (p) => !p.leftAt
    );

    console.log(`📊 Reunión ${meetingId}: ${activeParticipants.length} participantes activos de ${meeting.participants.size} totales`);

    // Solo retornar true si NO hay participantes activos Y había al menos un participante
    // La decisión final de finalizar se toma en el listener, no aquí
    if (activeParticipants.length === 0 && meeting.participants.size > 0) {
      console.log(`📝 Todos los participantes han salido de ${meetingId}`);
      return true; // Indicar que puede finalizarse
    } else if (activeParticipants.length === 0 && meeting.participants.size === 0) {
      console.warn(`⚠️ Reunión ${meetingId} sin participantes registrados`);
      return false;
    }

    return false; // Aún hay participantes activos, no finalizar
  }

  /**
   * Agrega un mensaje de chat
   */
  addChatMessage(meetingId: string, message: ChatMessage): void {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return;

    meeting.chatMessages.push(message);
    console.log(`💬 Mensaje agregado a ${meetingId}: ${message.userName}`);
  }

  /**
   * Agrega una transcripción de audio
   * Si la reunión no existe, la crea automáticamente
   */
  addTranscription(meetingId: string, transcription: AudioTranscription): void {
    let meeting = this.meetings.get(meetingId);
    
    // Si la reunión no existe, crearla automáticamente
    if (!meeting) {
      console.warn(`⚠️ Reunión ${meetingId} no encontrada al agregar transcripción. Creando reunión automáticamente...`);
      this.startMeeting(
        meetingId,
        transcription.userId,
        transcription.userName
      );
      meeting = this.meetings.get(meetingId);
      
      if (!meeting) {
        console.error(`❌ Error: No se pudo crear la reunión ${meetingId} para la transcripción`);
        return;
      }
    }

    meeting.audioTranscriptions.push(transcription);
    console.log(`🎤 Transcripción agregada a ${meetingId}: ${transcription.userName} (${transcription.text.substring(0, 50)}...)`);
    console.log(`📊 Total de transcripciones en ${meetingId}: ${meeting.audioTranscriptions.length}`);
  }

  /**
   * Obtiene los datos de una reunión
   */
  getMeeting(meetingId: string): MeetingData | undefined {
    return this.meetings.get(meetingId);
  }

  /**
   * Finaliza una reunión
   */
  finalizeMeeting(meetingId: string): MeetingData | undefined {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return undefined;

    meeting.isActive = false;
    meeting.endTime = new Date().toISOString();

    // Marcar todos los participantes como salidos si no tienen leftAt
    meeting.participants.forEach((participant) => {
      if (!participant.leftAt) {
        participant.leftAt = new Date().toISOString();
      }
    });

    console.log(`🏁 Reunión ${meetingId} finalizada`);
    return meeting;
  }

  /**
   * Obtiene todas las reuniones activas
   */
  getActiveMeetings(): MeetingData[] {
    return Array.from(this.meetings.values()).filter((m) => m.isActive);
  }
}

