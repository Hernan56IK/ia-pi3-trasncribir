# 🔍 Guía de Debug - Servicio de IA

## ❌ Problema: No se envía el correo cuando todos salen

### ✅ Pasos para verificar:

## 1. Verificar que el servicio de IA esté corriendo

```bash
# En la terminal del servicio de IA
npm run dev
```

**Deberías ver:**
```
🚀 Servicio de IA corriendo en puerto 4001
🔌 Intentando conectar al backend: http://localhost:4000
✅ Conectado al backend principal: http://localhost:4000
✅ Listeners de Socket.IO configurados
📡 Listeners de Socket.IO configurados
```

## 2. Verificar la configuración del backend

Crea un archivo `.env` en la raíz del proyecto con:

```env
BACKEND_SOCKET_URL=http://localhost:4000
GEMINI_API_KEY=tu-api-key-aqui
PORT=4001
```

**⚠️ IMPORTANTE:** El `BACKEND_SOCKET_URL` debe apuntar al puerto donde corre tu backend de chat (según tus logs es el puerto 4000).

## 3. Verificar que el backend emita los eventos correctos

El servicio de IA escucha estos eventos:

- `join-meeting` - Cuando un usuario se une
- `leave-meeting` - Cuando un usuario sale
- `chat-message` - Cuando hay un mensaje de chat
- `audio-transcription` - Cuando hay transcripción de audio

**Si tu backend emite eventos con nombres diferentes**, el servicio ahora también escucha:
- `user-joined` - Evento alternativo
- `user-left` - Evento alternativo

## 4. Logs esperados cuando funciona correctamente

### Cuando un usuario se une:
```
🔔 Evento recibido: join-meeting { meetingId: '...', userId: '...' }
👤 Usuario ... se unió a reunión ...
📝 Iniciado tracking de reunión: ...
```

### Cuando hay un mensaje de chat:
```
🔔 Evento recibido: chat-message { ... }
💬 Mensaje agregado a ...: ...
```

### Cuando un usuario sale:
```
🔔 Evento recibido: leave-meeting { meetingId: '...', userId: '...' }
👋 Usuario ... salió de reunión ...
📊 Reunión ...: 0 participantes activos de 2 totales
🏁 Reunión ... finalizada (sin participantes activos)
🔍 Estado de reunión ...: { exists: true, isActive: false, ... }
🚀 Iniciando finalización de reunión ...
📝 Generando resumen para reunión ...
✅ Resumen generado exitosamente
📧 Obteniendo emails de 2 participantes...
✅ Resumen guardado en Firebase para envío a 2 participantes
```

## 5. Problemas comunes y soluciones

### ❌ No veo logs del servicio de IA

**Problema:** El servicio no está corriendo o no está conectado.

**Solución:**
1. Verifica que el servicio esté corriendo: `npm run dev`
2. Verifica que veas: `✅ Conectado al backend principal`
3. Si no se conecta, verifica el `BACKEND_SOCKET_URL` en `.env`

### ❌ No veo eventos "join-meeting" o "leave-meeting"

**Problema:** El backend no está emitiendo esos eventos o usa nombres diferentes.

**Solución:**
1. El servicio ahora escucha TODOS los eventos y los muestra en consola
2. Busca en los logs: `🔔 Evento recibido: ...`
3. Si ves eventos con otros nombres, necesitamos ajustar el código

### ❌ Veo "⚠️ No se encontraron emails de participantes"

**Problema:** Los participantes no tienen email configurado o Firebase no está configurado.

**Solución:**
1. Verifica que Firebase esté configurado en `.env`
2. Verifica que los usuarios tengan email en Firebase
3. El resumen se guarda en Firestore aunque no haya emails

### ❌ Veo errores de Firebase

**Problema:** Firebase no está configurado correctamente.

**Solución:**
1. Verifica las variables de entorno de Firebase
2. El servicio funciona sin Firebase, pero no enviará emails
3. Los resúmenes se guardan en Firestore en `email_queue` y `meeting_summaries`

## 6. Verificar en Firestore

Después de que todos salgan, verifica en Firebase Console:

1. Ve a Firestore Database
2. Busca la colección `email_queue` - debería tener un documento nuevo
3. Busca la colección `meeting_summaries` - debería tener el resumen guardado

## 7. Prueba manual

Puedes probar enviando un evento directamente desde el backend o usando el endpoint REST:

```bash
# Enviar transcripción de prueba
curl -X POST http://localhost:4001/api/audio/transcription \
  -H "Content-Type: application/json" \
  -d '{
    "meetingId": "test-123",
    "userId": "user-1",
    "userName": "Juan",
    "transcription": "Hola, vamos a discutir el proyecto nuevo"
  }'
```

## 📝 Checklist de verificación

- [ ] Servicio de IA corriendo en puerto 4001
- [ ] Backend de chat corriendo en puerto 4000
- [ ] `.env` configurado con `BACKEND_SOCKET_URL=http://localhost:4000`
- [ ] Veo `✅ Conectado al backend principal` en los logs
- [ ] Veo eventos `🔔 Evento recibido:` cuando interactúo con la app
- [ ] Veo `👤 Usuario ... se unió` cuando alguien se une
- [ ] Veo `👋 Usuario ... salió` cuando alguien sale
- [ ] Veo `🏁 Reunión ... finalizada` cuando todos salen
- [ ] Veo `📝 Generando resumen` después de que todos salen
- [ ] Veo `✅ Resumen guardado en Firebase` al finalizar
- [ ] Verifico en Firestore que se guardó en `email_queue`

## 🆘 Si nada funciona

Comparte estos logs:
1. Logs del servicio de IA (terminal donde corre `npm run dev`)
2. Logs del backend de chat
3. Logs del frontend (consola del navegador)

Con esos logs podremos identificar exactamente dónde está el problema.



