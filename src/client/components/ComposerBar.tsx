import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Paperclip, Smile, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { cn } from '../lib/utils'

interface ComposerBarProps {
  onSendMessage?: (message: { body: string; mediaUrls?: string[] }) => void
  onTyping?: () => void
  disabled?: boolean
  placeholder?: string
}

export function ComposerBar({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = 'Type a message...',
}: ComposerBarProps) {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      // In a real implementation, you would upload files and get URLs
      const mediaUrls = attachments.map((file) => URL.createObjectURL(file))

      onSendMessage?.({
        body: message.trim(),
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      })

      setMessage('')
      setAttachments([])
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    onTyping?.()
  }

  return (
    <div className="border-t bg-background p-4">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="relative group rounded-lg border p-2 pr-8 bg-muted text-sm flex items-center space-x-2"
            >
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="max-w-[200px] truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-center space-x-2">
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Message Input */}
        <Input
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
        />

        {/* Emoji Button */}
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          title="Emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          size="icon"
          className={cn(
            'transition-all',
            message.trim() || attachments.length > 0 ? 'scale-100' : 'scale-90'
          )}
          title="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {/* Character Count (optional) */}
      {message.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground text-right">
          {message.length} characters
        </div>
      )}
    </div>
  )
}
