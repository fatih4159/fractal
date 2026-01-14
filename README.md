# Fractal

Multi-Channel Messaging Platform powered by Twilio

## 🎯 Überblick

Fractal ist eine produktionsreife Web-Anwendung für Multi-Channel-Kommunikation über Twilio. Die Plattform dient als zentrale Kommunikationszentrale für SMS, WhatsApp und andere Twilio-Kanäle.

## ✨ Features

### Bereits implementiert ✅

- **Multi-Channel Messaging**: SMS, MMS, WhatsApp Support
- **Vollständige REST API**: Contacts, Messages, Conversations, Templates, Webhooks
- **Twilio Integration**: SMS, WhatsApp, Template Messages
- **Realtime Updates**: Socket.IO für bidirektionale Echtzeit-Kommunikation
- **Status Tracking**: Vollständiger Message-Status-Verlauf (Queued → Sent → Delivered → Read)
- **Webhook System**: Empfang von Twilio Webhooks + Versand an externe Systeme
- **Database**: PostgreSQL mit Prisma ORM
- **API Security**: Rate Limiting, API Key Authentication
- **Nixpacks Ready**: Sofort deploybar

### In Entwicklung 🚧

- UI Komponenten mit shadcn/ui
- Frontend State Management mit Zustand
- Socket.IO Client Integration

## 🏗️ Tech Stack

**Backend:**
- Node.js mit Express.js
- TypeScript (Strict Mode)
- Prisma ORM + PostgreSQL
- Socket.IO
- Twilio SDK

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- shadcn/ui (in Entwicklung)
- Socket.IO Client

**Deployment:**
- Nixpacks-kompatibel
- Docker Compose für lokale Entwicklung

## 🚀 Quick Start

### Voraussetzungen

- Node.js 20+
- PostgreSQL 16+
- Twilio Account mit:
  - Account SID & Auth Token
  - Telefonnummer für SMS
  - WhatsApp Business Number (optional)

### 1. Installation

```bash
# Repository klonen
git clone <repository-url>
cd fractal

# Dependencies installieren
npm install

# PostgreSQL starten (mit Docker)
docker-compose up -d

# Environment variables konfigurieren
cp .env.example .env
# .env Datei mit deinen Twilio Credentials füllen
```

### 2. Environment Variablen

Bearbeite `.env` und füge deine Twilio Credentials ein:

```env
# Server
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://fractal:fractal@localhost:5432/fractal

# Twilio (WICHTIG: Ersetze mit deinen Credentials)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+14155238886

# API Security
API_KEY_SECRET=your-secret-key-change-this
WEBHOOK_SIGNING_SECRET=your-webhook-secret-change-this
```

### 3. Database Setup

```bash
# Prisma Client generieren
npm run db:generate

# Database Migrations ausführen
npm run db:migrate

# Alternativ: Schema direkt pushen (für Development)
npm run db:push
```

### 4. Starten

```bash
# Development Mode (Backend + Frontend gleichzeitig)
npm run dev

# Nur Backend
npm run dev:server

# Nur Frontend
npm run dev:client
```

Die Anwendung ist dann verfügbar unter:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

## 📡 API Endpoints

### Contacts
- `GET /api/contacts` - Liste alle Kontakte
- `GET /api/contacts/:id` - Einzelner Kontakt
- `POST /api/contacts` - Kontakt erstellen
- `PUT /api/contacts/:id` - Kontakt aktualisieren
- `DELETE /api/contacts/:id` - Kontakt löschen
- `POST /api/contacts/:id/channels` - Kanal hinzufügen

### Messages
- `GET /api/messages` - Nachrichten auflisten
- `GET /api/messages/:id` - Nachricht mit Status-Verlauf
- `POST /api/messages` - Nachricht senden
- `POST /api/messages/template` - Template-Nachricht senden
- `POST /api/messages/bulk` - Bulk-Versand
- `DELETE /api/messages/:id` - Nachricht stornieren

### Conversations
- `GET /api/conversations` - Alle Konversationen
- `GET /api/conversations/:id` - Konversation mit Nachrichten
- `POST /api/conversations` - Neue Konversation
- `PATCH /api/conversations/:id/archive` - Archivieren
- `PATCH /api/conversations/:id/read` - Als gelesen markieren

### Templates
- `GET /api/templates` - WhatsApp Templates auflisten
- `GET /api/templates/:sid` - Template Details

### Webhooks
- `GET /api/webhooks` - Registrierte Webhooks
- `POST /api/webhooks` - Webhook registrieren
- `PATCH /api/webhooks/:id` - Webhook aktivieren/deaktivieren
- `DELETE /api/webhooks/:id` - Webhook löschen

### Twilio Webhooks (für Twilio Console)
- `POST /webhooks/twilio/incoming` - Eingehende Nachrichten
- `POST /webhooks/twilio/status` - Status-Updates

## 🔌 WebSocket Events (Socket.IO)

**Namespace:** `/messaging`

**Server → Client:**
- `message:new` - Neue eingehende Nachricht
- `message:status` - Status-Update
- `message:read` - Nachricht gelesen
- `conversation:updated` - Konversation geändert

**Client → Server:**
- `conversation:join` - Konversation beitreten
- `conversation:leave` - Konversation verlassen
- `message:send` - Nachricht senden

## 📁 Projektstruktur

```
fractal/
├── prisma/
│   └── schema.prisma           # Database Schema
├── src/
│   ├── server/                 # Backend
│   │   ├── config/
│   │   │   └── env.ts         # Environment Config
│   │   ├── routes/
│   │   │   ├── api/           # REST API Routes
│   │   │   └── twilio/        # Twilio Webhooks
│   │   ├── services/
│   │   │   ├── twilio/        # Twilio Services
│   │   │   └── messaging.ts   # Unified Messaging
│   │   ├── socket/
│   │   │   └── index.ts       # Socket.IO Setup
│   │   ├── middleware/        # Auth, Rate Limiting, etc.
│   │   └── index.ts           # Server Entry Point
│   ├── client/                # Frontend
│   │   ├── components/        # React Components
│   │   ├── hooks/             # Custom Hooks
│   │   ├── stores/            # Zustand Stores
│   │   ├── lib/               # Utilities & API Client
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── shared/
│       └── types.ts           # Shared Types
├── docker-compose.yml         # PostgreSQL Setup
├── nixpacks.toml              # Nixpacks Config
└── package.json
```

## 🔐 Twilio Webhook Konfiguration

In deiner Twilio Console musst du folgende Webhooks konfigurieren:

**Für SMS/MMS:**
1. Gehe zu Phone Numbers → Deine Nummer
2. Bei "A Message Comes In" setze: `https://your-domain.com/webhooks/twilio/incoming`
3. Bei "Status Callback URL" setze: `https://your-domain.com/webhooks/twilio/status`

**Für WhatsApp:**
1. Gehe zu Messaging → Try it out → WhatsApp Sandbox
2. Bei "When a message comes in" setze: `https://your-domain.com/webhooks/twilio/incoming`
3. Bei "Status Callback URL" setze: `https://your-domain.com/webhooks/twilio/status`

## 🗃️ Database Schema

Das Prisma Schema umfasst:
- **Contact** - Kontakte mit Multi-Channel Support
- **Channel** - Verknüpfung von Kontakten zu Kanälen (SMS, WhatsApp, etc.)
- **Conversation** - Gruppierung von Nachrichten
- **Message** - Einzelne Nachrichten
- **StatusEvent** - Vollständiger Status-Verlauf jeder Nachricht
- **Webhook** - Externe Webhook Registrierungen
- **ApiKey** - API-Authentifizierung
- **Template** - WhatsApp Template Definitionen

## 🧪 Development

```bash
# Database
npm run db:studio              # Prisma Studio öffnen
npm run db:migrate             # Migration erstellen
npm run db:push                # Schema direkt pushen

# TypeScript
npm run type-check             # Type Checking

# Build
npm run build                  # Production Build
npm run start                  # Production Server starten
```

## 📦 Production Deployment

### Mit Nixpacks (Railway, Render, etc.)

Die Anwendung ist Nixpacks-ready und kann direkt deployed werden:

```bash
# Nixpacks erkennt automatisch die nixpacks.toml
# und führt folgende Schritte aus:
# 1. npm install
# 2. npx prisma generate
# 3. npm run build
# 4. npm run start
```

**Wichtig:** Stelle sicher, dass alle Environment Variables gesetzt sind!

## 📝 Nächste Schritte

Siehe `todo.md` für die vollständige Entwicklungs-Roadmap.

**Nächste Features:**
- UI Komponenten mit shadcn/ui
- Chat Interface
- Message Detail Drawer mit Status-Verlauf
- Contact Management UI
- Template Selector für WhatsApp

## 🤝 Contributing

Contributions sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue.

---

**Status:** Backend vollständig ✅ | Frontend in Entwicklung 🚧

Built with ❤️ using Twilio, React, and Node.js
