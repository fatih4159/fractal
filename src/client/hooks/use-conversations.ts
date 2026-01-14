import { useEffect, useCallback } from 'react'
import { useConversationsStore } from '../store/conversations'
import { api } from '../lib/api'
import { toast } from './use-toast'
import { mapServerConversation } from '../lib/mappers'

export function useConversations() {
  const conversations = useConversationsStore((state) => state.conversations)
  const selectedConversationId = useConversationsStore(
    (state) => state.selectedConversationId
  )
  const isLoading = useConversationsStore((state) => state.isLoading)
  const error = useConversationsStore((state) => state.error)

  const setConversations = useConversationsStore((state) => state.setConversations)
  const addConversation = useConversationsStore((state) => state.addConversation)
  const updateConversation = useConversationsStore((state) => state.updateConversation)
  const deleteConversation = useConversationsStore((state) => state.deleteConversation)
  const selectConversation = useConversationsStore((state) => state.selectConversation)
  const resetUnreadCount = useConversationsStore((state) => state.resetUnreadCount)
  const setLoading = useConversationsStore((state) => state.setLoading)
  const setError = useConversationsStore((state) => state.setError)
  const clearError = useConversationsStore((state) => state.clearError)

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      clearError()

      const response = await api.get('/api/conversations')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to fetch conversations')
      }

      const serverConversations = data?.data ?? []
      const transformedConversations = serverConversations.map(mapServerConversation)

      // Sort by last message date (most recent first)
      transformedConversations.sort((a: any, b: any) => {
        const dateA = a.lastMessageAt?.getTime() || 0
        const dateB = b.lastMessageAt?.getTime() || 0
        return dateB - dateA
      })

      setConversations(transformedConversations)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch conversations'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [setLoading, setConversations, setError, clearError])

  // Create a new conversation
  const createConversation = useCallback(
    async (data: { contactId: string; channelType: string }) => {
      try {
        setLoading(true)
        clearError()

        const response = await api.post('/api/conversations', data)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.error?.message || 'Failed to create conversation')
        }

        const conversation = mapServerConversation(result?.data)

        addConversation(conversation)
        selectConversation(conversation.id)

        toast({
          title: 'Conversation created',
          description: `Started conversation with ${conversation.contactName}`,
        })

        return conversation
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create conversation'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        return null
      } finally {
        setLoading(false)
      }
    },
    [setLoading, addConversation, selectConversation, setError, clearError]
  )

  // Archive a conversation
  const archiveConversation = useCallback(
    async (conversationId: string) => {
      try {
        const response = await api.patch(`/api/conversations/${conversationId}/archive`, {
          archive: true,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data?.error?.message || 'Failed to archive conversation')
        }

        updateConversation(conversationId, { isArchived: true })

        toast({
          title: 'Conversation archived',
          description: 'The conversation has been archived',
        })
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to archive conversation'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    },
    [updateConversation]
  )

  // Delete a conversation
  const removeConversation = useCallback(
    async (conversationId: string) => {
      try {
        // Server-side delete endpoint is not implemented yet.
        // Keep this action as a safe no-op for now.
        deleteConversation(conversationId)

        toast({
          title: 'Conversation deleted',
          description: 'The conversation has been deleted',
        })
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete conversation'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    },
    [deleteConversation]
  )

  // Mark conversation as read
  const markAsRead = useCallback(
    (conversationId: string) => {
      resetUnreadCount(conversationId)
    },
    [resetUnreadCount]
  )

  // Get selected conversation
  const selectedConversation = conversations.find(
    (conv) => conv.id === selectedConversationId
  )

  // Fetch conversations on mount
  useEffect(() => {
    // Run once on mount (prevents accidental re-fetch loops if deps are unstable)
    fetchConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    conversations,
    selectedConversation,
    selectedConversationId,
    isLoading,
    error,
    fetchConversations,
    createConversation,
    selectConversation,
    archiveConversation,
    removeConversation,
    markAsRead,
  }
}
