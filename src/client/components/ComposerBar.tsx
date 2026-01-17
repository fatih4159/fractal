import { useState, KeyboardEvent } from 'react'
import { Send, Paperclip, Smile, X, Link2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { cn } from '../lib/utils'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'

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
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false)
  const [mediaUrlDraft, setMediaUrlDraft] = useState('')
  const [emojiDialogOpen, setEmojiDialogOpen] = useState(false)

  const handleSend = () => {
    if (message.trim() || mediaUrls.length > 0) {
      onSendMessage?.({
        body: message.trim(),
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      })

      setMessage('')
      setMediaUrls([])
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const removeAttachment = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const addMediaUrl = () => {
    const next = mediaUrlDraft.trim()
    if (!next) return
    try {
      // Validate URL format (supports https://, http://, etc.)
      // eslint-disable-next-line no-new
      new URL(next)
    } catch {
      return
    }
    setMediaUrls((prev) => [...prev, next])
    setMediaUrlDraft('')
    setMediaDialogOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    onTyping?.()
  }

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    setEmojiDialogOpen(false)
    onTyping?.()
  }

  return (
    <div className="border-t bg-background p-4">
      {/* Attachments Preview */}
      {mediaUrls.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {mediaUrls.map((url, index) => (
            <div
              key={index}
              className="relative group rounded-lg border p-2 pr-8 bg-muted text-sm flex items-center space-x-2"
            >
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="max-w-[260px] truncate underline underline-offset-2"
              >
                {url}
              </a>
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
          onClick={() => setMediaDialogOpen(true)}
          title="Attach media URL"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

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
          onClick={() => setEmojiDialogOpen(true)}
          title="Emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && mediaUrls.length === 0)}
          size="icon"
          className={cn(
            'transition-all',
            message.trim() || mediaUrls.length > 0 ? 'scale-100' : 'scale-90'
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

      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attach media URL</DialogTitle>
            <DialogDescription>
              Add a publicly accessible URL (Twilio can only fetch public media).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>URL</Label>
              <Input
                value={mediaUrlDraft}
                onChange={(e) => setMediaUrlDraft(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setMediaDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addMediaUrl} disabled={!mediaUrlDraft.trim()}>
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={emojiDialogOpen} onOpenChange={setEmojiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Emoji</DialogTitle>
            <DialogDescription>
              Click an emoji to insert it into your message.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-8 gap-2 p-2">
            {['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '🤚', '👏', '🙌', '👐', '🤲', '🙏', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '🎉', '🎊', '🎈', '🎁'].map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                className="text-2xl h-12 w-12 p-0 hover:bg-accent"
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
