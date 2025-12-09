# 📱 Integración del Frontend con el Servicio de IA

## ✅ ¿Qué necesitas hacer?

El frontend debe conectarse al servicio de IA y enviar eventos para que se generen los resúmenes automáticos.

## 🔧 Pasos de Integración

### 1. Agregar variable de entorno

En tu archivo `.env` del frontend (o `.env.local`):

```env
# Servicio de IA para resúmenes automáticos
VITE_AI_SERVICE_URL=http://localhost:4001
```

**Para producción**, cambia a la URL de Render:
```env
VITE_AI_SERVICE_URL=https://tu-servicio-ia.onrender.com
```

### 2. Crear servicio de conexión

Crea un archivo `src/services/aiService.ts` (o similar):

```typescript
import { io, Socket } from 'socket.io-client';

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:4001';

class AIService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  /**
   * Conecta al servicio de IA
   */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    console.log('🔌 Conectando al servicio de IA...');
    this.socket = io(AI_SERVICE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Conectado al servicio de IA');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Desconectado del servicio de IA');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error conectando al servicio de IA:', error.message);
    });

    return this.socket;
  }

  /**
   * Desconecta del servicio de IA
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Envía evento de usuario unido a reunión
   */
  emitJoinMeeting(meetingId: string, userId: string, userName?: string): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Servicio de IA no conectado, no se puede enviar join-meeting');
      return;
    }

    this.socket.emit('join-meeting', {
      meetingId,
      userId,
      userName: userName || `Usuario ${userId.substring(0, 8)}`,
    });
    console.log(`📤 [IA] Usuario ${userId} se unió a reunión ${meetingId}`);
  }

  /**
   * Envía evento de usuario salido de reunión
   */
  emitLeaveMeeting(meetingId: string, userId: string): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Servicio de IA no conectado, no se puede enviar leave-meeting');
      return;
    }

    this.socket.emit('leave-meeting', {
      meetingId,
      userId,
    });
    console.log(`📤 [IA] Usuario ${userId} salió de reunión ${meetingId}`);
  }

  /**
   * Envía mensaje de chat
   */
  emitChatMessage(
    meetingId: string,
    userId: string,
    userName: string,
    message: string
  ): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Servicio de IA no conectado, no se puede enviar chat-message');
      return;
    }

    this.socket.emit('chat-message', {
      meetingId,
      userId,
      userName,
      message,
      timestamp: new Date().toISOString(),
    });
    console.log(`📤 [IA] Mensaje de chat enviado`);
  }

  /**
   * Envía transcripción de audio
   */
  emitAudioTranscription(
    meetingId: string,
    userId: string,
    userName: string,
    transcription: string
  ): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Servicio de IA no conectado, no se puede enviar audio-transcription');
      return;
    }

    this.socket.emit('audio-transcription', {
      meetingId,
      userId,
      userName,
      transcription,
      timestamp: new Date().toISOString(),
    });
    console.log(`📤 [IA] Transcripción de audio enviada`);
  }

  /**
   * Verifica si está conectado
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }
}

// Exportar instancia singleton
export const aiService = new AIService();
```

### 3. Integrar en tu componente de reunión

En el componente donde manejas la reunión (ej: `VideoConference.tsx`, `MeetingRoom.tsx`):

```typescript
import { useEffect } from 'react';
import { aiService } from '../services/aiService';
import { useAuth } from '../hooks/useAuth'; // o tu hook de autenticación

export default function VideoConference() {
  const { user } = useAuth();
  const meetingId = 'tu-meeting-id'; // Obtener del contexto/params
  const userId = user?.uid || user?.id || '';
  const userName = user?.name || user?.displayName || 'Usuario';

  // Conectar al servicio de IA cuando se monta el componente
  useEffect(() => {
    // Conectar al servicio de IA
    aiService.connect();

    // Enviar evento de unión cuando se une a la reunión
    if (meetingId && userId) {
      aiService.emitJoinMeeting(meetingId, userId, userName);
    }

    // Limpiar cuando se desmonta
    return () => {
      if (meetingId && userId) {
        aiService.emitLeaveMeeting(meetingId, userId);
      }
    };
  }, [meetingId, userId, userName]);

  // ... resto del código
}
```

### 4. Integrar en el componente de chat

En el componente donde se envían mensajes de chat:

```typescript
import { aiService } from '../services/aiService';

// En la función que envía mensajes
const handleSendMessage = (message: string) => {
  // ... tu código existente para enviar al backend de chat
  
  // ✅ AGREGAR: También enviar al servicio de IA
  aiService.emitChatMessage(meetingId, userId, userName, message);
};
```

### 5. (Opcional) Integrar transcripciones de audio

Si quieres transcribir audio en tiempo real, agrega esto donde manejas el audio:

```typescript
import { aiService } from '../services/aiService';

// Ejemplo con Web Speech API
const recognition = new (window as any).webkitSpeechRecognition();
recognition.continuous = true;
recognition.lang = 'es-ES';

recognition.onresult = (event: any) => {
  const text = event.results[event.results.length - 1][0].transcript;
  
  // Enviar transcripción al servicio de IA
  aiService.emitAudioTranscription(meetingId, userId, userName, text);
};

// Iniciar reconocimiento
recognition.start();
```

## 📋 Eventos que el Frontend debe enviar

| Evento | Cuándo enviarlo | Datos requeridos |
|--------|----------------|------------------|
| `join-meeting` | Cuando un usuario se une a la reunión | `meetingId`, `userId`, `userName` (opcional) |
| `leave-meeting` | Cuando un usuario sale de la reunión | `meetingId`, `userId` |
| `chat-message` | Cuando se envía un mensaje de chat | `meetingId`, `userId`, `userName`, `message`, `timestamp` |
| `audio-transcription` | Cuando hay una transcripción de audio | `meetingId`, `userId`, `userName`, `transcription`, `timestamp` |

## ✅ Verificación

Después de integrar, deberías ver en la consola del frontend:
- `🔌 Conectando al servicio de IA...`
- `✅ Conectado al servicio de IA`
- `📤 [IA] Usuario X se unió a reunión Y`

Y en la consola del servicio de IA:
- `✅ Cliente conectado al servicio de IA: [socket-id]`
- `👤 Usuario X se unió a reunión Y`
- `💬 Mensaje agregado a Y: [usuario]`

## 🚨 Importante

- El frontend debe conectarse al servicio de IA **además** de conectarse al backend de chat
- Los eventos se envían a **ambos** servicios (backend de chat y servicio de IA)
- El servicio de IA solo escucha, no modifica nada en el backend

## 📝 Resumen

1. ✅ Agregar `VITE_AI_SERVICE_URL` al `.env`
2. ✅ Crear `aiService.ts` con la conexión Socket.IO
3. ✅ Llamar `aiService.connect()` cuando se inicia la reunión
4. ✅ Enviar `join-meeting` cuando alguien se une
5. ✅ Enviar `leave-meeting` cuando alguien sale
6. ✅ Enviar `chat-message` cuando hay mensajes
7. ✅ (Opcional) Enviar `audio-transcription` si transcribes audio

¡Listo! Con esto el servicio de IA recibirá todos los eventos y generará resúmenes automáticos. 🎉



