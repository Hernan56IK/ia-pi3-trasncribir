# 🔧 Modificación Mínima del Backend

## 📋 Situación Actual

El backend original no emite los eventos que el servicio de IA necesita. Necesitamos agregar emisiones mínimas sin modificar la lógica existente.

## ✅ Solución: Agregar Emisiones de Eventos

Solo necesitas agregar **líneas de código** donde ya manejas usuarios uniéndose/saliendo. No necesitas cambiar la lógica existente.

## 🔨 Pasos a Seguir

### 1. Busca dónde se manejan estos eventos en tu backend:

- Usuario se une a una reunión
- Usuario sale de una reunión  
- Usuario envía un mensaje de chat

### 2. Agrega estas líneas (ejemplo):

```javascript
// Cuando un usuario se une (busca donde manejas esto)
// ANTES (tu código existente):
socket.on('join-room', (data) => {
  const { meetingId, userId } = data;
  socket.join(meetingId);
  // ... tu código existente ...
});

// DESPUÉS (agrega solo esta línea):
socket.on('join-room', (data) => {
  const { meetingId, userId } = data;
  socket.join(meetingId);
  // ... tu código existente ...
  
  // ✅ AGREGAR ESTA LÍNEA:
  io.emit('join-meeting', { meetingId, userId });
});
```

```javascript
// Cuando un usuario sale (busca donde manejas esto)
// ANTES (tu código existente):
socket.on('leave-room', (data) => {
  const { meetingId, userId } = data;
  socket.leave(meetingId);
  // ... tu código existente ...
});

// DESPUÉS (agrega solo esta línea):
socket.on('leave-room', (data) => {
  const { meetingId, userId } = data;
  socket.leave(meetingId);
  // ... tu código existente ...
  
  // ✅ AGREGAR ESTA LÍNEA:
  io.emit('leave-meeting', { meetingId, userId });
});
```

```javascript
// Cuando hay un mensaje de chat (busca donde manejas esto)
// ANTES (tu código existente):
socket.on('send-message', (data) => {
  const { meetingId, userId, userName, message } = data;
  // ... tu código existente ...
  io.to(meetingId).emit('new-message', data);
});

// DESPUÉS (agrega solo esta línea):
socket.on('send-message', (data) => {
  const { meetingId, userId, userName, message } = data;
  // ... tu código existente ...
  io.to(meetingId).emit('new-message', data);
  
  // ✅ AGREGAR ESTAS LÍNEAS:
  io.emit('chat-message', {
    meetingId,
    userId,
    userName,
    message,
    timestamp: new Date().toISOString()
  });
});
```

## 📝 Ejemplo Completo

Si tu backend tiene algo como esto:

```javascript
io.on('connection', (socket) => {
  // Usuario se une
  socket.on('join-room', (data) => {
    socket.join(data.meetingId);
    // Tu código existente
  });

  // Usuario sale
  socket.on('disconnect', () => {
    // Tu código existente
  });

  // Mensaje de chat
  socket.on('message', (data) => {
    io.to(data.meetingId).emit('message', data);
    // Tu código existente
  });
});
```

Solo agrega las emisiones:

```javascript
io.on('connection', (socket) => {
  // Usuario se une
  socket.on('join-room', (data) => {
    socket.join(data.meetingId);
    // Tu código existente
    
    // ✅ AGREGAR:
    io.emit('join-meeting', { 
      meetingId: data.meetingId, 
      userId: data.userId || socket.id 
    });
  });

  // Usuario sale
  socket.on('disconnect', () => {
    // Tu código existente
    // Si tienes forma de obtener meetingId y userId aquí:
    // io.emit('leave-meeting', { meetingId, userId });
  });

  // Mensaje de chat
  socket.on('message', (data) => {
    io.to(data.meetingId).emit('message', data);
    // Tu código existente
    
    // ✅ AGREGAR:
    io.emit('chat-message', {
      meetingId: data.meetingId,
      userId: data.userId,
      userName: data.userName || 'Usuario',
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });
});
```

## ⚠️ Importante

- Solo agrega `io.emit(...)` - no modifiques tu código existente
- Usa `io.emit` (no `socket.emit`) para que el servicio de IA lo reciba
- Los nombres de eventos deben ser exactamente: `join-meeting`, `leave-meeting`, `chat-message`

## 🧪 Prueba

Después de agregar las emisiones:

1. Reinicia el backend
2. Reinicia el servicio de IA
3. Únete a una reunión desde el frontend
4. Deberías ver en los logs del servicio de IA:
   ```
   🔔 Evento recibido: join-meeting
   👤 Usuario ... se unió a reunión ...
   ```

## 📞 Si no puedes modificar el backend

Si realmente no puedes modificar el backend, necesitaríamos:
- Crear endpoints REST en el backend que el servicio de IA consulte periódicamente
- O usar otra estrategia de integración

Pero la solución más simple es agregar esas 3-4 líneas de código en el backend.



