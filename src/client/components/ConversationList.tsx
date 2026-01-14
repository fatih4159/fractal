import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { cn, formatDate } from '../lib/utils'

type ChannelType = 'SMS' | 'MMS' | 'WHATSAPP' | 'MESSENGER'

interface Conversation {
  id: string
  contactName: string
  contactPhone: string
  channelType: ChannelType
  lastMessage: string | null
  lastMessageAt: Date | string | null
  unreadCount: number
  isArchived?: boolean
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversationId?: string | null
  onConversationSelect?: (conversationId: string) => void
  isLoading?: boolean
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onConversationSelect,
  isLoading = false,
}: ConversationListProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getChannelIcon = (type: ChannelType) => {
    switch (type) {
      case 'WHATSAPP':
        return '💬'
      case 'SMS':
        return '📱'
      case 'MMS':
        return '📷'
      case 'MESSENGER':
        return '💌'
      default:
        return '💬'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading conversations...</div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-4xl mb-4">💬</div>
        <h3 className="font-semibold mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">
          Start a new conversation to see it here
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {conversations.map((conversation) => {
          const isSelected = conversation.id === selectedConversationId
          return (
            <div
              key={conversation.id}
              className={cn(
                'flex items-start space-x-3 p-4 cursor-pointer transition-colors hover:bg-accent',
                isSelected && 'bg-accent'
              )}
              onClick={() => onConversationSelect?.(conversation.id)}
            >
              {/* Avatar */}
              <div className="relative">
                <Avatar>
                  <AvatarImage src="" alt={conversation.contactName} />
                  <AvatarFallback>{getInitials(conversation.contactName)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 text-xs">
                  {getChannelIcon(conversation.channelType)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="font-semibold text-sm truncate">
                    {conversation.contactName}
                  </h3>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {conversation.lastMessageAt ? formatDate(conversation.lastMessageAt) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage ?? ''}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <Badge
                      variant="default"
                      className="ml-2 shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full text-xs"
                    >
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
