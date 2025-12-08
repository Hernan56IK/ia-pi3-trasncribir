import { Socket } from 'socket.io-client';
import { MeetingTracker } from '../services/MeetingTracker';
import { SummaryGenerator } from '../services/SummaryGenerator';
import { EmailService } from '../services/EmailService';
import { ChatMessage, AudioTranscription } from '../models/Meeting';
import { getUserEmail } from '../config/firebase';

/**
 * Listener que escucha eventos Socket.IO del backend principal
 */
export class SocketListener {
  private meetingTracker: MeetingTracker;
  private summaryGenerator: SummaryGenerator;
  private emailService: EmailService;

  constructor() {
    this.meetingTracker = new MeetingTracker();
    this.summaryGenerator = new SummaryGenerator();
    this.emailService = new EmailService();
  }

  /**
   * Configura todos los listeners de Socket.IO
   */
  setupListeners(socket: Socket): void {
    // Usuario se une a la reunión
    socket.on('join-meeting', async (data: { meetingId: string; userId: string }) => {
      const { meetingId, userId } = data;
      console.log(`👤 Usuario ${userId} se unió a reunión ${meetingId}`);

      // Obtener datos del usuario desde Firebase
      try {
        const userEmail = await getUserEmail(userId);
        // Por ahora usamos un nombre genérico, podrías obtenerlo de Firebase también
        const userName = `Usuario ${userId.substring(0, 8)}`;
        this.meetingTracker.startMeeting(meetingId, userId, userName, userEmail || undefined);
      } catch (error) {
        console.error(`Error obteniendo datos de usuario ${userId}:`, error);
        const userName = `Usuario ${userId.substring(0, 8)}`;
        this.meetingTracker.startMeeting(meetingId, userId, userName);
      }
    });

    // Usuario sale de la reunión
    socket.on('leave-meeting', (data: { meetingId: string; userId: string }) => {
      const { meetingId, userId } = data;
      console.log(`👋 Usuario ${userId} salió de reunión ${meetingId}`);
      this.meetingTracker.removeParticipant(meetingId, userId);

      // Verificar si la reunión debe finalizarse
      const meeting = this.meetingTracker.getMeeting(meetingId);
      if (meeting && !meeting.isActive) {
        this.finalizeMeeting(meetingId);
      }
    });

    // Notificación de usuario unido
    socket.on('user-joined', (data: { userId: string; socketId: string }) => {
      console.log('👤 Usuario unido:', data.userId);
    });

    // Notificación de usuario salido
    socket.on('user-left', (data: { userId: string; socketId: string }) => {
      console.log('👋 Usuario salido:', data.userId);
    });

    // Mensaje de chat
    socket.on(
      'chat-message',
      (data: {
        meetingId: string;
        message: string;
        userId: string;
        userName: string;
        timestamp: string;
      }) => {
        const chatMessage: ChatMessage = {
          message: data.message,
          userId: data.userId,
          userName: data.userName,
          timestamp: data.timestamp,
        };
        this.meetingTracker.addChatMessage(data.meetingId, chatMessage);
      }
    );

    // Transcripción de audio (si el frontend la envía)
    socket.on(
      'audio-transcription',
      (data: {
        meetingId: string;
        userId: string;
        userName: string;
        transcription: string;
        timestamp: string;
      }) => {
        const transcription: AudioTranscription = {
          text: data.transcription,
          userId: data.userId,
          userName: data.userName,
          timestamp: data.timestamp,
        };
        this.meetingTracker.addTranscription(data.meetingId, transcription);
      }
    );

    console.log('✅ Listeners de Socket.IO configurados');
  }

  /**
   * Finaliza una reunión y envía el resumen
   */
  private async finalizeMeeting(meetingId: string): Promise<void> {
    try {
      const meeting = this.meetingTracker.finalizeMeeting(meetingId);
      if (!meeting) {
        console.warn(`⚠️ No se pudo finalizar la reunión ${meetingId}`);
        return;
      }

      console.log(`📝 Generando resumen para reunión ${meetingId}...`);
      const summary = await this.summaryGenerator.generateSummary(meeting);

      // Obtener emails de participantes
      const participantEmails: string[] = [];
      for (const participant of summary.participants) {
        if (participant.userEmail) {
          participantEmails.push(participant.userEmail);
        } else {
          // Intentar obtener desde Firebase
          const email = await getUserEmail(participant.userId);
          if (email) {
            participantEmails.push(email);
          }
        }
      }

      if (participantEmails.length > 0) {
        await this.emailService.sendSummaryEmail(summary, participantEmails);
        console.log(
          `✅ Resumen enviado por email a ${participantEmails.length} participantes`
        );
      } else {
        console.warn('⚠️ No se encontraron emails de participantes');
      }

      // Aquí podrías guardar el resumen en una base de datos si lo deseas
      // await this.saveSummary(summary);
    } catch (error) {
      console.error(`❌ Error finalizando reunión ${meetingId}:`, error);
    }
  }
}

