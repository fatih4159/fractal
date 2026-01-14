import { create } from 'zustand'

export type ChannelType = 'SMS' | 'MMS' | 'WHATSAPP' | 'MESSENGER'

export interface Channel {
  id: string
  type: ChannelType
  identifier: string
  isVerified: boolean
  isPrimary: boolean
}

export interface Contact {
  id: string
  name: string
  email?: string
  channels: Channel[]
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any>
}

interface ContactsState {
  contacts: Contact[]
  selectedContactId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  setContacts: (contacts: Contact[]) => void
  addContact: (contact: Contact) => void
  updateContact: (id: string, updates: Partial<Contact>) => void
  deleteContact: (id: string) => void
  selectContact: (id: string | null) => void
  getContactById: (id: string) => Contact | undefined
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  selectedContactId: null,
  isLoading: false,
  error: null,

  setContacts: (contacts) => set({ contacts }),

  addContact: (contact) =>
    set((state) => ({
      contacts: [...state.contacts, contact],
    })),

  updateContact: (id, updates) =>
    set((state) => ({
      contacts: state.contacts.map((contact) =>
        contact.id === id ? { ...contact, ...updates } : contact
      ),
    })),

  deleteContact: (id) =>
    set((state) => ({
      contacts: state.contacts.filter((contact) => contact.id !== id),
      selectedContactId: state.selectedContactId === id ? null : state.selectedContactId,
    })),

  selectContact: (id) => set({ selectedContactId: id }),

  getContactById: (id) => {
    return get().contacts.find((contact) => contact.id === id)
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}))
