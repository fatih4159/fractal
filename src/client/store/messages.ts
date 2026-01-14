import { create } from 'zustand'

export type MessageStatus =
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'UNDELIVERED'
  | 'CANCELED'

export type Direction = 'INBOUND' | 'OUTBOUND'
export type ChannelType = 'SMS' | 'MMS' | 'WHATSAPP' | 'MESSENGER'

export interface Message {
  id: string
  twilioSid?: string
  conversationId: string
  direction: Direction
  channelType: ChannelType
  from: string
  to: string
  body: string
  mediaUrls?: string[]
  status: MessageStatus
  errorCode?: string
  errorMessage?: string
  scheduledAt?: Date
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any>
}

const EMPTY_MESSAGES: Message[] = []

interface MessagesState {
  messages: Record<string, Message[]> // Key: conversationId, Value: messages
  isLoading: boolean
  error: string | null
  isSending: boolean

  // Actions
  setMessages: (conversationId: string, messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  deleteMessage: (id: string) => void
  getMessagesByConversation: (conversationId: string) => Message[]
  setLoading: (loading: boolean) => void
  setSending: (sending: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  clearMessages: (conversationId: string) => void
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: {},
  isLoading: false,
  error: null,
  isSending: false,

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: messages,
      },
    })),

  addMessage: (message) =>
    set((state) => {
      const existing = state.messages[message.conversationId] || []
      return {
        messages: {
          ...state.messages,
          [message.conversationId]: [...existing, message],
        },
      }
    }),

  updateMessage: (id, updates) =>
    set((state) => {
      const newMessages = { ...state.messages }
      Object.keys(newMessages).forEach((convId) => {
        newMessages[convId] = newMessages[convId].map((msg) =>
          msg.id === id ? { ...msg, ...updates } : msg
        )
      })
      return { messages: newMessages }
    }),

  deleteMessage: (id) =>
    set((state) => {
      const newMessages = { ...state.messages }
      Object.keys(newMessages).forEach((convId) => {
        newMessages[convId] = newMessages[convId].filter((msg) => msg.id !== id)
      })
      return { messages: newMessages }
    }),

  getMessagesByConversation: (conversationId) => {
    return get().messages[conversationId] ?? EMPTY_MESSAGES
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setSending: (sending) => set({ isSending: sending }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  clearMessages: (conversationId) =>
    set((state) => {
      const newMessages = { ...state.messages }
      delete newMessages[conversationId]
      return { messages: newMessages }
    }),
}))
