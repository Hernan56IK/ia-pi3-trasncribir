# 🧭 Guía de instalación y configuración del servicio de IA

Esta guía explica cómo levantar el backend, configurar las dependencias y entender cómo está organizado el código.

## 1. Requisitos
- Node.js 18 o superior (incluye `File`/`Blob` nativos que usa la transcripción).
- npm 9+.
- Acceso al backend principal (Socket.IO) si quieres escuchar eventos en tiempo real.
- Claves API según proveedor:
  - Groq (`GROQ_API_KEY`) para resúmenes y transcripción (modelo whisper).
  - OpenAI (`OPENAI_API_KEY`) solo si quieres usar Whisper como respaldo.
- Credenciales de Firebase si deseas enviar correos (Brevo) y obtener emails de usuarios.

## 2. Instalación
```bash
npm install
```

## 3. Variables de entorno
Copia el ejemplo y edita:
```bash
cp .env.example .env
```
Campos clave:
- `BACKEND_SOCKET_URL`: URL del backend principal con Socket.IO.
- Transcripción:
  - `TRANSCRIPTION_PROVIDERS=groq,openai` (prioridad de izquierda a derecha).
  - `GROQ_API_KEY`, `GROQ_WHISPER_MODEL=whisper-large-v3`.
  - `OPENAI_API_KEY`, `OPENAI_WHISPER_MODEL=whisper-1` (opcional).
- Resúmenes (Groq chat): `GROQ_MODEL` (ej. `llama-3.1-8b-instant`).
- Firebase: `FIREBASE_*` para obtener correos y enviar por Brevo.
- Brevo (correo): `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`.
- Servidor: `PORT` (por defecto 4001).

## 4. Scripts útiles
- `npm run dev`: desarrollo con recarga (`ts-node-dev`).
- `npm run build`: compila a `dist/`.
- `npm start`: ejecuta el build (`dist/server.js`).

## 5. Cómo se ejecuta el servicio
1) Express expone:
   - `GET /health`
   - `POST /api/audio/transcribe` (recibe audio base64, transcribe con Groq/OpenAI).
   - `POST /api/audio/transcription` (recibe texto ya transcrito).
2) Levanta un servidor Socket.IO propio para que el frontend se conecte y envíe eventos.
3) Opcional: se conecta como cliente a `BACKEND_SOCKET_URL` para escuchar eventos del backend principal.

## 6. Flujo de datos (alto nivel)
1. El frontend o backend emite eventos `join-meeting`, `chat-message`, `audio-to-transcribe` o `audio-transcription`.
2. `SocketListener` los recibe y pasa a `MeetingTracker`.
3. Transcripción:
   - `audio-to-transcribe`: recibe audio base64, lo envía a `AudioTranscriptionService` (Groq/OpenAI) y guarda el texto.
   - `audio-transcription` o `POST /api/audio/transcription`: ya llega texto, se guarda directo.
4. Al salir todos los participantes, `SocketListener.finalizeMeeting`:
   - genera resumen con `SummaryGenerator` (Groq chat),
   - extrae tareas,
   - busca correos en Firebase y envía via `EmailService`.

## 7. Arquitectura de carpetas (resumen)
- `src/server.ts`: Express + Socket.IO server; endpoints REST; configura listener compartido.
- `src/listeners/SocketListener.ts`: registra listeners de eventos de reunión y finaliza enviando resumen.
- `src/services/MeetingTracker.ts`: almacena estado en memoria (participantes, chat, transcripciones).
- `src/services/SummaryGenerator.ts`: arma prompt y llama a Groq para el resumen y tareas; fallback básico si falla la IA.
- `src/services/AudioTranscriptionService.ts`: transcripción multi-proveedor (Groq Whisper primero, OpenAI como respaldo) con reintentos.
- `src/services/EmailService.ts`: envía correos usando Brevo (y guarda en Firebase si aplica).
- `src/config/groq.ts`: inicializa Groq chat (resúmenes).
- `src/config/firebase.ts`: inicializa Firebase Admin.
- `src/config/socket.client.ts`: cliente Socket.IO hacia el backend principal.
- `src/models/Meeting.ts`: tipos de datos (reunión, participante, transcripción, tareas, resumen).

## 8. Detalle por componente
- `server.ts`
  - Middlewares: `helmet`, `cors`, `morgan`, JSON.
  - Endpoints REST de transcripción (audio o texto).
  - Crea Socket.IO server para el frontend.
  - Intenta conectar como cliente al backend principal (opcional).
- `SocketListener`
  - Maneja `join-meeting`, `leave-meeting`, `chat-message`, `audio-to-transcribe`, `audio-transcription`.
  - Al quedar sin participantes, llama a `finalizeMeeting` → `SummaryGenerator` + `EmailService`.
- `MeetingTracker`
  - Guarda reuniones en memoria con mapas; agrega participantes, chat y transcripciones; marca fin de reunión.
- `SummaryGenerator`
  - Combina chat + audio; prompt en español; reintentos contra Groq; extrae tareas (JSON); fallback sin IA si hay errores/ratelimit.
- `AudioTranscriptionService`
  - Prioriza Groq Whisper (`whisper-large-v3`); si falla, usa OpenAI Whisper.
  - Reintentos con backoff; convierte base64 a buffer y crea `File/Blob` según runtime.
- `EmailService`
  - Usa Brevo para enviar; puede apoyarse en Firebase para colas/emails.

## 9. Pruebas rápidas
1) Salud:
```bash
curl http://localhost:4001/health
```
2) Transcripción por texto (simulada):
```bash
curl -X POST http://localhost:4001/api/audio/transcription \
  -H "Content-Type: application/json" \
  -d '{"meetingId":"demo","userId":"u1","userName":"Alice","transcription":"Hola equipo, avance listo","timestamp":"2024-01-01T10:00:00Z"}'
```
3) Transcripción con audio base64 (usa Groq/OpenAI):
```bash
curl -X POST http://localhost:4001/api/audio/transcribe \
  -H "Content-Type: application/json" \
  -d '{"meetingId":"demo","userId":"u1","userName":"Alice","audioData":"<BASE64>"}'
```
4) Socket: conecta un cliente al puerto 4001 y emite `chat-message` y `audio-transcription` para verlos en logs.

## 10. Notas y buenas prácticas
- Si tu backend usa rooms, emite también en broadcast (`io.emit`) o haz que este servicio se una a las salas.
- Mantén `TRANSCRIPTION_PROVIDERS` en orden de preferencia; si falta una API key, saltará al siguiente.
- Este servicio guarda estado en memoria; reiniciar el proceso pierde reuniones activas.
- Para producción, configura correctamente CORS y las claves en Render u otro proveedor.


