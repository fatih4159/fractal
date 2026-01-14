import { useMemo, useState } from 'react'
import { Plus, Search, Trash2, Edit3, Link2, MessageSquare } from 'lucide-react'
import { ScrollArea } from './ui/scroll-area'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { Label } from './ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { ContactCard } from './ContactCard'
import { useContacts } from '../hooks/use-contacts'
import { useConversations } from '../hooks/use-conversations'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'
import type { ChannelType } from '../../shared/types'

type Contact = ReturnType<typeof useContacts>['contacts'][number]

const CHANNEL_TYPES: ChannelType[] = ['SMS', 'MMS', 'WHATSAPP', 'MESSENGER'] as any

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  options: string[]
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

export function ContactsPage() {
  const {
    contacts,
    selectedContactId,
    selectedContact,
    isLoading,
    fetchContacts,
    createContact,
    editContact,
    removeContact,
  } = useContacts()
  const { createConversation } = useConversations()
  const setActiveTab = useUIStore((s) => s.setActiveTab)

  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [draftName, setDraftName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [draftChannels, setDraftChannels] = useState<
    Array<{ type: ChannelType; identifier: string; isPrimary?: boolean }>
  >([{ type: 'SMS' as any, identifier: '', isPrimary: true }])

  const [channelType, setChannelType] = useState<ChannelType>('SMS' as any)
  const [channelIdentifier, setChannelIdentifier] = useState('')
  const [channelPrimary, setChannelPrimary] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) => {
      const hay = [
        c.name,
        c.email ?? '',
        ...(c.channels ?? []).map((ch) => ch.identifier),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [contacts, query])

  const handleStartConversation = async (contactId: string, ch: any) => {
    const conversation = await createConversation({ contactId, channelType: ch })
    if (conversation) {
      setActiveTab('conversations')
    }
  }

  const openCreate = () => {
    setDraftName('')
    setDraftEmail('')
    setDraftChannels([{ type: 'SMS' as any, identifier: '', isPrimary: true }])
    setCreateOpen(true)
  }

  const openEdit = () => {
    if (!selectedContact) return
    setDraftName(selectedContact.name)
    setDraftEmail(selectedContact.email ?? '')
    setDraftChannels(
      (selectedContact.channels ?? []).map((ch) => ({
        type: ch.type as any,
        identifier: ch.identifier,
        isPrimary: ch.isPrimary,
      }))
    )
    setEditOpen(true)
  }

  const submitCreate = async () => {
    const channels = draftChannels
      .map((c) => ({ ...c, identifier: c.identifier.trim() }))
      .filter((c) => c.identifier.length > 0)
    await createContact({
      name: draftName.trim(),
      email: draftEmail.trim() || undefined,
      channels,
    })
    setCreateOpen(false)
  }

  const submitEdit = async () => {
    if (!selectedContactId) return
    await editContact(selectedContactId, {
      name: draftName.trim() || undefined,
      email: draftEmail.trim() || undefined,
    })
    setEditOpen(false)
  }

  const submitDelete = async () => {
    if (!selectedContactId) return
    await removeContact(selectedContactId)
    setDeleteOpen(false)
  }

  const removeDraftChannel = (index: number) => {
    setDraftChannels((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Contact list */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Contacts</h2>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts..."
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading contacts...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No contacts found</div>
          ) : (
            <div className="p-2 space-y-2">
              {filtered.map((c) => (
                <ContactListRow
                  key={c.id}
                  contact={c}
                  isSelected={c.id === selectedContactId}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: Details */}
      <div className="flex-1 overflow-hidden">
        {selectedContact ? (
          <div className="h-full overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {(selectedContact.channels ?? []).length} channels
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={openEdit}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            <ContactCard
              contact={selectedContact as any}
              onStartConversation={handleStartConversation as any}
            />

            <Separator className="my-6" />

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center space-x-2">
                <Link2 className="h-4 w-4" />
                <span>Add channel</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={channelType as any}
                    onChange={(v) => setChannelType(v as any)}
                    options={CHANNEL_TYPES as any}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Identifier</Label>
                  <Input
                    value={channelIdentifier}
                    onChange={(e) => setChannelIdentifier(e.target.value)}
                    placeholder="+49123456789"
                  />
                </div>
                <div className="flex items-center justify-between md:justify-end space-x-2">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={channelPrimary}
                      onChange={(e) => setChannelPrimary(e.target.checked)}
                    />
                    <span>Primary</span>
                  </label>
                  <Button
                    onClick={async () => {
                      if (!selectedContactId) return
                      if (!channelIdentifier.trim()) return
                      // Add to server and refresh list
                      const { contactsApi } = await import('../lib/api')
                      await contactsApi.addChannel(selectedContactId, {
                        type: channelType as any,
                        identifier: channelIdentifier.trim(),
                        isPrimary: channelPrimary,
                      } as any)

                      await fetchContacts()
                      setChannelIdentifier('')
                      setChannelPrimary(false)
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-2xl font-semibold mb-2">Select a contact</h2>
              <p className="text-muted-foreground">
                Choose a contact from the list to view details
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New contact</DialogTitle>
            <DialogDescription>Create a contact and add at least one channel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-semibold flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Channels</span>
              </div>
              <div className="space-y-2">
                {draftChannels.map((ch, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <div className="w-28">
                      <Select
                        value={ch.type as any}
                        onChange={(v) =>
                          setDraftChannels((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, type: v as any } : c))
                          )
                        }
                        options={CHANNEL_TYPES as any}
                      />
                    </div>
                    <Input
                      value={ch.identifier}
                      onChange={(e) =>
                        setDraftChannels((prev) =>
                          prev.map((c, i) =>
                            i === idx ? { ...c, identifier: e.target.value } : c
                          )
                        )
                      }
                      placeholder="+49123456789"
                    />
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!ch.isPrimary}
                        onChange={(e) =>
                          setDraftChannels((prev) =>
                            prev.map((c, i) =>
                              i === idx ? { ...c, isPrimary: e.target.checked } : c
                            )
                          )
                        }
                      />
                      <span>Primary</span>
                    </label>
                    <Button variant="ghost" size="icon" onClick={() => removeDraftChannel(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() =>
                    setDraftChannels((prev) => [...prev, { type: 'SMS' as any, identifier: '' }])
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add channel
                </Button>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitCreate} disabled={!draftName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit contact</DialogTitle>
            <DialogDescription>Update basic contact details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete contact?</DialogTitle>
            <DialogDescription>
              This will also delete the contact&apos;s conversations and messages.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ContactListRow({
  contact,
  isSelected,
}: {
  contact: Contact
  isSelected: boolean
}) {
  const selectContact = useContactsStore((s) => s.selectContact)
  return (
    <div
      className={`rounded-lg border p-3 hover:bg-accent transition-colors cursor-pointer ${
        isSelected ? 'bg-accent' : ''
      }`}
      onClick={() => selectContact(contact.id)}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{contact.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {contact.email ?? (contact.channels?.[0]?.identifier ?? '')}
          </div>
        </div>
        <div className="flex space-x-1 text-sm">
          {(contact.channels ?? []).slice(0, 3).map((ch) => (
            <span key={ch.id}>
              {ch.type === 'WHATSAPP'
                ? '💬'
                : ch.type === 'SMS'
                ? '📱'
                : ch.type === 'MMS'
                ? '📷'
                : '💌'}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

