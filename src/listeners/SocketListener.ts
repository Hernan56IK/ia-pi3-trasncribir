import { Socket } from 'socket.io-client';
import { MeetingTracker } from '../services/MeetingTracker';
import { SummaryGenerator } from '../services/SummaryGenerator';
import { EmailService } from '../services/EmailService';
import { ChatMessage, AudioTranscription } from '../models/Meeting';
import { getUserEmail } from '../config/firebase';
import { isSocketConnected } from '../config/socket.client';

/**
 * Listener que escucha eventos Socket.IO del backend principal
 */
export class SocketListener {
  private meetingTracker: MeetingTracker;
  private summaryGenerator: SummaryGenerator;
  private emailService: EmailService;
  private finalizingMeetings: Set<string> = new Set(); // Prevenir finalización múltiple

  constructor() {
    this.meetingTracker = new MeetingTracker();
    this.summaryGenerator = new SummaryGenerator();
    this.emailService = new EmailService();
  }

  /**
   * Configura todos los listeners de Socket.IO
   */
  setupListeners(socket: Socket): void {
    // Verificar que el socket esté disponible
    if (!socket) {
      console.error('❌ Socket no disponible para configurar listeners');
      return;
    }

    console.log('🔧 Configurando listeners de Socket.IO...');
    console.log('📡 Socket conectado:', socket.connected);
    console.log('🆔 Socket ID:', socket.id);

    // Usuario se une a la reunión
    socket.on('join-meeting', async (data: { meetingId: string; userId: string; userName?: string }) => {
      const { meetingId, userId, userName } = data;
      
      // Prevenir eventos duplicados
      const meeting = this.meetingTracker.getMeeting(meetingId);
      if (meeting && meeting.participants.has(userId)) {
        console.log(`⚠️ Usuario ${userId} ya está en la reunión ${meetingId}, ignorando join duplicado`);
        return;
      }

      console.log(`👤 Usuario ${userId} se unió a reunión ${meetingId}`);

      // Obtener datos del usuario desde Firebase
      try {
        const userEmail = await getUserEmail(userId);
        const finalUserName = userName || `Usuario ${userId.substring(0, 8)}`;
        this.meetingTracker.startMeeting(meetingId, userId, finalUserName, userEmail || undefined);
      } catch (error) {
        console.error(`Error obteniendo datos de usuario ${userId}:`, error);
        const finalUserName = userName || `Usuario ${userId.substring(0, 8)}`;
        this.meetingTracker.startMeeting(meetingId, userId, finalUserName);
      }
    });

    // Usuario sale de la reunión
    socket.on('leave-meeting', (data: { meetingId: string; userId: string }) => {
      const { meetingId, userId } = data;
      console.log(`👋 Usuario ${userId} salió de reunión ${meetingId}`);
      
      // Remover participante
      const meeting = this.meetingTracker.getMeeting(meetingId);
      if (!meeting) {
        console.warn(`⚠️ Reunión ${meetingId} no encontrada al intentar remover participante ${userId}`);
        return;
      }

      // Remover el participante
      const shouldFinalize = this.meetingTracker.removeParticipant(meetingId, userId);

      // Verificar si TODOS los participantes han salido
      const updatedMeeting = this.meetingTracker.getMeeting(meetingId);
      if (!updatedMeeting) {
        return;
      }

      const activeParticipants = Array.from(updatedMeeting.participants.values()).filter(p => !p.leftAt);
      const totalParticipants = updatedMeeting.participants.size;
      
      console.log(`📊 Reunión ${meetingId}: ${activeParticipants.length} activos de ${totalParticipants} totales`);

      // Solo finalizar si NO hay participantes activos Y había al menos un participante registrado
      if (activeParticipants.length === 0 && totalParticipants > 0) {
        console.log(`🚀 Todos los participantes salieron. Iniciando finalización de reunión ${meetingId}...`);
        this.finalizeMeeting(meetingId).catch((error) => {
          console.error(`❌ Error en finalizeMeeting para ${meetingId}:`, error);
        });
      } else if (activeParticipants.length > 0) {
        console.log(`⏳ Reunión ${meetingId} aún activa. Esperando a que salgan ${activeParticipants.length} participante(s) más`);
      } else {
        console.log(`⚠️ Reunión ${meetingId} sin participantes registrados, no se finalizará`);
      }
    });

    // Notificación de usuario unido (evento alternativo)
    socket.on('user-joined', (data: { userId: string; socketId: string; meetingId?: string }) => {
      console.log('👤 Usuario unido (user-joined):', data.userId);
      // Si viene meetingId, intentar iniciar tracking
      if (data.meetingId) {
        const userName = `Usuario ${data.userId.substring(0, 8)}`;
        this.meetingTracker.startMeeting(data.meetingId, data.userId, userName);
      }
    });

    // Notificación de usuario salido (evento alternativo)
    socket.on('user-left', (data: { userId: string; socketId: string; meetingId?: string }) => {
      console.log('👋 Usuario salido (user-left):', data.userId);
      // Si viene meetingId, remover participante
      if (data.meetingId) {
        const shouldFinalize = this.meetingTracker.removeParticipant(data.meetingId, data.userId);
        if (shouldFinalize) {
          this.finalizeMeeting(data.meetingId).catch((error) => {
            console.error(`❌ Error en finalizeMeeting para ${data.meetingId}:`, error);
          });
        }
      }
    });

    // Escuchar todos los eventos para debug (solo si onAny está disponible - solo en servidor Socket.IO)
    if (typeof (socket as any).onAny === 'function') {
      (socket as any).onAny((eventName: string, ...args: any[]) => {
        // Mostrar todos los eventos excepto los de conexión/desconexión repetitivos
        if (eventName !== 'connect' && eventName !== 'disconnect' && !eventName.includes('error') && !eventName.includes('ping') && !eventName.includes('pong')) {
          console.log(`🔔 Evento recibido: ${eventName}`, args.length > 0 ? JSON.stringify(args[0], null, 2) : '');
        }
      });
    }

    // Verificar conexión periódicamente (solo si el socket tiene la propiedad connected)
    if (socket.connected !== undefined) {
      setInterval(() => {
        if (socket.connected) {
          console.log(`💓 Socket activo - ID: ${socket.id}, Conectado: ${socket.connected}`);
        } else {
          console.warn('⚠️ Socket desconectado - intentando reconectar...');
        }
      }, 30000); // Cada 30 segundos
    }

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
        try {
          const chatMessage: ChatMessage = {
            message: data.message,
            userId: data.userId,
            userName: data.userName,
            timestamp: data.timestamp,
          };
          this.meetingTracker.addChatMessage(data.meetingId, chatMessage);
        } catch (error) {
          console.error('❌ Error procesando mensaje de chat:', error);
        }
      }
    );

    // Audio para transcribir con IA (nuevo - el servicio transcribe)
    socket.on(
      'audio-to-transcribe',
      async (data: {
        meetingId: string;
        userId: string;
        userName: string;
        audioData: string; // Base64
        timestamp?: string;
      }) => {
        try {
          if (!data.meetingId || !data.userId || !data.userName || !data.audioData) {
            console.error('❌ Audio inválido: faltan campos requeridos', {
              meetingId: !!data.meetingId,
              userId: !!data.userId,
              userName: !!data.userName,
              audioData: !!data.audioData,
              audioDataLength: data.audioData?.length || 0,
            });
            return;
          }

          // Validar que el audio no esté vacío
          if (!data.audioData.trim() || data.audioData.length < 100) {
            console.warn(`⚠️ Audio recibido muy pequeño o vacío (${data.audioData.length} caracteres), ignorando...`);
            return;
          }

          console.log(`🎤 Audio recibido para transcripción:`, {
            userName: data.userName,
            meetingId: data.meetingId,
            audioDataLength: data.audioData.length,
            timestamp: data.timestamp || 'no proporcionado',
          });

          // Importar y usar el servicio de transcripción
          const { AudioTranscriptionService } = await import('../services/AudioTranscriptionService');
          const transcriptionService = new AudioTranscriptionService();

          console.log(`🤖 Transcribiendo audio con proveedor configurado (Groq/OpenAI)...`);
          
          let transcription: string;
          try {
            transcription = await transcriptionService.transcribeAudio(data.audioData);
          } catch (transcriptionError) {
            console.error('❌ Error en transcripción de OpenAI Whisper:', transcriptionError);
            if (transcriptionError instanceof Error) {
              console.error('   Mensaje:', transcriptionError.message);
              console.error('   Stack:', transcriptionError.stack);
            }
            // NO retornar aquí - intentar continuar o registrar el error
            throw transcriptionError; // Re-lanzar para que se capture en el catch externo
          }
          
          if (!transcription || transcription.trim().length === 0) {
            console.warn('⚠️ Transcripción vacía recibida de OpenAI Whisper, ignorando...');
            console.warn('   Esto puede indicar que el audio no contenía habla o hubo un problema con la transcripción');
            return;
          }

          console.log(`✅ Transcripción completada: "${transcription.substring(0, 100)}..."`);
          console.log(`📝 Longitud de transcripción: ${transcription.length} caracteres`);

          // Agregar la transcripción al meeting tracker
          const transcriptionObj: AudioTranscription = {
            text: transcription.trim(),
            userId: data.userId,
            userName: data.userName,
            timestamp: data.timestamp || new Date().toISOString(),
          };

          this.meetingTracker.addTranscription(data.meetingId, transcriptionObj);

          // Verificar que se agregó correctamente
          const meeting = this.meetingTracker.getMeeting(data.meetingId);
          if (meeting) {
            console.log(`✅ Transcripción agregada a reunión ${data.meetingId}. Total: ${meeting.audioTranscriptions.length}`);
            console.log(`📊 Transcripción: ${data.userName}: "${transcription.substring(0, 50)}..."`);
            
            // Log de todas las transcripciones para debug
            if (meeting.audioTranscriptions.length <= 5) {
              console.log(`📋 Todas las transcripciones en la reunión:`, 
                meeting.audioTranscriptions.map((t, i) => `${i + 1}. ${t.userName}: "${t.text.substring(0, 30)}..."`));
            }
          } else {
            console.error(`❌ Error: No se pudo verificar la transcripción en reunión ${data.meetingId}`);
          }
        } catch (error) {
          console.error('❌ Error transcribiendo audio:', error);
          if (error instanceof Error) {
            console.error('   Mensaje:', error.message);
            console.error('   Stack:', error.stack);
          }
          // NO silenciar el error - dejar que se propague para que se vea en los logs
        }
      }
    );

    // Transcripción de audio (texto ya transcrito - para compatibilidad)
    socket.on(
      'audio-transcription',
      (data: {
        meetingId: string;
        userId: string;
        userName: string;
        transcription: string;
        timestamp?: string;
      }) => {
        try {
          // Validar datos requeridos
          if (!data.meetingId || !data.userId || !data.userName || !data.transcription) {
            console.error('❌ Transcripción inválida: faltan campos requeridos', {
              meetingId: !!data.meetingId,
              userId: !!data.userId,
              userName: !!data.userName,
              transcription: !!data.transcription,
            });
            return;
          }

          // Validar que la transcripción no esté vacía
          if (!data.transcription.trim()) {
            console.warn('⚠️ Transcripción vacía recibida, ignorando...');
            return;
          }

          console.log(`🎤 Transcripción de audio recibida de ${data.userName} en reunión ${data.meetingId}:`, data.transcription.substring(0, 100) + '...');
          
          const transcription: AudioTranscription = {
            text: data.transcription.trim(),
            userId: data.userId,
            userName: data.userName,
            timestamp: data.timestamp || new Date().toISOString(),
          };
          
          this.meetingTracker.addTranscription(data.meetingId, transcription);
          
          // Verificar que se agregó correctamente
          const meeting = this.meetingTracker.getMeeting(data.meetingId);
          if (meeting) {
            console.log(`✅ Transcripción agregada a reunión ${data.meetingId}. Total: ${meeting.audioTranscriptions.length}`);
          } else {
            console.error(`❌ Error: No se pudo verificar la transcripción en reunión ${data.meetingId}`);
          }
        } catch (error) {
          console.error('❌ Error procesando transcripción de audio:', error);
          if (error instanceof Error) {
            console.error('   Mensaje:', error.message);
            console.error('   Stack:', error.stack);
          }
        }
      }
    );

    // Manejar errores del socket
    socket.on('error', (error) => {
      console.error('❌ Error en Socket.IO:', error);
    });

    console.log('✅ Listeners de Socket.IO configurados');
  }

  /**
   * Finaliza una reunión y envía el resumen
   */
  private async finalizeMeeting(meetingId: string): Promise<void> {
    // Prevenir ejecución múltiple
    if (this.finalizingMeetings.has(meetingId)) {
      console.log(`⚠️ Reunión ${meetingId} ya está siendo finalizada, ignorando...`);
      return;
    }

    this.finalizingMeetings.add(meetingId);

    try {
      console.log(`🔄 Iniciando proceso de finalización para reunión ${meetingId}...`);
      
      const meeting = this.meetingTracker.finalizeMeeting(meetingId);
      if (!meeting) {
        console.warn(`⚠️ No se pudo finalizar la reunión ${meetingId} - reunión no encontrada`);
        this.finalizingMeetings.delete(meetingId);
        return;
      }

      // Listar todos los participantes para verificación
      const allParticipants = Array.from(meeting.participants.values());
      console.log(`📊 Reunión ${meetingId} datos:`, {
        participantes: meeting.participants.size,
        mensajesChat: meeting.chatMessages.length,
        transcripciones: meeting.audioTranscriptions.length,
        duracion: meeting.endTime && meeting.startTime 
          ? Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / (1000 * 60))
          : 0
      });
      
      // Mostrar detalles de transcripciones
      if (meeting.audioTranscriptions.length === 0) {
        console.warn(`⚠️ ADVERTENCIA: No se recibieron transcripciones de audio para la reunión ${meetingId}`);
        console.warn(`💡 El frontend debe enviar:`);
        console.warn(`   - Audio para transcribir: evento 'audio-to-transcribe' (con audioData en base64) o endpoint /api/audio/transcribe`);
        console.warn(`   - Texto ya transcrito: evento 'audio-transcription' (con transcription) o endpoint /api/audio/transcription`);
      } else {
        console.log(`✅ Transcripciones recibidas: ${meeting.audioTranscriptions.length}`);
        meeting.audioTranscriptions.forEach((t, index) => {
          console.log(`   ${index + 1}. ${t.userName}: ${t.text.substring(0, 100)}...`);
        });
      }
      console.log(`👥 Participantes en la reunión:`, allParticipants.map(p => ({
        userId: p.userId,
        userName: p.userName,
        email: p.userEmail || 'no disponible',
        joinedAt: p.joinedAt,
        leftAt: p.leftAt || 'aún activo'
      })));

      console.log(`📝 Generando resumen para reunión ${meetingId}...`);
      const summary = await this.summaryGenerator.generateSummary(meeting);
      console.log(`✅ Resumen generado exitosamente para ${meetingId}`);

      // Obtener emails de TODOS los participantes que estuvieron en la reunión
      console.log(`📧 Obteniendo emails de ${summary.participants.length} participantes...`);
      const participantEmails: string[] = [];
      const emailsSet = new Set<string>(); // Para evitar duplicados
      
      for (const participant of summary.participants) {
        let email: string | null = null;
        
        // Primero intentar usar el email que ya está en el participante
        if (participant.userEmail) {
          email = participant.userEmail;
          console.log(`  ✓ Email encontrado en datos de participante ${participant.userName}: ${email}`);
        } else {
          // Si no está, intentar obtener desde Firebase
          try {
            email = await getUserEmail(participant.userId);
            if (email) {
              console.log(`  ✓ Email obtenido desde Firebase para ${participant.userName}: ${email}`);
            } else {
              console.warn(`  ⚠️ No se encontró email para participante ${participant.userName} (${participant.userId})`);
            }
          } catch (error) {
            console.error(`  ❌ Error obteniendo email de Firebase para ${participant.userId}:`, error);
          }
        }
        
        // Agregar email si existe y no está duplicado
        if (email && !emailsSet.has(email.toLowerCase())) {
          participantEmails.push(email);
          emailsSet.add(email.toLowerCase());
        }
      }

      console.log(`📧 Total de emails únicos obtenidos: ${participantEmails.length} de ${summary.participants.length} participantes`);
      console.log(`📧 Emails a los que se enviará: ${participantEmails.join(', ')}`);

      if (participantEmails.length > 0) {
        console.log(`📤 Enviando resumen a: ${participantEmails.join(', ')}`);
        await this.emailService.sendSummaryEmail(summary, participantEmails);
        console.log(
          `✅ Resumen guardado en Firebase para envío a ${participantEmails.length} participantes`
        );
      } else {
        console.warn('⚠️ No se encontraron emails de participantes - el resumen no se enviará');
        console.warn('💡 Sugerencia: Verifica que Firebase esté configurado o que los participantes tengan email');
      }

      // Aquí podrías guardar el resumen en una base de datos si lo deseas
      // await this.saveSummary(summary);
    } catch (error) {
      console.error(`❌ Error finalizando reunión ${meetingId}:`, error);
      if (error instanceof Error) {
        console.error(`   Mensaje: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
      }
    } finally {
      // Remover de la lista de finalización después de un delay
      setTimeout(() => {
        this.finalizingMeetings.delete(meetingId);
      }, 5000); // 5 segundos de protección
    }
  }
}

