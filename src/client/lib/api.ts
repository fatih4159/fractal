import type { ApiResponse, Contact, Conversation, Message, SendMessageRequest, SendTemplateMessageRequest, ChannelType } from '../../shared/types'

const API_BASE = '/api'

async function fetcher<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.error?.message || error.message || 'Request failed')
  }

  return response.json()
}

// Contacts API
export const contactsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.search) query.set('search', params.search)

    return fetcher<Contact[]>(`${API_BASE}/contacts?${query}`)
  },

  get: async (id: string) => {
    return fetcher<Contact>(`${API_BASE}/contacts/${id}`)
  },

  create: async (data: { name: string; email?: string; channels?: any[] }) => {
    return fetcher<Contact>(`${API_BASE}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: { name?: string; email?: string }) => {
    return fetcher<Contact>(`${API_BASE}/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetcher<null>(`${API_BASE}/contacts/${id}`, {
      method: 'DELETE',
    })
  },

  addChannel: async (id: string, data: { type: string; identifier: string }) => {
    return fetcher<any>(`${API_BASE}/contacts/${id}/channels`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Conversations API
export const conversationsApi = {
  list: async (params?: { page?: number; limit?: number; archived?: boolean; channelType?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.archived !== undefined) query.set('archived', params.archived.toString())
    if (params?.channelType) query.set('channelType', params.channelType)

    return fetcher<Conversation[]>(`${API_BASE}/conversations?${query}`)
  },

  get: async (id: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())

    return fetcher<Conversation & { messages: Message[] }>(`${API_BASE}/conversations/${id}?${query}`)
  },

  create: async (data: { contactId: string; channelType: string }) => {
    return fetcher<Conversation>(`${API_BASE}/conversations`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  archive: async (id: string, archive: boolean = true) => {
    return fetcher<Conversation>(`${API_BASE}/conversations/${id}/archive`, {
      method: 'PATCH',
      body: JSON.stringify({ archive }),
    })
  },

  markAsRead: async (id: string) => {
    return fetcher<Conversation>(`${API_BASE}/conversations/${id}/read`, {
      method: 'PATCH',
    })
  },
}

// Messages API
export const messagesApi = {
  list: async (params?: { page?: number; limit?: number; conversationId?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.conversationId) query.set('conversationId', params.conversationId)

    return fetcher<Message[]>(`${API_BASE}/messages?${query}`)
  },

  get: async (id: string) => {
    return fetcher<Message>(`${API_BASE}/messages/${id}`)
  },

  send: async (
    data: SendMessageRequest & {
      conversationId?: string
      contactId?: string
    }
  ) => {
    return fetcher<Message>(`${API_BASE}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  sendTemplate: async (
    data: Omit<SendTemplateMessageRequest, 'templateSid'> & {
      contentSid: string
      conversationId?: string
      contactId?: string
      channelType: ChannelType
    }
  ) => {
    return fetcher<Message>(`${API_BASE}/messages/template`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  sendBulk: async (data: { recipients: string[]; body?: string; channelType: string; mediaUrls?: string[] }) => {
    return fetcher<any>(`${API_BASE}/messages/bulk`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  cancel: async (id: string) => {
    return fetcher<null>(`${API_BASE}/messages/${id}`, {
      method: 'DELETE',
    })
  },
}

// Templates API
export const templatesApi = {
  list: async () => {
    return fetcher<any[]>(`${API_BASE}/templates`)
  },

  get: async (sid: string) => {
    return fetcher<any>(`${API_BASE}/templates/${sid}`)
  },
}

// Simple fetch wrapper for hooks
export const api = {
  get: (url: string) => fetch(url),
  post: (url: string, body?: any) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: (url: string, body?: any) =>
    fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: (url: string, body?: any) =>
    fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (url: string) => fetch(url, { method: 'DELETE' }),
}

export default {
  contacts: contactsApi,
  conversations: conversationsApi,
  messages: messagesApi,
  templates: templatesApi,
}
