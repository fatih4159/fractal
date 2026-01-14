import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useMessagesStore } from '../store/messages'
import { useConversationsStore } from '../store/conversations'
import { toast } from './use-toast'
import { mapServerConversation, mapServerMessage } from '../lib/mappers'

interface SocketEvents {
  'message:new': (data: any) => void
  'message:status': (data: any) => void
  'conversation:updated': (data: any) => void
  'conversation:new': (data: any) => void
  connect: () => void
  disconnect: () => void
  error: (error: Error) => void
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const selectedConversationId = useConversationsStore(
    (state) => state.selectedConversationId
  )
  const selectedConversationIdRef = useRef<string | null>(selectedConversationId)
  const joinedConversationIdRef = useRef<string | null>(null)

  // Keep latest selection available to socket event handlers without re-creating the socket.
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId
  }, [selectedConversationId])

  useEffect(() => {
    // Get the socket URL from environment or default to same host
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin

    // Initialize socket connection
    const socket = io(`${socketUrl}/messaging`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    // Pull latest store actions (avoid unstable deps causing reconnect loops)
    const addMessage = useMessagesStore.getState().addMessage
    const updateMessage = useMessagesStore.getState().updateMessage
    const updateConversation = useConversationsStore.getState().updateConversation
    const addConversation = useConversationsStore.getState().addConversation
    const incrementUnreadCount = useConversationsStore.getState().incrementUnreadCount

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      setIsConnected(true)
      setError(null)

      // Join currently selected conversation (if any)
      const current = selectedConversationIdRef.current
      if (current) {
        socket.emit('conversation:join', current)
        joinedConversationIdRef.current = current
      }
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err)
      setError(err)
      setIsConnected(false)
    })

    // Message events
    socket.on('message:new', (data) => {
      console.log('New message received:', data)

      // Server may emit either the message directly or { message, conversation }
      const serverMessage = data?.message ?? data
      const message = mapServerMessage(serverMessage)
      addMessage(message)

      // Update conversation
      const serverConversation = data?.conversation ?? serverMessage?.conversation
      if (serverConversation?.id) {
        const conv = mapServerConversation(serverConversation)

        // Ensure the conversation exists; if not, add it.
        addConversation(conv)

        updateConversation(conv.id, {
          lastMessage: message.body ?? '',
          lastMessageAt: message.createdAt,
        })

        // Increment unread count if not the current conversation (only for inbound)
        if (
          message.direction === 'INBOUND' &&
          conv.id !== selectedConversationIdRef.current
        ) {
          incrementUnreadCount(conv.id)
        }
      }

      // Show toast notification for inbound messages
      if (message.direction === 'INBOUND') {
        toast({
          title: 'New Message',
          description:
            (message.body ?? '').slice(0, 50) +
            ((message.body ?? '').length > 50 ? '...' : ''),
        })
      }
    })

    socket.on('message:status', (data) => {
      console.log('Message status update:', data)

      // Update message status
      updateMessage(data.messageId, {
        status: data.status,
        ...(data.deliveredAt && { deliveredAt: new Date(data.deliveredAt) }),
        ...(data.readAt && { readAt: new Date(data.readAt) }),
        ...(data.errorMessage && { errorMessage: data.errorMessage }),
        ...(data.errorCode && { errorCode: data.errorCode }),
      })
    })

    socket.on('conversation:updated', (data) => {
      console.log('Conversation update:', data)
      if (data?.id) {
        updateConversation(data.id, data)
      }
    })

    socket.on('conversation:new', (data) => {
      console.log('New conversation:', data)
      addConversation(data.conversation)

      toast({
        title: 'New Conversation',
        description: `Conversation with ${data.conversation.contactName} started`,
      })
    })

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  // Join/leave conversation rooms based on UI selection
  useEffect(() => {
    if (!socketRef.current || !isConnected) return

    const prev = joinedConversationIdRef.current
    const next = selectedConversationId

    if (prev && prev !== next) {
      socketRef.current.emit('conversation:leave', prev)
    }

    if (next && prev !== next) {
      socketRef.current.emit('conversation:join', next)
      joinedConversationIdRef.current = next
    }

    if (!next) {
      joinedConversationIdRef.current = null
    }
  }, [selectedConversationId, isConnected])

  // Emit events helper
  const emit = <K extends keyof SocketEvents>(
    event: K,
    data?: any
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !isConnected) {
        reject(new Error('Socket not connected'))
        return
      }

      socketRef.current.emit(event as string, data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })
    })
  }

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit,
  }
}
