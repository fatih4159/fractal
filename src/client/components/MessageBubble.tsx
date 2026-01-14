import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react'
import { cn, formatTime } from '../lib/utils'
import { Badge } from './ui/badge'

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

interface MessageBubbleProps {
  message: Message
  showTimestamp?: boolean
  onImageClick?: (url: string) => void
  onMessageClick?: (messageId: string) => void
}

export function MessageBubble({
  message,
  showTimestamp = true,
  onImageClick,
  onMessageClick,
}: MessageBubbleProps) {
  const isOutbound = message.direction === 'OUTBOUND'
  const hasMedia = message.mediaUrls && message.mediaUrls.length > 0
  const isFailed = message.status === 'FAILED' || message.status === 'UNDELIVERED'

  const getStatusIcon = () => {
    if (!isOutbound) return null

    switch (message.status) {
      case 'QUEUED':
      case 'SENDING':
        return <Clock className="h-3 w-3" />
      case 'SENT':
        return <Check className="h-3 w-3" />
      case 'DELIVERED':
        return <CheckCheck className="h-3 w-3" />
      case 'READ':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      case 'FAILED':
      case 'UNDELIVERED':
      case 'CANCELED':
        return <AlertCircle className="h-3 w-3 text-destructive" />
      default:
        return null
    }
  }

  return (
    <div
      className={cn('flex w-full mb-4', isOutbound ? 'justify-end' : 'justify-start')}
      onClick={() => onMessageClick?.(message.id)}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2 cursor-pointer',
          isOutbound
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted',
          isFailed && 'bg-destructive/10 border border-destructive'
        )}
      >
        {/* Media */}
        {hasMedia && (
          <div className="mb-2 space-y-2">
            {message.mediaUrls!.map((url, index) => (
              <div
                key={index}
                className="rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  onImageClick?.(url)
                }}
              >
                <img
                  src={url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Message Body */}
        {message.body && (
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.body}
          </div>
        )}

        {/* Error Message */}
        {isFailed && message.errorMessage && (
          <div className="mt-2 pt-2 border-t border-destructive/20">
            <Badge variant="destructive" className="text-xs">
              {message.errorMessage}
            </Badge>
          </div>
        )}

        {/* Timestamp and Status */}
        {showTimestamp && (
          <div
            className={cn(
              'flex items-center justify-end space-x-1 mt-1 text-xs',
              isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            <span>{formatTime(message.createdAt)}</span>
            {getStatusIcon()}
          </div>
        )}
      </div>
    </div>
  )
}
