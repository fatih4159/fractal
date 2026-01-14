import { create } from 'zustand'

type ActiveTab = 'conversations' | 'contacts' | 'templates'

interface UIState {
  activeTab: ActiveTab
  sidebarCollapsed: boolean
  messageDetailOpen: boolean
  selectedMessageId: string | null
  searchQuery: string

  // Actions
  setActiveTab: (tab: ActiveTab) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  openMessageDetail: (messageId: string) => void
  closeMessageDetail: () => void
  setSearchQuery: (query: string) => void
  clearSearch: () => void
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'conversations',
  sidebarCollapsed: false,
  messageDetailOpen: false,
  selectedMessageId: null,
  searchQuery: '',

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  openMessageDetail: (messageId) =>
    set({ messageDetailOpen: true, selectedMessageId: messageId }),

  closeMessageDetail: () =>
    set({ messageDetailOpen: false, selectedMessageId: null }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  clearSearch: () => set({ searchQuery: '' }),
}))
