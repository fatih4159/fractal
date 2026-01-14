import type { Conversation as ServerConversation, Message as ServerMessage } from '../../shared/types'
import type { Conversation } from '../store/conversations'
import type { Message } from '../store/messages'

function getContactPhoneForChannel(contact: any, channelType: string): string {
  const channels: any[] = contact?.channels ?? []
  const matching = channels.filter((c) => c.type === channelType)
  const primary = matching.find((c) => c.isPrimary)
  return (primary ?? matching[0])?.identifier ?? ''
}

export function mapServerConversation(conv: Partial<ServerConversation> & any): Conversation {
  const contact = conv?.contact ?? {}
  return {
    id: conv.id as string,
    contactId: conv.contactId as string,
    contactName: contact.name ?? 'Unknown',
    contactPhone:
      getContactPhoneForChannel(contact, conv.channelType) || contact.name || '',
    channelType: conv.channelType as any,
    lastMessage: conv.lastMessage ?? null,
    lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt) : null,
    unreadCount: conv.unreadCount ?? 0,
    isArchived: conv.isArchived ?? false,
    createdAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
    updatedAt: conv.updatedAt ? new Date(conv.updatedAt) : new Date(),
    metadata: conv.metadata ?? undefined,
  }
}

export function mapServerMessage(msg: Partial<ServerMessage> & any): Message {
  return {
    id: msg.id as string,
    twilioSid: msg.twilioSid ?? undefined,
    conversationId: msg.conversationId as string,
    direction: msg.direction as any,
    channelType: msg.channelType as any,
    from: msg.from as string,
    to: msg.to as string,
    body: msg.body ?? '',
    mediaUrls: msg.mediaUrls ?? [],
    status: msg.status as any,
    errorCode: msg.errorCode ?? undefined,
    errorMessage: msg.errorMessage ?? undefined,
    scheduledAt: msg.scheduledAt ? new Date(msg.scheduledAt) : undefined,
    sentAt: msg.sentAt ? new Date(msg.sentAt) : undefined,
    deliveredAt: msg.deliveredAt ? new Date(msg.deliveredAt) : undefined,
    readAt: msg.readAt ? new Date(msg.readAt) : undefined,
    createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
    updatedAt: msg.updatedAt ? new Date(msg.updatedAt) : new Date(),
    metadata: msg.metadata ?? undefined,
  }
}

