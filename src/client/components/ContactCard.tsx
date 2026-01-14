import { Mail, Calendar, Edit, Trash2, MessageSquare } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { formatDateTime } from '../lib/utils'

type ChannelType = 'SMS' | 'MMS' | 'WHATSAPP' | 'MESSENGER'

interface Channel {
  id: string
  type: ChannelType
  identifier: string
  isVerified: boolean
  isPrimary: boolean
}

interface Contact {
  id: string
  name: string
  email?: string
  channels: Channel[]
  createdAt: Date | string
  metadata?: Record<string, any>
}

interface ContactCardProps {
  contact: Contact
  onEdit?: (contactId: string) => void
  onDelete?: (contactId: string) => void
  onStartConversation?: (contactId: string, channelType: ChannelType) => void
  variant?: 'full' | 'compact'
}

export function ContactCard({
  contact,
  onEdit,
  onDelete,
  onStartConversation,
  variant = 'full',
}: ContactCardProps) {
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

  const getChannelColor = (type: ChannelType) => {
    switch (type) {
      case 'WHATSAPP':
        return 'bg-green-500'
      case 'SMS':
        return 'bg-blue-500'
      case 'MMS':
        return 'bg-purple-500'
      case 'MESSENGER':
        return 'bg-indigo-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
        <Avatar>
          <AvatarImage src="" alt={contact.name} />
          <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
          {contact.email && (
            <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
          )}
        </div>
        <div className="flex space-x-1">
          {contact.channels.map((channel) => (
            <div key={channel.id} className="text-sm">
              {getChannelIcon(channel.type)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="" alt={contact.name} />
            <AvatarFallback className="text-lg">{getInitials(contact.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{contact.name}</h2>
            {contact.email && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                <Mail className="h-3 w-3" />
                <span>{contact.email}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          {onEdit && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit(contact.id)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => onDelete(contact.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Channels */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-3">Communication Channels</h3>
        <div className="space-y-2">
          {contact.channels.length === 0 ? (
            <div className="text-sm text-muted-foreground">No channels available</div>
          ) : (
            contact.channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-xl">{getChannelIcon(channel.type)}</div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getChannelColor(channel.type)} text-white text-xs`}>
                        {channel.type}
                      </Badge>
                      {channel.isPrimary && (
                        <Badge variant="outline" className="text-xs">
                          Primary
                        </Badge>
                      )}
                      {channel.isVerified && (
                        <Badge variant="secondary" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-mono mt-1">{channel.identifier}</div>
                  </div>
                </div>
                {onStartConversation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStartConversation(contact.id, channel.type)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Metadata */}
      <div className="text-xs text-muted-foreground flex items-center space-x-2">
        <Calendar className="h-3 w-3" />
        <span>Created {formatDateTime(contact.createdAt)}</span>
      </div>

      {contact.metadata && Object.keys(contact.metadata).length > 0 && (
        <>
          <Separator className="my-4" />
          <div>
            <h3 className="text-sm font-semibold mb-2">Additional Info</h3>
            <div className="space-y-1">
              {Object.entries(contact.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
