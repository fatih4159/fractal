import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useMessagesStore } from '../store/messages'
import { useConversationsStore } from '../store/conversations'
import { toast } from './use-toast'

interface SocketEvents {
  'message:new': (data: any) => void
  'message:status': (data: any) => void
  'conversation:update': (data: any) => void
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

  // Keep latest selection available to socket event handlers without re-creating the socket.
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId
  }, [selectedConversationId])

  useEffect(() => {
    // Get the socket URL from environment or default to same host
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin

    // Initialize socket connection
    const socket = io(socketUrl, {
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

      // Add message to store
      addMessage(data.message)

      // Update conversation
      if (data.conversation) {
        updateConversation(data.conversation.id, {
          lastMessage: data.message.body,
          lastMessageAt: new Date(data.message.createdAt),
        })

        // Increment unread count if not the current conversation
        if (data.conversation.id !== selectedConversationIdRef.current) {
          incrementUnreadCount(data.conversation.id)
        }
      }

      // Show toast notification for inbound messages
      if (data.message.direction === 'INBOUND') {
        toast({
          title: 'New Message',
          description: data.message.body?.slice(0, 50) + (data.message.body?.length > 50 ? '...' : ''),
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

    socket.on('conversation:update', (data) => {
      console.log('Conversation update:', data)
      updateConversation(data.id, data.updates)
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
