import { create } from 'zustand'

export type ChannelType = 'SMS' | 'MMS' | 'WHATSAPP' | 'MESSENGER'

export interface Conversation {
  id: string
  contactId: string
  contactName: string
  contactPhone: string
  channelType: ChannelType
  lastMessage: string | null
  lastMessageAt: Date | null
  unreadCount: number
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any>
}

interface ConversationsState {
  conversations: Conversation[]
  selectedConversationId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  deleteConversation: (id: string) => void
  selectConversation: (id: string | null) => void
  incrementUnreadCount: (id: string) => void
  resetUnreadCount: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useConversationsStore = create<ConversationsState>((set) => ({
  conversations: [],
  selectedConversationId: null,
  isLoading: false,
  error: null,

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [
        conversation,
        ...state.conversations.filter((c) => c.id !== conversation.id),
      ],
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, ...updates } : conv
      ),
    })),

  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((conv) => conv.id !== id),
      selectedConversationId:
        state.selectedConversationId === id ? null : state.selectedConversationId,
    })),

  selectConversation: (id) => set({ selectedConversationId: id }),

  incrementUnreadCount: (id) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, unreadCount: conv.unreadCount + 1 } : conv
      ),
    })),

  resetUnreadCount: (id) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, unreadCount: 0 } : conv
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}))
