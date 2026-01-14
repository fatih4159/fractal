import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, Send, Plus, Trash2 } from 'lucide-react'
import { ScrollArea } from './ui/scroll-area'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { Label } from './ui/label'
import { templatesApi, messagesApi } from '../lib/api'
import { toast } from '../hooks/use-toast'
import { useConversationsStore } from '../store/conversations'
import { useMessagesStore } from '../store/messages'
import { mapServerMessage } from '../lib/mappers'

type Template = any

function getTemplateId(t: Template): string {
  return t?.sid ?? t?.twilioSid ?? t?.id ?? ''
}

function getTemplateName(t: Template): string {
  return t?.friendlyName ?? t?.name ?? getTemplateId(t)
}

function guessVariableKeys(t: Template): string[] {
  const v = t?.variables
  if (!v) return []
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'object') return Object.keys(v)
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) return parsed.map(String)
      if (parsed && typeof parsed === 'object') return Object.keys(parsed)
    } catch {
      // ignore
    }
  }
  return []
}

export function TemplatesPage() {
  const selectedConversationId = useConversationsStore((s) => s.selectedConversationId)
  const selectedConversation = useConversationsStore((s) =>
    selectedConversationId ? s.conversations.find((c) => c.id === selectedConversationId) : null
  )
  const addMessage = useMessagesStore.getState().addMessage
  const updateConversation = useConversationsStore.getState().updateConversation

  const [isLoading, setIsLoading] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [to, setTo] = useState('')
  const [variables, setVariables] = useState<Array<{ key: string; value: string }>>([])

  const selectedTemplate = useMemo(() => {
    if (!selectedId) return null
    return templates.find((t) => getTemplateId(t) === selectedId) ?? null
  }, [templates, selectedId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return templates
    return templates.filter((t) => {
      const hay = [getTemplateName(t), t?.language ?? '', getTemplateId(t)].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [templates, query])

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await templatesApi.list()
      setTemplates(res.data ?? [])
      if (!selectedId && (res.data ?? []).length > 0) {
        setSelectedId(getTemplateId((res.data ?? [])[0]))
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load templates',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Prefill "to" from selected conversation if possible
    if (selectedConversation?.contactPhone) {
      setTo(selectedConversation.contactPhone)
    }
  }, [selectedConversation?.contactPhone])

  useEffect(() => {
    if (!selectedTemplate) return
    const keys = guessVariableKeys(selectedTemplate)
    setVariables(keys.map((k) => ({ key: k, value: '' })))
  }, [selectedId])

  const send = async () => {
    if (!selectedTemplate) return
    const contentSid = getTemplateId(selectedTemplate)
    const payloadVars: Record<string, string> = {}
    variables
      .map((v) => ({ key: v.key.trim(), value: v.value }))
      .filter((v) => v.key.length > 0)
      .forEach((v) => {
        payloadVars[v.key] = v.value
      })

    try {
      const resp = await messagesApi.sendTemplate({
        to: to.trim(),
        contentSid,
        channelType: 'WHATSAPP' as any,
        variables: Object.keys(payloadVars).length ? payloadVars : undefined,
        conversationId: selectedConversationId ?? undefined,
      })

      if (resp.data) {
        const msg = mapServerMessage(resp.data as any)
        addMessage(msg)
        updateConversation(msg.conversationId, {
          lastMessage: msg.body ?? '',
          lastMessageAt: msg.createdAt,
        })
      }

      toast({
        title: 'Template sent',
        description: `Sent ${getTemplateName(selectedTemplate)}`,
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to send template',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: templates list */}
      <div className="w-96 border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Templates</h2>
            <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading templates...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No templates found</div>
          ) : (
            <div className="p-2 space-y-2">
              {filtered.map((t) => {
                const id = getTemplateId(t)
                const active = id === selectedId
                return (
                  <div
                    key={id}
                    className={`rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors ${
                      active ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedId(id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{getTemplateName(t)}</div>
                        <div className="text-xs text-muted-foreground truncate">{id}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {t?.language && (
                          <Badge variant="secondary" className="text-xs">
                            {t.language}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: details + send */}
      <div className="flex-1 overflow-auto p-6">
        {selectedTemplate ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{getTemplateName(selectedTemplate)}</h2>
                <div className="text-sm text-muted-foreground mt-1">
                  {getTemplateId(selectedTemplate)}
                </div>
              </div>
              <Badge className="bg-green-600 text-white">WHATSAPP</Badge>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Send template</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>To</Label>
                  <Input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="+49123456789"
                  />
                  {selectedConversationId && selectedConversation && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Using current conversation: {selectedConversation.contactName}
                    </div>
                  )}
                </div>
                <div className="flex items-end justify-end">
                  <Button onClick={send} disabled={!to.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Variables</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVariables((prev) => [...prev, { key: '', value: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                {variables.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No variables required.</div>
                ) : (
                  <div className="space-y-2">
                    {variables.map((v, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <Input
                          value={v.key}
                          onChange={(e) =>
                            setVariables((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, key: e.target.value } : x))
                            )
                          }
                          placeholder="key"
                        />
                        <Input
                          value={v.value}
                          onChange={(e) =>
                            setVariables((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, value: e.target.value } : x
                              )
                            )
                          }
                          placeholder="value"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setVariables((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <details className="rounded-lg border bg-muted/40 p-4">
              <summary className="cursor-pointer text-sm font-semibold">Raw template data</summary>
              <pre className="text-xs overflow-auto mt-3">{JSON.stringify(selectedTemplate, null, 2)}</pre>
            </details>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-semibold mb-2">Select a template</h2>
              <p className="text-muted-foreground">Choose a template from the list to send it.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

