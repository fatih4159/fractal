import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { ConversationList } from './components/ConversationList'
import { ChatWindow } from './components/ChatWindow'
import { ComposerBar } from './components/ComposerBar'
import { MessageDetailDrawer } from './components/MessageDetailDrawer'
import { ContactsPage } from './components/ContactsPage'
import { Toaster } from './components/ui/toaster'
import { useSocket } from './hooks/use-socket'
import { useConversations } from './hooks/use-conversations'
import { useMessages } from './hooks/use-messages'
import { useUIStore } from './store/ui'

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

  // Conversations
  const {
    conversations,
    selectedConversation,
    selectedConversationId,
    isLoading: conversationsLoading,
    selectConversation,
    markAsRead,
  } = useConversations()

  // Messages for selected conversation
  const { messages, isLoading: messagesLoading, isSending, sendMessage } =
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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

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
              </div>
              <ConversationList
                conversations={conversations}
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-semibold mb-2">Templates</h2>
              <p className="text-muted-foreground">
                Message templates coming soon
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Message Detail Drawer */}
      <MessageDetailDrawer
        message={selectedMessage || null}
        open={messageDetailOpen}
        onClose={closeMessageDetail}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}

export default App
