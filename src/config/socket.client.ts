import { io, Socket } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_SOCKET_URL || 'http://localhost:3000';

let socketInstance: Socket | null = null;

/**
 * Conecta al backend principal como cliente Socket.IO
 */
export const connectToBackend = (): Socket => {
  if (socketInstance?.connected) {
    return socketInstance;
  }

  socketInstance = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    reconnectionDelayMax: 5000,
  });

  socketInstance.on('connect', () => {
    console.log(`✅ Conectado al backend principal: ${BACKEND_URL}`);
    console.log(`🆔 Socket ID del servicio de IA: ${socketInstance.id}`);
    console.log(`📡 Escuchando eventos del backend...`);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log(`❌ Desconectado del backend: ${reason}`);
  });

  socketInstance.on('connect_error', (error) => {
    console.error(`❌ Error de conexión al backend: ${error.message}`);
  });

  socketInstance.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Reconectado al backend (intento ${attemptNumber})`);
  });

  return socketInstance;
};

/**
 * Obtiene la instancia del socket
 */
export const getSocket = (): Socket | null => {
  return socketInstance;
};

/**
 * Desconecta del backend
 */
export const disconnectFromBackend = (): void => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};



