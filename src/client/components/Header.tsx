import { Search, Phone, Video, MoreVertical } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

interface HeaderProps {
  contactName?: string
  contactPhone?: string
  channelType?: 'SMS' | 'MMS' | 'WHATSAPP' | 'MESSENGER'
  isOnline?: boolean
  onSearch?: (query: string) => void
  onViewContact?: () => void
  onExportConversation?: () => void
  onArchiveConversation?: () => void
  onDeleteConversation?: () => void
}

export function Header({
  contactName,
  contactPhone,
  channelType,
  isOnline = false,
  onSearch,
  onViewContact,
  onExportConversation,
  onArchiveConversation,
  onDeleteConversation,
}: HeaderProps) {
  const getChannelBadgeColor = (type?: string) => {
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

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex items-center justify-between h-16 px-4 border-b bg-background">
      {/* Left: Contact Info or Search */}
      <div className="flex items-center space-x-3 flex-1">
        {contactName ? (
          <>
            <Avatar>
              <AvatarImage src="" alt={contactName} />
              <AvatarFallback>{getInitials(contactName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <h2 className="font-semibold">{contactName}</h2>
                {channelType && (
                  <Badge
                    variant="secondary"
                    className={`${getChannelBadgeColor(channelType)} text-white text-xs`}
                  >
                    {channelType}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>{contactPhone}</span>
                {isOnline && (
                  <>
                    <span>•</span>
                    <span className="text-green-500">Online</span>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-10"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Right: Actions */}
      {contactName && (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" title="Voice Call">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Video Call">
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewContact} disabled={!onViewContact}>
                View Contact
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExportConversation}
                disabled={!onExportConversation}
              >
                Export Conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchiveConversation} disabled={!onArchiveConversation}>
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDeleteConversation}
                disabled={!onDeleteConversation}
              >
                Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
