# 📱 Guía de Integración del Frontend con el Servicio de IA

## 🎯 Objetivo

Conectar el frontend directamente al servicio de IA para enviar eventos de reuniones y generar resúmenes automáticos.

## 🔌 Conexión al Servicio de IA

### 1. Agregar variable de entorno

En `Front copia/.env`:

```env
# Servicio de IA para resúmenes
VITE_AI_SERVICE_URL=http://localhost:4001
```

### 2. Crear servicio de conexión

Crea un nuevo archivo `Front copia/src/services/aiService.ts`:

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
    console.log(`📤 Enviado join-meeting: ${meetingId} - ${userId}`);
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
    console.log(`📤 Enviado leave-meeting: ${meetingId} - ${userId}`);
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
    console.log(`📤 Enviado chat-message a servicio de IA`);
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
    console.log(`📤 Enviado audio-transcription a servicio de IA`);
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

## 🔧 Integración en Componentes

### En `VideoConference.tsx` o donde se maneje la reunión:

```typescript
import { useEffect } from 'react';
import { aiService } from '../services/aiService';
import { useAuth } from '../hooks/useAuth';

export default function VideoConference() {
  const { user } = useAuth();
  const meetingId = 'tu-meeting-id';
  const userId = user?.uid || '';
  const userName = user?.name || 'Usuario';

  // Conectar al servicio de IA cuando se monta el componente
  useEffect(() => {
    aiService.connect();

    // Enviar evento de unión
    if (meetingId && userId) {
      aiService.emitJoinMeeting(meetingId, userId, userName);
    }

    // Desconectar cuando se desmonta
    return () => {
      aiService.emitLeaveMeeting(meetingId, userId);
      // No desconectamos completamente para mantener la conexión activa
    };
  }, [meetingId, userId, userName]);

  // ... resto del código
}
```

### En el componente de Chat (`ChatRoom.tsx`):

```typescript
import { aiService } from '../services/aiService';

// En la función que envía mensajes
const handleSendMessage = (message: string) => {
  // ... código existente para enviar al backend de chat
  
  // También enviar al servicio de IA
  aiService.emitChatMessage(meetingId, userId, userName, message);
};
```

## 🎤 Transcripciones de Audio (Opcional)

Si quieres transcribir audio en tiempo real, agrega esto:

```typescript
import { useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';

export function useAudioTranscription(meetingId: string, userId: string, userName: string) {
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Verificar si el navegador soporta Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('⚠️ Tu navegador no soporta reconocimiento de voz');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');

      // Enviar transcripción al servicio de IA cada vez que haya resultado
      if (transcript.trim().length > 0) {
        aiService.emitAudioTranscription(meetingId, userId, userName, transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Error en reconocimiento de voz:', event.error);
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [meetingId, userId, userName]);
}
```

Luego úsalo en `VideoConference.tsx`:

```typescript
import { useAudioTranscription } from '../hooks/useAudioTranscription';

export default function VideoConference() {
  // ... código existente
  
  // Agregar transcripción de audio
  useAudioTranscription(meetingId, userId, userName);
  
  // ... resto del código
}
```

## ✅ Checklist de Integración

- [ ] Agregar `VITE_AI_SERVICE_URL` en `.env`
- [ ] Crear `src/services/aiService.ts`
- [ ] Conectar en componente de reunión
- [ ] Enviar `join-meeting` al unirse
- [ ] Enviar `leave-meeting` al salir
- [ ] Enviar `chat-message` en cada mensaje
- [ ] (Opcional) Agregar transcripción de audio

## 🔍 Verificación

Cuando el frontend se conecte, deberías ver en la consola del servicio de IA:

```
✅ Cliente conectado al servicio de IA: [socket-id]
👤 Usuario [userId] se unió a reunión [meetingId]
💬 Mensaje agregado a [meetingId]: [userName]
```

## 📝 Notas

- El servicio de IA funciona independientemente del backend de chat
- Puedes mantener ambas conexiones (chat backend + servicio de IA)
- Los eventos se procesan en tiempo real
- Los resúmenes se generan automáticamente al finalizar



