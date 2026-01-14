import { useEffect, useCallback } from 'react'
import { useMessagesStore, type Message } from '../store/messages'
import { useConversationsStore } from '../store/conversations'
import { api } from '../lib/api'
import { toast } from './use-toast'

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

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return

    try {
      setLoading(true)
      clearError()

      const response = await api.get(`/api/messages?conversationId=${conversationId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch messages')
      }

      // Transform date strings to Date objects
      const transformedMessages = data.messages.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
        updatedAt: new Date(msg.updatedAt),
        sentAt: msg.sentAt ? new Date(msg.sentAt) : undefined,
        deliveredAt: msg.deliveredAt ? new Date(msg.deliveredAt) : undefined,
        readAt: msg.readAt ? new Date(msg.readAt) : undefined,
      }))

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

      try {
        setSending(true)
        clearError()

        const response = await api.post('/api/messages', {
          conversationId,
          body: data.body,
          mediaUrls: data.mediaUrls,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send message')
        }

        // Transform date strings
        const message = {
          ...result.message,
          createdAt: new Date(result.message.createdAt),
          updatedAt: new Date(result.message.updatedAt),
          sentAt: result.message.sentAt ? new Date(result.message.sentAt) : undefined,
        }

        // Add message to store (optimistic update)
        addMessage(message)

        // Update conversation last message
        updateConversation(conversationId, {
          lastMessage: message.body,
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
    [conversationId, setSending, addMessage, updateConversation, setError, clearError]
  )

  // Delete a message
  const removeMessage = useCallback(
    async (messageId: string) => {
      try {
        const response = await api.delete(`/api/messages/${messageId}`)

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete message')
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
