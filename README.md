# 🤖 Servicio de IA para Resúmenes de Reuniones

Servicio independiente que genera resúmenes automáticos de reuniones en tiempo real usando Google Gemini (gratis).

## 🎯 Características

- ✅ Se conecta al backend existente como cliente Socket.IO
- ✅ Escucha eventos en tiempo real (sin modificar backends existentes)
- ✅ Genera resúmenes con Google Gemini (gratis)
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

### 3. Obtener API Key de Google Gemini

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una API key
3. Agrégala a `.env` como `GEMINI_API_KEY`

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
- API Key de Google Gemini (gratis)
- Acceso al backend principal (Socket.IO)
- Configuración de Firebase (para obtener emails)
- Configuración SMTP (para enviar emails)

## 🔧 Configuración

### Variables de Entorno

- `BACKEND_SOCKET_URL`: URL del backend principal con Socket.IO
- `GEMINI_API_KEY`: API key de Google Gemini
- `FIREBASE_*`: Credenciales de Firebase
- `SMTP_*`: Configuración de email

## 🏗️ Arquitectura

```
Backend Principal (Back/)
    ↓ Socket.IO (emite eventos)
Servicio de IA (este servicio)
    ↓
Google Gemini API
    ↓
Genera resumen → Envía email
```

## 📦 Estructura

```
src/
├── config/
│   ├── socket.client.ts    # Cliente Socket.IO
│   ├── gemini.ts           # Configuración Gemini
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

