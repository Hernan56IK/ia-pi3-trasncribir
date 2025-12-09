# 📱 Configuración del Frontend

## ✅ Respuesta Corta: **NO necesita hacer nada para la funcionalidad básica**

El servicio de IA funciona **automáticamente** escuchando eventos del backend principal. El frontend **NO necesita conectarse directamente** al servicio de IA.

## 🏗️ Cómo Funciona

```
Frontend → Backend Principal (puerto 3000) → Emite eventos Socket.IO
                                              ↓
                                    Servicio de IA (puerto 4001)
                                    Escucha automáticamente
```

## 📋 Configuración Actual del Frontend

Tu frontend ya está configurado correctamente:

```env
# Frontend .env (ya configurado)
VITE_API_URL=http://localhost:3000          # Backend principal
VITE_CHAT_SERVER_URL=http://localhost:4000 # Backend de chat
```

**No necesitas agregar nada para el servicio de IA** porque:
- El frontend se conecta al backend principal (puerto 3000)
- El backend principal emite eventos Socket.IO
- El servicio de IA escucha esos eventos automáticamente

## 🎤 Opcional: Transcripciones de Audio Directas

Si quieres que el frontend envíe transcripciones de audio **directamente** al servicio de IA (sin pasar por el backend), entonces SÍ necesitarías agregar:

### 1. Variable de entorno en el frontend:

```env
# Agregar en Front copia/.env
VITE_AI_SERVICE_URL=http://localhost:4001
```

### 2. Código en el frontend (opcional):

```typescript
// En el componente de video o hook
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:4001';

// Enviar transcripción
async function sendTranscription(meetingId: string, userId: string, userName: string, text: string) {
  try {
    await fetch(`${AI_SERVICE_URL}/api/audio/transcription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingId,
        userId,
        userName,
        transcription: text,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('Error enviando transcripción:', error);
  }
}
```

## ✅ Resumen

### Para Funcionalidad Básica (Chat):
- ❌ **NO necesita hacer nada**
- El servicio de IA escucha automáticamente
- Los resúmenes se generan automáticamente
- Los emails se envían automáticamente

### Para Transcripciones de Audio (Opcional):
- ✅ Agregar `VITE_AI_SERVICE_URL=http://localhost:4001` en `.env`
- ✅ Usar el código de ejemplo arriba (opcional)

## 🔍 Verificar que Funciona

1. **Backend Principal** corriendo en puerto 3000 ✅
2. **Backend de Chat** corriendo en puerto 4000 ✅
3. **Servicio de IA** corriendo en puerto 4001 ✅
4. **Frontend** conectado al backend principal ✅

El servicio de IA debería mostrar en consola:
```
✅ Conectado al backend principal: http://localhost:3000
✅ Listeners de Socket.IO configurados
```

Cuando alguien se una a una reunión, deberías ver:
```
👤 Usuario xxx se unió a reunión yyy
```

## 🎯 Conclusión

**Para empezar, NO necesitas modificar el frontend.** El servicio de IA funciona automáticamente escuchando los eventos que ya emite tu backend principal.

Solo si quieres enviar transcripciones de audio directamente, entonces agrega la variable de entorno y el código opcional.



