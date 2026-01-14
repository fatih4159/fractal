import { MessageSquare, Users, Settings, FileText } from 'lucide-react'
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

const tabs = [
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'templates', label: 'Templates', icon: FileText },
] as const

type ActiveTab = (typeof tabs)[number]['id']

interface SidebarProps {
  activeTab?: ActiveTab
  onTabChange?: (tab: ActiveTab) => void
}

export function Sidebar({ activeTab = 'conversations', onTabChange }: SidebarProps) {
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
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Account</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuItem>Webhooks</DropdownMenuItem>
            <DropdownMenuItem>API Keys</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Documentation</DropdownMenuItem>
            <DropdownMenuItem>About</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
