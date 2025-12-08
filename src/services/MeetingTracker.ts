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
   */
  removeParticipant(meetingId: string, userId: string): void {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return;

    const participant = meeting.participants.get(userId);
    if (participant) {
      participant.leftAt = new Date().toISOString();
      console.log(`👋 Participante removido: ${participant.userName} de ${meetingId}`);
    }

    // Si no quedan participantes activos, marcar reunión como inactiva
    const activeParticipants = Array.from(meeting.participants.values()).filter(
      (p) => !p.leftAt
    );

    if (activeParticipants.length === 0) {
      meeting.isActive = false;
      meeting.endTime = new Date().toISOString();
      console.log(`🏁 Reunión ${meetingId} finalizada (sin participantes activos)`);
    }
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
   */
  addTranscription(meetingId: string, transcription: AudioTranscription): void {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return;

    meeting.audioTranscriptions.push(transcription);
    console.log(`🎤 Transcripción agregada a ${meetingId}: ${transcription.userName}`);
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

