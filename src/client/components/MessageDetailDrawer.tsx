import { Copy, Download, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { formatDateTime, cn } from '../lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'

type MessageStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'UNDELIVERED' | 'CANCELED'
type Direction = 'INBOUND' | 'OUTBOUND'

interface StatusEvent {
  id: string
  status: MessageStatus
  timestamp: Date | string
}

interface Message {
  id: string
  twilioSid?: string
  body: string
  from: string
  to: string
  direction: Direction
  channelType: string
  status: MessageStatus
  mediaUrls?: string[]
  statusHistory?: StatusEvent[]
  errorCode?: string
  errorMessage?: string
  createdAt: Date | string
  sentAt?: Date | string
  deliveredAt?: Date | string
  readAt?: Date | string
}

interface MessageDetailDrawerProps {
  message: Message | null
  open: boolean
  onClose: () => void
  onDelete?: (messageId: string) => void
}

export function MessageDetailDrawer({
  message,
  open,
  onClose,
  onDelete,
}: MessageDetailDrawerProps) {
  if (!message) return null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getStatusColor = (status: MessageStatus) => {
    switch (status) {
      case 'DELIVERED':
      case 'READ':
        return 'bg-green-500'
      case 'SENT':
        return 'bg-blue-500'
      case 'QUEUED':
      case 'SENDING':
        return 'bg-yellow-500'
      case 'FAILED':
      case 'UNDELIVERED':
      case 'CANCELED':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Message Details</DialogTitle>
          <DialogDescription>
            View detailed information about this message
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Message Content */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Message</h3>
              <div className="p-4 rounded-lg bg-muted">
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
              </div>
            </div>

            {/* Media */}
            {message.mediaUrls && message.mediaUrls.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Media</h3>
                <div className="grid grid-cols-2 gap-2">
                  {message.mediaUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Media ${index + 1}`}
                        className="rounded-lg w-full h-auto"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Message Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Direction</div>
                <Badge variant={message.direction === 'OUTBOUND' ? 'default' : 'secondary'}>
                  {message.direction}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <Badge className={cn('text-white', getStatusColor(message.status))}>
                  {message.status}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Channel</div>
                <div className="text-sm font-medium">{message.channelType}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">From</div>
                <div className="text-sm font-medium flex items-center space-x-2">
                  <span>{message.from}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(message.from)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">To</div>
                <div className="text-sm font-medium flex items-center space-x-2">
                  <span>{message.to}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(message.to)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {message.twilioSid && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Twilio SID</div>
                  <div className="text-sm font-mono flex items-center space-x-2">
                    <span className="truncate">{message.twilioSid}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(message.twilioSid!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Timestamps */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Timeline</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{formatDateTime(message.createdAt)}</span>
                </div>
                {message.sentAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sent</span>
                    <span className="font-medium">{formatDateTime(message.sentAt)}</span>
                  </div>
                )}
                {message.deliveredAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivered</span>
                    <span className="font-medium">{formatDateTime(message.deliveredAt)}</span>
                  </div>
                )}
                {message.readAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Read</span>
                    <span className="font-medium">{formatDateTime(message.readAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status History */}
            {message.statusHistory && message.statusHistory.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">Status History</h3>
                  <div className="space-y-2">
                    {message.statusHistory.map((event) => (
                      <div key={event.id} className="flex items-center justify-between text-sm">
                        <Badge className={cn('text-white', getStatusColor(event.status))}>
                          {event.status}
                        </Badge>
                        <span className="text-muted-foreground">
                          {formatDateTime(event.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Error Info */}
            {(message.errorCode || message.errorMessage) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-destructive">Error</h3>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive">
                    {message.errorCode && (
                      <div className="mb-2">
                        <span className="text-xs text-muted-foreground">Code: </span>
                        <span className="text-sm font-mono">{message.errorCode}</span>
                      </div>
                    )}
                    {message.errorMessage && (
                      <div>
                        <span className="text-xs text-muted-foreground">Message: </span>
                        <span className="text-sm">{message.errorMessage}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            {onDelete && (
              <>
                <Separator />
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onDelete(message.id)
                      onClose()
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Message
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
