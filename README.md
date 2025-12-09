# 🤖 Servicio de IA para Resúmenes de Reuniones

Servicio independiente que genera resúmenes automáticos de reuniones en tiempo real usando Groq AI (gratis, sin cuotas estrictas).

## 👥 Equipo

<!-- Agregar nombres y códigos de los integrantes del equipo -->
- [Agregar nombre] - [Agregar código]
- [Agregar nombre] - [Agregar código]

## 🎯 Características

- ✅ Se conecta al backend existente como cliente Socket.IO
- ✅ Escucha eventos en tiempo real (sin modificar backends existentes)
- ✅ Genera resúmenes con Groq AI (gratis, sin cuotas estrictas)
- ✅ Extrae tareas y compromisos
- ✅ Envía emails automáticos al finalizar
- ✅ Procesa transcripciones de audio (opcional)

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env` y configura:

```bash
cp .env.example .env
```

### 3. Obtener API Key de Groq

1. Ve a [Groq Console](https://console.groq.com/)
2. Crea una cuenta (gratis)
3. Genera una API key
4. Agrégala a `.env` como `GROQ_API_KEY`

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

### 5. Compilar para producción

```bash
npm run build
npm start
```

## 📋 Requisitos

- Node.js >= 18.0.0
- API Key de Groq (gratis, sin cuotas estrictas)
- Acceso al backend principal (Socket.IO)
- Configuración de Firebase (para obtener emails y enviar correos)

## 🔧 Configuración

### Variables de Entorno

- `BACKEND_SOCKET_URL`: URL del backend principal con Socket.IO
- `GROQ_API_KEY`: API key de Groq AI
- `GROQ_MODEL`: Modelo a usar (opcional, por defecto: llama-3.1-8b-instant)
- `FIREBASE_*`: Credenciales de Firebase (para obtener emails y enviar correos)

**Nota sobre envío de emails:**
El servicio guarda los resúmenes en Firestore en la colección `email_queue`. 
Firebase Cloud Functions o Extensions (como Trigger Email) procesan y envían los emails automáticamente.

## 🏗️ Arquitectura

```
Backend Principal (Back/)
    ↓ Socket.IO (emite eventos)
Servicio de IA (este servicio)
    ↓
Groq AI API
    ↓
Genera resumen → Envía email
```

## 📦 Estructura

```
src/
├── config/
│   ├── socket.client.ts    # Cliente Socket.IO
│   ├── groq.ts             # Configuración Groq AI
│   ├── firebase.ts         # Configuración Firebase
│   └── email.ts            # Configuración Email
├── services/
│   ├── MeetingTracker.ts  # Rastrea reuniones
│   ├── SummaryGenerator.ts # Genera resúmenes
│   └── EmailService.ts     # Envía emails
├── listeners/
│   └── SocketListener.ts   # Escucha eventos
├── models/
│   └── Meeting.ts          # Modelos de datos
└── server.ts               # Servidor Express
```

## 🚀 Despliegue en Render

1. Conecta este repositorio a Render
2. Crea un nuevo Web Service
3. Configura las variables de entorno
4. Build command: `npm install && npm run build`
5. Start command: `npm start`

## 📝 Notas

- Este servicio NO modifica los backends existentes
- Se conecta como cliente y solo escucha eventos
- Para audio, el frontend puede enviar transcripciones directamente

## 🔗 Repositorio

https://github.com/Hernan56IK/ia-pi3-trasncribir.git



