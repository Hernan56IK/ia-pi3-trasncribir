# 🔧 Configuración del Backend para el Servicio de IA

## 📋 Requisitos

El backend debe emitir eventos **broadcast** (a todos los clientes conectados) para que el servicio de IA los pueda escuchar.

## ✅ Eventos que el Servicio de IA Escucha

El servicio de IA está escuchando estos eventos:

1. **`join-meeting`** - Cuando un usuario se une a una reunión
2. **`leave-meeting`** - Cuando un usuario sale de una reunión
3. **`chat-message`** - Cuando hay un mensaje de chat
4. **`audio-transcription`** - Cuando hay una transcripción de audio (opcional)

## 🔨 Implementación en el Backend

### Opción 1: Emitir eventos broadcast (Recomendado)

```javascript
// Cuando un usuario se une a una reunión
io.emit('join-meeting', {
  meetingId: 'meeting-id-123',
  userId: 'user-id-456'
});

// Cuando un usuario sale de una reunión
io.emit('leave-meeting', {
  meetingId: 'meeting-id-123',
  userId: 'user-id-456'
});

// Cuando hay un mensaje de chat
io.emit('chat-message', {
  meetingId: 'meeting-id-123',
  userId: 'user-id-456',
  userName: 'Nombre Usuario',
  message: 'Mensaje del chat',
  timestamp: new Date().toISOString()
});
```

### Opción 2: Emitir a una sala específica (Si usas rooms)

```javascript
// Cuando un usuario se une
io.to(meetingId).emit('join-meeting', {
  meetingId: meetingId,
  userId: userId
});

// Cuando un usuario sale
io.to(meetingId).emit('leave-meeting', {
  meetingId: meetingId,
  userId: userId
});
```

**⚠️ IMPORTANTE:** Si usas rooms, el servicio de IA también debe unirse a la sala:

```javascript
// En el servicio de IA (ya está implementado, pero verifica)
socket.emit('join-room', meetingId);
```

### Opción 3: Emitir eventos alternativos (Ya implementado)

El servicio de IA también escucha estos eventos alternativos:

- `user-joined` - Evento alternativo para usuario unido
- `user-left` - Evento alternativo para usuario salido

```javascript
// Si tu backend emite estos eventos, también funcionará
io.emit('user-joined', {
  userId: 'user-id',
  socketId: socket.id,
  meetingId: 'meeting-id' // Opcional pero recomendado
});

io.emit('user-left', {
  userId: 'user-id',
  socketId: socket.id,
  meetingId: 'meeting-id' // Opcional pero recomendado
});
```

## 📝 Ejemplo Completo de Implementación

### Backend (Node.js/Express con Socket.IO)

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Cuando un cliente se conecta
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Usuario se une a una reunión
  socket.on('join-room', (data) => {
    const { meetingId, userId } = data;
    
    // Unirse a la sala
    socket.join(meetingId);
    
    // IMPORTANTE: Emitir broadcast para que el servicio de IA lo escuche
    io.emit('join-meeting', {
      meetingId: meetingId,
      userId: userId
    });
    
    // También puedes emitir solo a la sala si prefieres
    // io.to(meetingId).emit('join-meeting', { meetingId, userId });
  });

  // Usuario sale de la reunión
  socket.on('leave-room', (data) => {
    const { meetingId, userId } = data;
    
    // Salir de la sala
    socket.leave(meetingId);
    
    // IMPORTANTE: Emitir broadcast para que el servicio de IA lo escuche
    io.emit('leave-meeting', {
      meetingId: meetingId,
      userId: userId
    });
  });

  // Mensaje de chat
  socket.on('send-message', (data) => {
    const { meetingId, userId, userName, message } = data;
    
    // IMPORTANTE: Emitir broadcast para que el servicio de IA lo escuche
    io.emit('chat-message', {
      meetingId: meetingId,
      userId: userId,
      userName: userName,
      message: message,
      timestamp: new Date().toISOString()
    });
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(4000, () => {
  console.log('Backend corriendo en puerto 4000');
});
```

## 🔍 Verificación

### 1. Verifica que el backend emita eventos

Agrega logs en el backend para verificar:

```javascript
// Antes de emitir
console.log('📤 Emitiendo join-meeting:', { meetingId, userId });
io.emit('join-meeting', { meetingId, userId });
```

### 2. Verifica en el servicio de IA

El servicio de IA mostrará todos los eventos recibidos:

```
🔔 Evento recibido: join-meeting { ... }
👤 Usuario ... se unió a reunión ...
```

### 3. Prueba con un cliente de prueba

Puedes usar este código para probar:

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('Conectado');
  
  // Simular unirse a una reunión
  socket.emit('join-room', {
    meetingId: 'test-123',
    userId: 'test-user'
  });
});
```

## ⚠️ Problemas Comunes

### ❌ El servicio de IA no recibe eventos

**Causa:** El backend emite eventos solo a clientes específicos (`socket.emit`) en lugar de broadcast (`io.emit`)

**Solución:** Cambia `socket.emit` por `io.emit` para eventos que el servicio de IA debe escuchar

### ❌ Los eventos tienen nombres diferentes

**Causa:** El backend usa nombres de eventos diferentes a los que el servicio de IA escucha

**Solución:** 
1. Cambia los nombres de eventos en el backend para que coincidan
2. O agrega listeners adicionales en el servicio de IA para los eventos que usa tu backend

### ❌ El backend usa rooms pero el servicio de IA no se une

**Causa:** El backend emite eventos solo a rooms específicas

**Solución:** 
1. Emite eventos como broadcast (`io.emit`) además de a la sala
2. O haz que el servicio de IA se una a las salas (requiere modificar el código del servicio)

## 📞 Siguiente Paso

1. **Revisa tu código del backend** y busca dónde se manejan los eventos de usuarios uniéndose/saliendo
2. **Agrega emisiones broadcast** usando `io.emit('join-meeting', ...)` y `io.emit('leave-meeting', ...)`
3. **Reinicia ambos servicios** (backend y servicio de IA)
4. **Prueba de nuevo** y verifica los logs del servicio de IA

Si necesitas ayuda específica con tu código del backend, comparte la parte relevante y te ayudo a modificarla.



