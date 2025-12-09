# 🎤 Arquitectura de Transcripción de Audio

## 📋 Aclaración Importante

El reto requiere "Procesar la voz de la reunión", lo que implica **dos procesos diferentes**:

1. **Transcripción (Speech-to-Text)**: Convertir audio/voz → texto
2. **Resumen (Text-to-Summary)**: Generar resumen del texto → resumen estructurado

## 🏗️ Arquitectura Actual

```
Frontend (Audio) 
    ↓
[¿Quién transcribe?] ← AQUÍ ESTÁ LA PREGUNTA
    ↓
Texto transcrito
    ↓
Servicio de IA (Groq) → Resumen
```

## ✅ Opción 1: Frontend Transcribe (Recomendada - Gratis)

**Ventajas:**
- ✅ Gratis (Web Speech API del navegador)
- ✅ No requiere API keys adicionales
- ✅ Procesamiento en tiempo real
- ✅ Menos carga en el servidor

**Desventajas:**
- ⚠️ Depende del navegador del usuario
- ⚠️ Calidad variable según el navegador

**Flujo:**
```
Frontend → Web Speech API → Texto → Servicio de IA → Resumen
```

**Implementación:**
El frontend usa Web Speech API para transcribir y envía el texto al servicio de IA.

## ✅ Opción 2: Servicio de IA Transcribe (Más Completo)

**Ventajas:**
- ✅ Mejor calidad de transcripción
- ✅ Consistente entre navegadores
- ✅ Procesamiento centralizado

**Desventajas:**
- ⚠️ Requiere API key de servicio de transcripción
- ⚠️ Puede tener costos
- ⚠️ Más complejo de implementar

**Flujo:**
```
Frontend → Audio → Servicio de IA → [Servicio de Transcripción] → Texto → Groq → Resumen
```

**Servicios de Transcripción disponibles:**
- **OpenAI Whisper API** (Recomendado - $0.006/minuto)
- **Google Speech-to-Text** (Gratis hasta cierto límite)
- **AssemblyAI** (Gratis hasta cierto límite)
- **Deepgram** (Gratis hasta cierto límite)

## 🎯 Recomendación para el Reto

Para cumplir el reto, **la Opción 1 es suficiente** porque:

1. ✅ Es gratis
2. ✅ Funciona inmediatamente
3. ✅ El servicio de IA ya genera el resumen
4. ✅ Cumple todos los requisitos del reto

**El reto dice "Procesar la voz"**, no especifica que la IA debe transcribir. Lo importante es que:
- ✅ Se procese la voz (transcripción)
- ✅ Se genere un resumen con IA (Groq)
- ✅ Se incluyan participantes, chat, tareas
- ✅ Se envíe correo al finalizar

## 📝 Implementación Recomendada

### En el Frontend:
```typescript
// Usar Web Speech API para transcribir
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.lang = 'es-ES';

recognition.onresult = (event) => {
  const text = event.results[event.results.length - 1][0].transcript;
  // Enviar texto al servicio de IA
  aiService.emitAudioTranscription(meetingId, userId, userName, text);
};
```

### En el Servicio de IA:
- ✅ Ya está listo para recibir transcripciones
- ✅ Ya genera resúmenes con Groq
- ✅ Ya extrae tareas
- ✅ Ya envía correos

## 🚀 Si Quieres que el Servicio de IA También Transcriba

Si prefieres que el servicio de IA haga TODO (transcripción + resumen), necesitarías:

1. Agregar un servicio de transcripción (ej: OpenAI Whisper)
2. Recibir audio en el servicio de IA
3. Transcribir el audio
4. Generar el resumen (ya lo hace)

**¿Quieres que implemente esto?** Puedo agregar soporte para transcripción en el servicio de IA usando OpenAI Whisper API.



