// Shared types between client and server

export enum ChannelType {
  SMS = 'SMS',
  MMS = 'MMS',
  WHATSAPP = 'WHATSAPP',
  MESSENGER = 'MESSENGER',
}

export enum MessageStatus {
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  UNDELIVERED = 'UNDELIVERED',
  CANCELED = 'CANCELED',
}

export enum Direction {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
  }
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

export interface Contact {
  id: string
  name: string
  email?: string | null
  channels: Channel[]
  createdAt: Date
  updatedAt: Date
  metadata?: any
}

export interface Channel {
  id: string
  contactId: string
  type: ChannelType
  identifier: string
  isVerified: boolean
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Conversation {
  id: string
  contactId: string
  contact?: Contact
  channelType: ChannelType
  lastMessage?: string | null
  lastMessageAt?: Date | null
  unreadCount: number
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
  metadata?: any
}

export interface Message {
  id: string
  twilioSid?: string | null
  conversationId: string
  direction: Direction
  channelType: ChannelType
  from: string
  to: string
  body?: string | null
  mediaUrls: string[]
  status: MessageStatus
  errorCode?: string | null
  errorMessage?: string | null
  scheduledAt?: Date | null
  sentAt?: Date | null
  deliveredAt?: Date | null
  readAt?: Date | null
  createdAt: Date
  updatedAt: Date
  metadata?: any
}

export interface StatusEvent {
  id: string
  messageId: string
  status: MessageStatus
  timestamp: Date
  rawPayload?: any
}

export interface SendMessageRequest {
  to: string
  body?: string
  channelType: ChannelType
  mediaUrls?: string[]
  scheduledAt?: Date
}

export interface SendTemplateMessageRequest {
  to: string
  templateSid: string
  channelType: ChannelType
  variables?: Record<string, string>
}

// Socket.IO event types
export interface SocketEvents {
  // Server to Client
  'message:new': (message: Message) => void
  'message:status': (data: { messageId: string; status: MessageStatus }) => void
  'message:read': (data: { messageId: string; readAt: string }) => void
  'conversation:updated': (conversation: Conversation) => void
  'typing:start': (data: { conversationId: string; userId: string }) => void
  'typing:stop': (data: { conversationId: string; userId: string }) => void

  // Client to Server
  'conversation:join': (conversationId: string) => void
  'conversation:leave': (conversationId: string) => void
  'message:send': (data: SendMessageRequest) => void
}
