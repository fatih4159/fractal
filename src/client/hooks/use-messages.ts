import { useEffect, useCallback } from 'react'
import { useMessagesStore, type Message } from '../store/messages'
import { useConversationsStore } from '../store/conversations'
import { api } from '../lib/api'
import { toast } from './use-toast'
import { mapServerMessage } from '../lib/mappers'

const EMPTY_MESSAGES: Message[] = []

export function useMessages(conversationId: string | null) {
  const messages = useMessagesStore((state) =>
    conversationId ? state.getMessagesByConversation(conversationId) : EMPTY_MESSAGES
  )
  const isLoading = useMessagesStore((state) => state.isLoading)
  const isSending = useMessagesStore((state) => state.isSending)
  const error = useMessagesStore((state) => state.error)

  const setMessages = useMessagesStore((state) => state.setMessages)
  const addMessage = useMessagesStore((state) => state.addMessage)
  const deleteMessage = useMessagesStore((state) => state.deleteMessage)
  const setLoading = useMessagesStore((state) => state.setLoading)
  const setSending = useMessagesStore((state) => state.setSending)
  const setError = useMessagesStore((state) => state.setError)
  const clearError = useMessagesStore((state) => state.clearError)

  const updateConversation = useConversationsStore((state) => state.updateConversation)
  const conversation = useConversationsStore((state) =>
    conversationId ? state.conversations.find((c) => c.id === conversationId) : undefined
  )

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return

    try {
      setLoading(true)
      clearError()

      // Best-effort: backfill from Twilio before reading from DB.
      // If Twilio credentials aren't configured, we still show DB messages.
      try {
        const syncResponse = await api.post(`/api/conversations/${conversationId}/sync?limit=200`)
        if (!syncResponse.ok) {
          const syncError = await syncResponse.json()
          console.error('Twilio sync failed:', syncError?.error?.message || 'Unknown error')
          toast({
            title: 'Warning',
            description: `Could not sync with Twilio: ${syncError?.error?.message || 'Unknown error'}`,
            variant: 'destructive',
          })
        } else {
          const syncResult = await syncResponse.json()
          console.log('Twilio sync completed:', syncResult?.data)
        }
      } catch (err) {
        console.error('Twilio sync error:', err)
        toast({
          title: 'Warning',
          description: 'Could not sync historical messages from Twilio',
          variant: 'destructive',
        })
      }

      const response = await api.get(`/api/messages?conversationId=${conversationId}`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to fetch messages')
      }

      const serverMessages = payload?.data ?? []

      const transformedMessages = serverMessages.map(mapServerMessage)

      setMessages(conversationId, transformedMessages)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [conversationId, setLoading, setMessages, setError, clearError])

  // Send a new message
  const sendMessage = useCallback(
    async (data: { body: string; mediaUrls?: string[] }) => {
      if (!conversationId) {
        toast({
          title: 'Error',
          description: 'No conversation selected',
          variant: 'destructive',
        })
        return
      }

      const to = conversation?.contactPhone
      const channelType = conversation?.channelType
      if (!to || !channelType) {
        toast({
          title: 'Error',
          description: 'Conversation is missing recipient/channel info',
          variant: 'destructive',
        })
        return
      }

      try {
        setSending(true)
        clearError()

        const response = await api.post('/api/messages', {
          conversationId,
          to,
          channelType,
          body: data.body,
          mediaUrls: data.mediaUrls,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.error?.message || 'Failed to send message')
        }

        const message = mapServerMessage(result.data)

        // Add message to store (optimistic update)
        addMessage(message)

        // Update conversation last message
        updateConversation(conversationId, {
          lastMessage: message.body ?? '',
          lastMessageAt: message.createdAt,
        })

        toast({
          title: 'Message sent',
          description: 'Your message has been sent successfully',
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      } finally {
        setSending(false)
      }
    },
    [conversationId, conversation, setSending, addMessage, updateConversation, setError, clearError]
  )

  // Delete a message
  const removeMessage = useCallback(
    async (messageId: string) => {
      try {
        const response = await api.delete(`/api/messages/${messageId}`)

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data?.error?.message || 'Failed to delete message')
        }

        deleteMessage(messageId)

        toast({
          title: 'Message deleted',
          description: 'The message has been deleted',
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete message'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    },
    [deleteMessage]
  )

  // Fetch messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      fetchMessages()
    }
  }, [conversationId, fetchMessages])

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    removeMessage,
    refetch: fetchMessages,
  }
}
