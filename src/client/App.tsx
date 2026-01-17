import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { ConversationList } from './components/ConversationList'
import { ChatWindow } from './components/ChatWindow'
import { ComposerBar } from './components/ComposerBar'
import { MessageDetailDrawer } from './components/MessageDetailDrawer'
import { ContactsPage } from './components/ContactsPage'
import { TemplatesPage } from './components/TemplatesPage'
import { Toaster } from './components/ui/toaster'
import { Input } from './components/ui/input'
import { useSocket } from './hooks/use-socket'
import { useConversations } from './hooks/use-conversations'
import { useMessages } from './hooks/use-messages'
import { useUIStore } from './store/ui'
import { useContactsStore } from './store/contacts'
import { toast } from './hooks/use-toast'
import { Search } from 'lucide-react'

function App() {
  // Initialize Socket.IO connection
  const { isConnected } = useSocket()

  // UI State
  const activeTab = useUIStore((state) => state.activeTab)
  const setActiveTab = useUIStore((state) => state.setActiveTab)
  const messageDetailOpen = useUIStore((state) => state.messageDetailOpen)
  const selectedMessageId = useUIStore((state) => state.selectedMessageId)
  const closeMessageDetail = useUIStore((state) => state.closeMessageDetail)
  const openMessageDetail = useUIStore((state) => state.openMessageDetail)
  const searchQuery = useUIStore((state) => state.searchQuery)
  const setSearchQuery = useUIStore((state) => state.setSearchQuery)

  // Conversations
  const {
    conversations,
    selectedConversation,
    selectedConversationId,
    isLoading: conversationsLoading,
    selectConversation,
    markAsRead,
    archiveConversation,
    removeConversation,
  } = useConversations()

  // Messages for selected conversation
  const { messages, isLoading: messagesLoading, isSending, sendMessage, removeMessage } =
    useMessages(selectedConversationId)

  // Handle conversation selection
  const handleConversationSelect = (conversationId: string) => {
    selectConversation(conversationId)
    markAsRead(conversationId)
  }

  // Handle message send
  const handleSendMessage = async (data: { body: string; mediaUrls?: string[] }) => {
    await sendMessage(data)
  }

  // Handle message click for details
  const handleMessageClick = (messageId: string) => {
    openMessageDetail(messageId)
  }

  // Get selected message for detail drawer
  const selectedMessage = selectedMessageId
    ? messages.find((msg) => msg.id === selectedMessageId)
    : null

  const visibleConversations = conversations
    .filter((c) => !c.isArchived)
    .filter((c) => {
      const q = searchQuery.trim().toLowerCase()
      if (!q) return true
      const hay = [c.contactName, c.contactPhone, c.lastMessage ?? ''].join(' ').toLowerCase()
      return hay.includes(q)
    })

  const exportConversation = () => {
    if (!selectedConversationId || !selectedConversation) return
    const payload = {
      conversation: selectedConversation,
      exportedAt: new Date().toISOString(),
      messages,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${selectedConversation.contactName}-${selectedConversationId}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // Settings menu handlers
  const handleAccountSettings = () => {
    toast({
      title: 'Account Settings',
      description: 'This feature is coming soon!',
    })
  }

  const handlePreferences = () => {
    toast({
      title: 'Preferences',
      description: 'This feature is coming soon!',
    })
  }

  const handleWebhooks = () => {
    toast({
      title: 'Webhooks',
      description: 'This feature is coming soon!',
    })
  }

  const handleApiKeys = () => {
    toast({
      title: 'API Keys',
      description: 'This feature is coming soon!',
    })
  }

  const handleDocumentation = () => {
    window.open('https://github.com/fatih4159/fractal', '_blank')
  }

  const handleAbout = () => {
    toast({
      title: 'Fractal',
      description: 'A modern messaging platform built with React and Node.js',
    })
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAccountClick={handleAccountSettings}
        onPreferencesClick={handlePreferences}
        onWebhooksClick={handleWebhooks}
        onApiKeysClick={handleApiKeys}
        onDocumentationClick={handleDocumentation}
        onAboutClick={handleAbout}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <>
            {/* Conversation List */}
            <div className="w-80 border-r flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Conversations</h2>
                {!isConnected && (
                  <div className="text-xs text-yellow-600 mt-1">
                    Connecting to server...
                  </div>
                )}
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="pl-10"
                  />
                </div>
              </div>
              <ConversationList
                conversations={visibleConversations}
                selectedConversationId={selectedConversationId}
                onConversationSelect={handleConversationSelect}
                isLoading={conversationsLoading}
              />
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  <Header
                    contactName={selectedConversation.contactName}
                    contactPhone={selectedConversation.contactPhone}
                    channelType={selectedConversation.channelType}
                    onViewContact={() => {
                      useContactsStore.getState().selectContact(selectedConversation.contactId)
                      setActiveTab('contacts')
                    }}
                    onExportConversation={exportConversation}
                    onArchiveConversation={() => void archiveConversation(selectedConversation.id)}
                    onDeleteConversation={() => void removeConversation(selectedConversation.id)}
                  />
                  <div className="flex-1 overflow-hidden">
                    <ChatWindow
                      messages={messages}
                      isLoading={messagesLoading}
                      onMessageClick={handleMessageClick}
                    />
                  </div>
                  <ComposerBar
                    onSendMessage={handleSendMessage}
                    disabled={isSending}
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h2 className="text-2xl font-semibold mb-2">
                      Select a conversation
                    </h2>
                    <p className="text-muted-foreground">
                      Choose a conversation from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="flex-1 overflow-hidden">
            <ContactsPage />
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="flex-1 overflow-hidden">
            <TemplatesPage />
          </div>
        )}
      </div>

      {/* Message Detail Drawer */}
      <MessageDetailDrawer
        message={selectedMessage || null}
        open={messageDetailOpen}
        onClose={closeMessageDetail}
        onDelete={(messageId) => void removeMessage(messageId)}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}

export default App
