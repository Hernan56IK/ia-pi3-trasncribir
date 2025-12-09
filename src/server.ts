import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectToBackend, getSocket, isSocketConnected } from './config/socket.client';
import { SocketListener } from './listeners/SocketListener';
import { initializeFirebase } from './config/firebase';
import { MeetingTracker } from './services/MeetingTracker';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4001;

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: '*', // Permitir todos los orígenes
    credentials: false,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-meeting-summary-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Endpoint para recibir audio y transcribirlo con IA
app.post('/api/audio/transcribe', async (req, res) => {
  const { meetingId, userId, userName, audioData, timestamp } = req.body;

  // Validar campos requeridos
  if (!meetingId || !userId || !userName || !audioData) {
    console.error('❌ Audio inválido: faltan campos requeridos', {
      meetingId: !!meetingId,
      userId: !!userId,
      userName: !!userName,
      audioData: !!audioData,
    });
    return res.status(400).json({ error: 'Faltan campos requeridos: meetingId, userId, userName, audioData' });
  }

  console.log(`🎤 Audio recibido para transcripción de ${userName} en reunión ${meetingId}`);

  try {
    // Importar el servicio de transcripción
    const { AudioTranscriptionService } = await import('./services/AudioTranscriptionService');
    const transcriptionService = new AudioTranscriptionService();

    // Transcribir el audio con IA
    console.log(`🤖 Transcribiendo audio con proveedor configurado (Groq/OpenAI)...`);
    const transcription = await transcriptionService.transcribeAudio(audioData);
    console.log(`✅ Transcripción completada: ${transcription.substring(0, 100)}...`);

    // Procesar la transcripción usando el MeetingTracker compartido
    const meetingTracker = getSharedMeetingTracker();
    meetingTracker.addTranscription(meetingId, {
      text: transcription,
      userId,
      userName,
      timestamp: timestamp || new Date().toISOString(),
    });

    // Verificar que se agregó correctamente
    const meeting = meetingTracker.getMeeting(meetingId);
    if (meeting) {
      console.log(`✅ Transcripción procesada y agregada a reunión ${meetingId}. Total: ${meeting.audioTranscriptions.length}`);
      res.json({
        success: true,
        message: 'Audio transcrito y procesado exitosamente',
        transcription: transcription,
        totalTranscriptions: meeting.audioTranscriptions.length,
      });
    } else {
      console.error(`❌ Error: No se pudo verificar la transcripción en reunión ${meetingId}`);
      res.status(500).json({ error: 'Error verificando transcripción' });
    }
  } catch (error) {
    console.error('❌ Error transcribiendo audio:', error);
    if (error instanceof Error) {
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
    }
    res.status(500).json({
      error: 'Error transcribiendo audio',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

// Endpoint para recibir transcripciones de audio directamente del frontend (texto ya transcrito)
app.post('/api/audio/transcription', (req, res) => {
  const { meetingId, userId, userName, transcription, timestamp } = req.body;

  // Validar campos requeridos
  if (!meetingId || !userId || !userName || !transcription) {
    console.error('❌ Transcripción REST inválida: faltan campos requeridos', {
      meetingId: !!meetingId,
      userId: !!userId,
      userName: !!userName,
      transcription: !!transcription,
    });
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  // Validar que la transcripción no esté vacía
  if (!transcription.trim()) {
    console.warn('⚠️ Transcripción REST vacía recibida, ignorando...');
    return res.status(400).json({ error: 'La transcripción no puede estar vacía' });
  }

  console.log(`🎤 Transcripción recibida vía REST de ${userName} en reunión ${meetingId}: ${transcription.substring(0, 100)}...`);

  // Procesar directamente usando el MeetingTracker compartido
  try {
    const meetingTracker = getSharedMeetingTracker();
    meetingTracker.addTranscription(meetingId, {
      text: transcription.trim(),
      userId,
      userName,
      timestamp: timestamp || new Date().toISOString(),
    });
    
    // Verificar que se agregó correctamente
    const meeting = meetingTracker.getMeeting(meetingId);
    if (meeting) {
      console.log(`✅ Transcripción procesada y agregada a reunión ${meetingId}. Total: ${meeting.audioTranscriptions.length}`);
      res.json({ 
        success: true, 
        message: 'Transcripción recibida y procesada',
        totalTranscriptions: meeting.audioTranscriptions.length
      });
    } else {
      console.error(`❌ Error: No se pudo verificar la transcripción en reunión ${meetingId}`);
      res.status(500).json({ error: 'Error verificando transcripción' });
    }
  } catch (error) {
    console.error('❌ Error procesando transcripción:', error);
    if (error instanceof Error) {
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
    }
    res.status(500).json({ error: 'Error procesando transcripción' });
  }
});

// Inicializar Firebase (opcional, para obtener emails)
initializeFirebase();

// Crear servidor HTTP y Socket.IO server para recibir conexiones del frontend
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Crear un listener compartido para todos los clientes del frontend
// Esto asegura que todos los eventos se procesen en el mismo MeetingTracker
const sharedSocketListener = new SocketListener();

// Acceso al MeetingTracker para procesar transcripciones vía REST
// Necesitamos acceso al MeetingTracker interno del listener
const getSharedMeetingTracker = () => {
  return (sharedSocketListener as any).meetingTracker as MeetingTracker;
};

// Socket.IO server: Recibir eventos directamente del frontend
io.on('connection', (clientSocket) => {
  console.log(`✅ Cliente conectado al servicio de IA: ${clientSocket.id}`);

  // Crear un objeto compatible con socket.io-client para reutilizar los listeners
  const frontendSocket = {
    on: (event: string, callback: (...args: any[]) => void) => {
      clientSocket.on(event, callback);
    },
    emit: (event: string, ...args: any[]) => {
      clientSocket.emit(event, ...args);
    },
    id: clientSocket.id,
    connected: clientSocket.connected,
  } as any;

  // Configurar listeners para eventos del frontend usando el listener compartido
  sharedSocketListener.setupListeners(frontendSocket);

  clientSocket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado del servicio de IA: ${clientSocket.id}`);
  });
});

// Inicializar Socket.IO client (conexión al backend original - opcional)
// Intentar conectar al backend, pero no fallar si no está disponible
try {
  const socket = connectToBackend();
  const socketListener = new SocketListener();
  socketListener.setupListeners(socket);
  console.log('📡 Listeners de Socket.IO configurados (backend)');
} catch (error) {
  console.error('❌ Error configurando Socket.IO cliente:', error);
  console.warn('⚠️ El servicio continuará funcionando, pero no recibirá eventos del backend original');
}

// Iniciar servidor HTTP con Socket.IO
httpServer.listen(PORT, () => {
  console.log(`🚀 Servicio de IA corriendo en puerto ${PORT}`);
  console.log(`📡 Socket.IO server activo - Frontend puede conectarse a: http://localhost:${PORT}`);
  console.log(`📡 Conectándose al backend: ${process.env.BACKEND_SOCKET_URL || 'http://localhost:3000'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Manejo de error de puerto en uso
httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Error: El puerto ${PORT} ya está en uso.`);
    console.error(`💡 Solución: Cierra la aplicación que está usando el puerto ${PORT} o cambia el puerto en la variable de entorno PORT`);
    process.exit(1);
  } else {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;



