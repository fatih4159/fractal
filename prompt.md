# Claude Code Prompt: Twilio Multi-Channel Messaging Platform

## Projektübersicht

Entwickle eine produktionsreife Web-Anwendung für Multi-Channel-Kommunikation über Twilio. Die Plattform soll als zentrale Kommunikationszentrale für SMS, WhatsApp, und andere Twilio-Kanäle dienen.
Die Web-Anwendung heißt Fractal
## Technische Anforderungen

### Deployment & Infrastruktur
- **Nixpacks-kompatibel**: Die Anwendung muss ohne zusätzliche Konfiguration mit Nixpacks deploybar sein
- Erstelle eine `nixpacks.toml` falls nötig für spezifische Build-Konfigurationen
- Nutze Environment Variables für alle sensiblen Daten (Twilio Credentials, DB-Connection, etc.)
- Implementiere Health-Check Endpoints für Container-Orchestrierung

### Tech Stack
- **Backend**: Node.js mit Express.js oder Fastify
- **Frontend**: React mit Vite
- **Datenbank**: PostgreSQL mit Prisma ORM
- **Realtime**: Socket.IO für bidirektionale Echtzeit-Kommunikation
- **Styling**: Tailwind CSS mit shadcn/ui Komponenten

## Twilio Integration - Vollständige API-Abdeckung

### Unterstützte Messaging-Kanäle
1. **SMS/MMS**
   - Senden/Empfangen von SMS
   - MMS mit Medienanhängen
   - Alphanumerische Sender IDs (wo unterstützt)

2. **WhatsApp Business API**
   - Template Messages
   - Session Messages (24h-Fenster)
   - Mediennachrichten (Bilder, Dokumente, Audio, Video)
   - Interactive Messages (Buttons, Lists)

3. **Twilio Conversations API**
   - Multi-Participant Conversations
   - Cross-Channel Conversations

### Twilio Features zu implementieren
```
- Message Scheduling (Geplante Nachrichten)
- Message Redaction (Datenschutz)
- Content API für Templates
- Messaging Services (für Sender Pools)
- Short Codes & Toll-Free Numbers Management
- Opt-Out/Opt-In Handling
- Delivery Receipts & Read Receipts
- Message Feedback (für WhatsApp)
- Rate Limiting & Throttling Handling
```

## Datenmodell

### Prisma Schema Struktur
```prisma
// Kontakte mit Multi-Channel Support
model Contact {
  id            String    @id @default(cuid())
  name          String
  email         String?
  channels      Channel[]
  conversations Conversation[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  metadata      Json?
}

// Kanal-Verknüpfungen (ein Kontakt kann mehrere Nummern/Kanäle haben)
model Channel {
  id          String      @id @default(cuid())
  contactId   String
  contact     Contact     @relation(fields: [contactId], references: [id])
  type        ChannelType // SMS, WHATSAPP, etc.
  identifier  String      // Telefonnummer oder WhatsApp ID
  isVerified  Boolean     @default(false)
  isPrimary   Boolean     @default(false)
  createdAt   DateTime    @default(now())
  
  @@unique([type, identifier])
}

model Message {
  id              String          @id @default(cuid())
  twilioSid       String?         @unique
  conversationId  String
  conversation    Conversation    @relation(fields: [conversationId], references: [id])
  direction       Direction       // INBOUND, OUTBOUND
  channelType     ChannelType
  from            String
  to              String
  body            String?
  mediaUrls       String[]
  status          MessageStatus
  statusHistory   StatusEvent[]
  errorCode       String?
  errorMessage    String?
  scheduledAt     DateTime?
  sentAt          DateTime?
  deliveredAt     DateTime?
  readAt          DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  metadata        Json?
}

model StatusEvent {
  id          String        @id @default(cuid())
  messageId   String
  message     Message       @relation(fields: [messageId], references: [id])
  status      MessageStatus
  timestamp   DateTime      @default(now())
  rawPayload  Json?         // Original Twilio Webhook Payload
}

enum ChannelType {
  SMS
  MMS
  WHATSAPP
  MESSENGER
}

enum MessageStatus {
  QUEUED
  SENDING
  SENT
  DELIVERED
  READ
  FAILED
  UNDELIVERED
  CANCELED
}

enum Direction {
  INBOUND
  OUTBOUND
}
```

## API Design

### REST API Endpoints

```yaml
# Kontakte
POST   /api/contacts              # Kontakt erstellen
GET    /api/contacts              # Kontakte auflisten (mit Pagination & Filter)
GET    /api/contacts/:id          # Einzelner Kontakt
PUT    /api/contacts/:id          # Kontakt aktualisieren
DELETE /api/contacts/:id          # Kontakt löschen
POST   /api/contacts/:id/channels # Kanal zu Kontakt hinzufügen

# Nachrichten
POST   /api/messages              # Nachricht senden
GET    /api/messages              # Nachrichten auflisten
GET    /api/messages/:id          # Nachricht mit vollständigem Status-Verlauf
POST   /api/messages/bulk         # Bulk-Versand
DELETE /api/messages/:id          # Nachricht stornieren (falls noch möglich)

# Conversations
GET    /api/conversations         # Alle Konversationen
GET    /api/conversations/:id     # Einzelne Konversation mit Nachrichten
POST   /api/conversations         # Neue Konversation starten

# Templates (WhatsApp)
GET    /api/templates             # Verfügbare Templates abrufen
POST   /api/messages/template     # Template-Nachricht senden

# Webhooks (für externe Systeme)
POST   /api/webhooks/register     # Webhook registrieren
GET    /api/webhooks              # Registrierte Webhooks auflisten
DELETE /api/webhooks/:id          # Webhook entfernen
```

### Twilio Webhook Endpoints
```yaml
POST   /webhooks/twilio/incoming  # Eingehende Nachrichten
POST   /webhooks/twilio/status    # Status-Updates
```

### API Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150
    }
  }
}
```

### API Authentifizierung
- API Key Authentication für externe Systeme
- Implementiere Rate Limiting
- Request Signing für Webhook-Verifizierung

## Realtime WebSocket Events

### Socket.IO Namespace: `/messaging`

```typescript
// Server -> Client Events
'message:new'           // Neue eingehende Nachricht
'message:status'        // Status-Update einer Nachricht
'conversation:updated'  // Konversation hat sich geändert
'typing:start'          // Tipp-Indikator (falls verfügbar)
'typing:stop'

// Client -> Server Events
'conversation:join'     // Einer Konversation beitreten
'conversation:leave'    // Konversation verlassen
'message:send'          // Nachricht über Socket senden
'message:read'          // Nachricht als gelesen markieren
```

## UI/UX Anforderungen

### Layout Struktur (Desktop-First, Responsive)
```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo | Suche | Kanal-Filter | Einstellungen       │
├─────────────┬───────────────────────────┬───────────────────┤
│             │                           │                   │
│  Sidebar    │   Conversation List       │  Message Detail   │
│             │                           │    Panel          │
│  - Inbox    │   - Contact Avatar/Name   │                   │
│  - Channels │   - Last Message Preview  │  - Status Badge   │
│  - Contacts │   - Timestamp             │  - Status History │
│  - Settings │   - Unread Badge          │  - Raw Data       │
│             │   - Channel Icon          │                   │
│             │                           │                   │
├─────────────┴───────────────────────────┴───────────────────┤
│                    Chat Window                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Message Bubbles mit:                                │   │
│  │  - Zeitstempel                                       │   │
│  │  - Status-Indikator (✓ ✓✓ Uhr)                      │   │
│  │  - Kanal-Badge                                       │   │
│  │  - Klickbar für Detail-Dialog                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Composer: Textarea | Emoji | Attach | Template | Send│   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Nachrichten-Detail Dialog
Beim Klick auf eine Nachricht öffnet sich ein Dialog/Drawer mit:

```
┌──────────────────────────────────────────┐
│  Nachrichtendetails                   X  │
├──────────────────────────────────────────┤
│  Status: ✓✓ Zugestellt                   │
│                                          │
│  ─────────────────────────────────────   │
│  Status-Verlauf                          │
│  ─────────────────────────────────────   │
│                                          │
│  ● Gelesen        14:35:22   03.01.2025  │
│  │                                       │
│  ● Zugestellt     14:32:15   03.01.2025  │
│  │                                       │
│  ● Gesendet       14:32:01   03.01.2025  │
│  │                                       │
│  ○ In Warteschl.  14:31:58   03.01.2025  │
│                                          │
│  ─────────────────────────────────────   │
│  Technische Details                      │
│  ─────────────────────────────────────   │
│  Twilio SID: SM1234567890abcdef          │
│  Kanal: WhatsApp                         │
│  Von: +49123456789                        │
│  An: +49987654321                         │
│  Preis: $0.005                           │
│                                          │
│  [Raw Payload anzeigen]                  │
└──────────────────────────────────────────┘
```

### UI Komponenten (shadcn/ui basiert)
- `ConversationList` - Virtualisierte Liste für Performance
- `ChatWindow` - Nachrichten-Ansicht mit Infinite Scroll
- `MessageBubble` - Nachricht mit Status-Indikatoren
- `MessageDetailDrawer` - Status-Verlauf und Details
- `ContactCard` - Kontakt mit verknüpften Kanälen
- `ChannelSelector` - Dropdown für Kanal-Auswahl beim Senden
- `TemplateSelector` - WhatsApp Template Auswahl
- `ComposerBar` - Nachrichten-Eingabe mit Anhängen

### Design Prinzipien
- Clean, moderne Ästhetik (WhatsApp/Slack-inspiriert)
- Konsistente Farbcodierung für Kanäle (SMS=Blau, WhatsApp=Grün)
- Klare visuelle Hierarchie
- Skeleton Loading States
- Toast Notifications für Aktionen
- Optimistic UI Updates

## Projektstruktur

```
/
├── nixpacks.toml
├── package.json
├── .env.example
├── prisma/
│   └── schema.prisma
├── src/
│   ├── server/
│   │   ├── index.ts              # Server Entry
│   │   ├── config/
│   │   │   └── env.ts            # Environment Config
│   │   ├── routes/
│   │   │   ├── api/
│   │   │   │   ├── contacts.ts
│   │   │   │   ├── messages.ts
│   │   │   │   ├── conversations.ts
│   │   │   │   ├── templates.ts
│   │   │   │   └── webhooks.ts
│   │   │   └── twilio/
│   │   │       └── webhooks.ts   # Twilio Webhook Handler
│   │   ├── services/
│   │   │   ├── twilio/
│   │   │   │   ├── client.ts     # Twilio Client Wrapper
│   │   │   │   ├── sms.ts
│   │   │   │   ├── whatsapp.ts
│   │   │   │   └── templates.ts
│   │   │   ├── messaging.ts      # Unified Messaging Service
│   │   │   └── webhook.ts        # Outgoing Webhook Dispatcher
│   │   ├── socket/
│   │   │   └── index.ts          # Socket.IO Setup
│   │   └── middleware/
│   │       ├── auth.ts
│   │       ├── rateLimiter.ts
│   │       └── twilioValidator.ts
│   └── client/
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── ui/               # shadcn Komponenten
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   └── Header.tsx
│       │   ├── conversations/
│       │   │   ├── ConversationList.tsx
│       │   │   └── ConversationItem.tsx
│       │   ├── messages/
│       │   │   ├── ChatWindow.tsx
│       │   │   ├── MessageBubble.tsx
│       │   │   ├── MessageDetailDrawer.tsx
│       │   │   └── ComposerBar.tsx
│       │   └── contacts/
│       │       ├── ContactList.tsx
│       │       └── ContactCard.tsx
│       ├── hooks/
│       │   ├── useSocket.ts
│       │   ├── useMessages.ts
│       │   └── useConversations.ts
│       ├── stores/
│       │   └── messageStore.ts   # Zustand Store
│       └── lib/
│           └── api.ts            # API Client
└── docker-compose.yml            # Für lokale Entwicklung
```

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://...

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxx  # Optional
TWILIO_WHATSAPP_NUMBER=+14155238886

# API Security
API_KEY_SECRET=your-secret-for-api-keys
WEBHOOK_SIGNING_SECRET=your-webhook-secret

# Optional
REDIS_URL=redis://...  # Für Socket.IO Scaling
```

## Implementierungshinweise

### Twilio Webhook Sicherheit
```typescript
// Alle Twilio Webhooks müssen validiert werden
import { validateRequest } from 'twilio';

const twilioValidator = (req, res, next) => {
  const signature = req.headers['x-twilio-signature'];
  const url = `${process.env.APP_URL}${req.originalUrl}`;
  
  if (!validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, url, req.body)) {
    return res.status(403).send('Invalid signature');
  }
  next();
};
```

### Outgoing Webhooks (für externe Systeme)
```typescript
// Registrierte Webhooks bei Events benachrichtigen
interface WebhookConfig {
  url: string;
  events: ('message.received' | 'message.status' | 'contact.created')[];
  secret: string;
}

// Bei jedem Event die registrierten Webhooks aufrufen
async function dispatchWebhook(event: string, payload: any) {
  const webhooks = await getWebhooksForEvent(event);
  
  for (const webhook of webhooks) {
    const signature = createHmacSignature(payload, webhook.secret);
    await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      body: JSON.stringify({ event, payload, timestamp: Date.now() })
    });
  }
}
```

### Status-Tracking Best Practice
```typescript
// Jedes Status-Update speichern für vollständigen Verlauf
async function handleStatusCallback(twilioPayload: any) {
  const { MessageSid, MessageStatus } = twilioPayload;
  
  // Nachricht aktualisieren
  const message = await prisma.message.update({
    where: { twilioSid: MessageSid },
    data: { 
      status: mapTwilioStatus(MessageStatus),
      ...(MessageStatus === 'delivered' && { deliveredAt: new Date() }),
      ...(MessageStatus === 'read' && { readAt: new Date() })
    }
  });
  
  // Status-Event erstellen
  await prisma.statusEvent.create({
    data: {
      messageId: message.id,
      status: mapTwilioStatus(MessageStatus),
      rawPayload: twilioPayload
    }
  });
  
  // Socket.IO Event senden
  io.to(`conversation:${message.conversationId}`).emit('message:status', {
    messageId: message.id,
    status: MessageStatus
  });
  
  // Externe Webhooks benachrichtigen
  await dispatchWebhook('message.status', { message, status: MessageStatus });
}
```

## Qualitätsanforderungen

1. **TypeScript Strict Mode** - Vollständige Typisierung
2. **Error Handling** - Graceful Degradation, aussagekräftige Fehlermeldungen
3. **Logging** - Strukturiertes Logging mit Request-IDs
4. **Tests** - Unit Tests für Services, Integration Tests für API
5. **API Dokumentation** - OpenAPI/Swagger Spec generieren

## Erste Schritte

1. Projektstruktur anlegen
2. Prisma Schema erstellen und migrieren
3. Twilio Client Service implementieren
4. Webhook Endpoints implementieren
5. REST API aufbauen
6. Socket.IO Integration
7. Frontend Grundgerüst
8. UI Komponenten entwickeln
9. Realtime-Verbindung Client<->Server
10. Testing & Refinement

---

Beginne mit dem Backend und der Twilio-Integration. Stelle sicher, dass alle Nachrichten und Status-Updates persistent gespeichert werden, bevor du mit dem Frontend startest.
