# Alpaquitay

Sistema de gestión de contratos con verificación de integridad SHA-256 y pagos integrados.

## Arquitectura

```
Alpaquitay/
├── backend/     ← Node.js + Express + MongoDB (API REST)
├── frontend/    ← React + Vite + TailwindCSS (AlpacaChain UI)
```

## Requisitos

- Node.js v18+
- MongoDB 6+ (corriendo en `localhost:27017`)

## Inicio rápido

```bash
# 1. Levantar MongoDB (Windows)
"C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --dbpath C:\data\db

# 2. Backend (terminal 1)
cd backend
npm install
cp .env.example .env    # configurar si es primera vez
npm run dev             # → http://localhost:3000

# 3. Frontend (terminal 2)
cd frontend
npm install
npm run dev             # → http://localhost:5173
```

## Funcionalidades

| Feature | Estado | Descripción |
|---|---|---|
| Autenticación JWT | ✅ | Login con API key → token Bearer |
| Subir contrato | ✅ | PDF/TXT por archivo o texto directo |
| Hash SHA-256 | ✅ | Generación automática con streaming |
| Verificar integridad | ✅ | Re-calcula hash y compara con almacenado |
| Listar contratos | ✅ | Paginado desde MongoDB |
| Pago Fiserv | 🔧 | Flujo conectado (requiere API keys reales) |
| Pago Clover POS | 📋 | Diseñado (requiere dispositivo Clover) |

## Credenciales de prueba

```
Usuario:  test-user
API Key:  your-super-secret-key-change-in-production
```

## API Endpoints

```
POST /api/auth/token              → Obtener JWT
POST /api/contracts/upload        → Subir archivo
POST /api/contracts/upload-text   → Subir texto
GET  /api/contracts               → Listar contratos
GET  /api/contracts/:id           → Detalle
POST /api/contracts/:id/verify    → Verificar integridad
POST /api/payments/fiserv/create-session → Pago online
GET  /health                      → Estado del servidor
```

## Stack

- **Backend**: Express, Mongoose, Multer, JWT, SHA-256 streaming
- **Frontend**: React 19, Vite 6, TailwindCSS 4, Framer Motion
- **Base de datos**: MongoDB
- **Seguridad**: Helmet, CORS, Rate Limiting, HMAC webhooks
# AlpacaChain
