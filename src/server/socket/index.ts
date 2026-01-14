import { Server as SocketIOServer } from 'socket.io'
import type { Socket } from 'socket.io'

interface SocketData {
  userId?: string
  conversationIds: Set<string>
}

export function setupSocketIO(io: SocketIOServer) {
  const messaging = io.of('/messaging')

  messaging.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`)

    const socketData: SocketData = {
      conversationIds: new Set(),
    }

    // Join a conversation room
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`)
      socketData.conversationIds.add(conversationId)
      console.log(`📥 Socket ${socket.id} joined conversation: ${conversationId}`)
    })

    // Leave a conversation room
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`)
      socketData.conversationIds.delete(conversationId)
      console.log(`📤 Socket ${socket.id} left conversation: ${conversationId}`)
    })

    // Send a message (alternative to REST API)
    socket.on('message:send', async (data) => {
      try {
        console.log(`💬 Message send request from ${socket.id}:`, data)
        // TODO: Implement message sending logic
        // This will be implemented when we create the messaging service
        socket.emit('message:error', {
          error: 'Message sending via socket not yet implemented',
        })
      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('message:error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })

    // Mark message as read
    socket.on('message:read', async (messageId: string) => {
      try {
        console.log(`✓ Mark as read: ${messageId}`)
        // TODO: Update message read status in database
        // Broadcast to other clients in the conversation
        const conversationId = 'TODO' // Get from message
        messaging.to(`conversation:${conversationId}`).emit('message:read', {
          messageId,
          readAt: new Date().toISOString(),
        })
      } catch (error) {
        console.error('Error marking message as read:', error)
      }
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`)
      // Leave all conversation rooms
      socketData.conversationIds.forEach((conversationId) => {
        socket.leave(`conversation:${conversationId}`)
      })
    })
  })

  // Return messaging namespace for use in other modules
  return messaging
}

// Helper function to emit events to a conversation
export function emitToConversation(
  io: SocketIOServer,
  conversationId: string,
  event: string,
  data: any
) {
  io.of('/messaging').to(`conversation:${conversationId}`).emit(event, data)
}

// Helper function to emit to all connected clients
export function emitToAll(io: SocketIOServer, event: string, data: any) {
  io.of('/messaging').emit(event, data)
}
