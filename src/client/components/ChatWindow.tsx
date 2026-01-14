import { useEffect, useRef } from 'react'
import { ScrollArea } from './ui/scroll-area'
import { MessageBubble } from './MessageBubble'
import { Separator } from './ui/separator'
import { formatDate } from '../lib/utils'

type MessageStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'UNDELIVERED' | 'CANCELED'
type Direction = 'INBOUND' | 'OUTBOUND'

interface Message {
  id: string
  body: string
  from: string
  to: string
  direction: Direction
  status: MessageStatus
  mediaUrls?: string[]
  createdAt: Date | string
  errorMessage?: string
}

interface ChatWindowProps {
  messages: Message[]
  isLoading?: boolean
  onMessageClick?: (messageId: string) => void
  onImageClick?: (url: string) => void
}

export function ChatWindow({
  messages,
  isLoading = false,
  onMessageClick,
  onImageClick,
}: ChatWindowProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''
    let currentGroup: Message[] = []

    messages.forEach((message) => {
      const messageDate = formatDate(message.createdAt)
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup })
        }
        currentDate = messageDate
        currentGroup = [message]
      } else {
        currentGroup.push(message)
      }
    })

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup })
    }

    return groups
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading messages...</div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="font-semibold text-lg mb-2">No messages yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Start the conversation by sending a message below
        </p>
      </div>
    )
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <ScrollArea className="h-full px-4 py-4" ref={scrollAreaRef}>
      <div className="space-y-6">
        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date Separator */}
            <div className="flex items-center justify-center mb-4">
              <Separator className="flex-1" />
              <span className="px-4 text-xs text-muted-foreground font-medium">
                {group.date}
              </span>
              <Separator className="flex-1" />
            </div>

            {/* Messages */}
            {group.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onMessageClick={onMessageClick}
                onImageClick={onImageClick}
              />
            ))}
          </div>
        ))}
      </div>
      <div ref={messagesEndRef} />
    </ScrollArea>
  )
}
