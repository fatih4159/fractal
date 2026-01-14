import { Copy, Download, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { messagesApi } from '../lib/api'
import { toast } from '../hooks/use-toast'

type MessageStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'UNDELIVERED' | 'CANCELED'
type Direction = 'INBOUND' | 'OUTBOUND'

interface StatusEvent {
  id: string
  status: MessageStatus
  timestamp: Date | string
}

interface Message {
  id: string
  twilioSid?: string | null
  body: string
  from: string
  to: string
  direction: Direction
  channelType: string
  status: MessageStatus
  mediaUrls?: string[]
  statusHistory?: StatusEvent[]
  errorCode?: string | null
  errorMessage?: string | null
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

  const [details, setDetails] = useState<Message | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !message?.id) return
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)
        const resp = await messagesApi.get(message.id)
        if (cancelled) return
        setDetails(
          resp.data
            ? ({
                ...(resp.data as any),
                twilioSid: (resp.data as any).twilioSid ?? null,
                errorCode: (resp.data as any).errorCode ?? null,
                errorMessage: (resp.data as any).errorMessage ?? null,
              } as any)
            : null
        )
      } catch (err) {
        if (cancelled) return
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to load message details',
          variant: 'destructive',
        })
        setDetails(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, message?.id])

  const m = useMemo(() => details ?? message, [details, message])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: text })
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
            {loading && (
              <div className="text-sm text-muted-foreground">Loading details…</div>
            )}
            {/* Message Content */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Message</h3>
              <div className="p-4 rounded-lg bg-muted">
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>

            {/* Media */}
            {m.mediaUrls && m.mediaUrls.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Media</h3>
                <div className="grid grid-cols-2 gap-2">
                  {m.mediaUrls.map((url, index) => (
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
                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
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
                <Badge variant={m.direction === 'OUTBOUND' ? 'default' : 'secondary'}>
                  {m.direction}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <Badge className={cn('text-white', getStatusColor(m.status))}>
                  {m.status}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Channel</div>
                <div className="text-sm font-medium">{m.channelType}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">From</div>
                <div className="text-sm font-medium flex items-center space-x-2">
                  <span>{m.from}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(m.from)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">To</div>
                <div className="text-sm font-medium flex items-center space-x-2">
                  <span>{m.to}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(m.to)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {m.twilioSid && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Twilio SID</div>
                  <div className="text-sm font-mono flex items-center space-x-2">
                    <span className="truncate">{m.twilioSid}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(m.twilioSid!)}
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
                  <span className="font-medium">{formatDateTime(m.createdAt)}</span>
                </div>
                {m.sentAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sent</span>
                    <span className="font-medium">{formatDateTime(m.sentAt)}</span>
                  </div>
                )}
                {m.deliveredAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivered</span>
                    <span className="font-medium">{formatDateTime(m.deliveredAt)}</span>
                  </div>
                )}
                {m.readAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Read</span>
                    <span className="font-medium">{formatDateTime(m.readAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status History */}
            {m.statusHistory && m.statusHistory.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">Status History</h3>
                  <div className="space-y-2">
                    {m.statusHistory.map((event) => (
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
            {(m.errorCode || m.errorMessage) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-destructive">Error</h3>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive">
                    {m.errorCode && (
                      <div className="mb-2">
                        <span className="text-xs text-muted-foreground">Code: </span>
                        <span className="text-sm font-mono">{m.errorCode}</span>
                      </div>
                    )}
                    {m.errorMessage && (
                      <div>
                        <span className="text-xs text-muted-foreground">Message: </span>
                        <span className="text-sm">{m.errorMessage}</span>
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
                    disabled={m.status !== 'QUEUED'}
                    onClick={() => {
                      onDelete(m.id)
                      onClose()
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancel Message
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
