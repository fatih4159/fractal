import { MessageSquare, Users, Settings, FileText, RefreshCw } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useState } from 'react'
import { api } from '../lib/api'
import { toast } from '../hooks/use-toast'

const tabs = [
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'templates', label: 'Templates', icon: FileText },
] as const

type ActiveTab = (typeof tabs)[number]['id']

interface SidebarProps {
  activeTab?: ActiveTab
  onTabChange?: (tab: ActiveTab) => void
  onAccountClick?: () => void
  onPreferencesClick?: () => void
  onWebhooksClick?: () => void
  onApiKeysClick?: () => void
  onDocumentationClick?: () => void
  onAboutClick?: () => void
}

export function Sidebar({
  activeTab = 'conversations',
  onTabChange,
  onAccountClick,
  onPreferencesClick,
  onWebhooksClick,
  onApiKeysClick,
  onDocumentationClick,
  onAboutClick
}: SidebarProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleBulkSync = async () => {
    setIsSyncing(true)
    try {
      const response = await api.post('/api/conversations/bulk-sync?limit=1000')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error?.message || 'Bulk sync failed')
      }

      toast({
        title: 'Sync Complete',
        description: `Imported ${result.data.messagesInserted} messages, created ${result.data.conversationsCreated} conversations`,
      })

      // Reload the page to show new conversations
      window.location.reload()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync from Twilio'
      toast({
        title: 'Sync Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-16 bg-primary text-primary-foreground border-r">
      {/* Logo/Brand */}
      <div className="flex items-center justify-center h-16 border-b border-primary-foreground/10">
        <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center font-bold text-sm">
          F
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex-1 flex flex-col items-center py-4 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="icon"
              className={cn(
                'w-12 h-12 relative',
                isActive
                  ? 'bg-primary-foreground/10 text-primary-foreground'
                  : 'text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5'
              )}
              onClick={() => onTabChange?.(tab.id)}
              title={tab.label}
            >
              <Icon className="h-5 w-5" />
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full" />
              )}
            </Button>
          )
        })}
      </div>

      <Separator className="bg-primary-foreground/10" />

      {/* Settings */}
      <div className="flex items-center justify-center p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleBulkSync} disabled={isSyncing}>
              <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Syncing from Twilio...' : 'Sync from Twilio'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAccountClick} disabled={!onAccountClick}>
              Account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPreferencesClick} disabled={!onPreferencesClick}>
              Preferences
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onWebhooksClick} disabled={!onWebhooksClick}>
              Webhooks
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onApiKeysClick} disabled={!onApiKeysClick}>
              API Keys
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDocumentationClick} disabled={!onDocumentationClick}>
              Documentation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAboutClick} disabled={!onAboutClick}>
              About
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
