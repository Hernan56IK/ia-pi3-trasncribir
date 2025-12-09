# 🚀 Configuración Rápida de Groq

## ✅ API Key

Tu API key de Groq (no la compartas en el repositorio):
```
GROQ_API_KEY=tu-api-key-de-groq
```

## 📝 Configuración

Crea un archivo `.env` en la raíz del proyecto con:

```env
# Groq AI
GROQ_API_KEY=tu-api-key-de-groq
GROQ_MODEL=llama-3.1-8b-instant

# Backend
BACKEND_SOCKET_URL=http://localhost:4000

# Firebase (opcional)
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tu-proyecto.iam.gserviceaccount.com

# Servidor
PORT=4001
NODE_ENV=development
```

## 🎯 Modelos Disponibles

- `llama-3.1-8b-instant` - Rápido, recomendado (por defecto)
- `llama-3.1-70b-versatile` - Más potente
- `mixtral-8x7b-32768` - Muy rápido

## ✅ Ventajas de Groq

- ✅ Completamente gratis
- ✅ Sin cuotas estrictas
- ✅ Muy rápido (inferencia acelerada)
- ✅ Modelos de última generación (Llama 3.1)
- ✅ No requiere tarjeta de crédito

## 🧪 Prueba

Después de configurar el `.env`:

```bash
npm run dev
```

Deberías ver:
```
✅ Groq AI inicializado correctamente
```




