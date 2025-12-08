import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectToBackend } from './config/socket.client';
import { SocketListener } from './listeners/SocketListener';
import { initializeFirebase } from './config/firebase';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4000;

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

// Endpoint para recibir transcripciones de audio (opcional)
app.post('/api/audio/transcription', (req, res) => {
  const { meetingId, userId, userName, transcription, timestamp } = req.body;

  if (!meetingId || !userId || !userName || !transcription) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  // Emitir evento de transcripción (si el socket está conectado)
  const socket = connectToBackend();
  socket.emit('audio-transcription', {
    meetingId,
    userId,
    userName,
    transcription,
    timestamp: timestamp || new Date().toISOString(),
  });

  res.json({ success: true, message: 'Transcripción recibida' });
});

// Inicializar Firebase (opcional, para obtener emails)
try {
  initializeFirebase();
} catch (error) {
  console.warn('⚠️ Firebase no inicializado:', error);
}

// Inicializar Socket.IO client y listeners
const socket = connectToBackend();
const socketListener = new SocketListener();
socketListener.setupListeners(socket);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servicio de IA corriendo en puerto ${PORT}`);
  console.log(`📡 Conectándose al backend: ${process.env.BACKEND_SOCKET_URL}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
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

