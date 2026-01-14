import { useEffect, useCallback } from 'react'
import { useContactsStore } from '../store/contacts'
import { api } from '../lib/api'
import { toast } from './use-toast'
import type { ApiResponse, Contact as ServerContact } from '../../shared/types'

export function useContacts() {
  const contacts = useContactsStore((state) => state.contacts)
  const selectedContactId = useContactsStore((state) => state.selectedContactId)
  const isLoading = useContactsStore((state) => state.isLoading)
  const error = useContactsStore((state) => state.error)

  const setContacts = useContactsStore((state) => state.setContacts)
  const addContact = useContactsStore((state) => state.addContact)
  const updateContact = useContactsStore((state) => state.updateContact)
  const deleteContact = useContactsStore((state) => state.deleteContact)
  const selectContact = useContactsStore((state) => state.selectContact)
  const getContactById = useContactsStore((state) => state.getContactById)
  const setLoading = useContactsStore((state) => state.setLoading)
  const setError = useContactsStore((state) => state.setError)
  const clearError = useContactsStore((state) => state.clearError)

  // Fetch all contacts
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      clearError()

      const response = await api.get('/api/contacts')
      const payload = (await response.json()) as ApiResponse<ServerContact[]>

      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to fetch contacts')
      }

      // Transform date strings to Date objects
      const serverContacts = payload?.data ?? []
      const transformedContacts = serverContacts.map((contact: any) => ({
        ...contact,
        createdAt: new Date(contact.createdAt),
        updatedAt: new Date(contact.updatedAt),
      }))

      // Sort alphabetically by name
      transformedContacts.sort((a: any, b: any) =>
        a.name.localeCompare(b.name)
      )

      setContacts(transformedContacts)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch contacts'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [setLoading, setContacts, setError, clearError])

  // Create a new contact
  const createContact = useCallback(
    async (data: {
      name: string
      email?: string
      channels: Array<{
        type: string
        identifier: string
        isPrimary?: boolean
      }>
      metadata?: Record<string, any>
    }) => {
      try {
        setLoading(true)
        clearError()

        const response = await api.post('/api/contacts', data)
        const result = (await response.json()) as ApiResponse<ServerContact>

        if (!response.ok) {
          throw new Error(result?.error?.message || 'Failed to create contact')
        }

        const contact = {
          ...result.data,
          createdAt: new Date((result.data as any).createdAt),
          updatedAt: new Date((result.data as any).updatedAt),
        }

        addContact(contact)

        toast({
          title: 'Contact created',
          description: `${contact.name} has been added to your contacts`,
        })

        return contact
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create contact'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        return null
      } finally {
        setLoading(false)
      }
    },
    [setLoading, addContact, setError, clearError]
  )

  // Update a contact
  const editContact = useCallback(
    async (
      contactId: string,
      data: {
        name?: string
        email?: string
        metadata?: Record<string, any>
      }
    ) => {
      try {
        setLoading(true)
        clearError()

        const response = await api.put(`/api/contacts/${contactId}`, data)
        const result = (await response.json()) as ApiResponse<ServerContact>

        if (!response.ok) {
          throw new Error(result?.error?.message || 'Failed to update contact')
        }

        const contact = {
          ...result.data,
          createdAt: new Date((result.data as any).createdAt),
          updatedAt: new Date((result.data as any).updatedAt),
        }

        updateContact(contactId, contact)

        toast({
          title: 'Contact updated',
          description: 'Contact information has been updated',
        })

        return contact
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update contact'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        return null
      } finally {
        setLoading(false)
      }
    },
    [setLoading, updateContact, setError, clearError]
  )

  // Delete a contact
  const removeContact = useCallback(
    async (contactId: string) => {
      try {
        const response = await api.delete(`/api/contacts/${contactId}`)

        if (!response.ok) {
          const payload = (await response.json()) as ApiResponse<null>
          throw new Error(payload?.error?.message || 'Failed to delete contact')
        }

        deleteContact(contactId)

        toast({
          title: 'Contact deleted',
          description: 'The contact has been deleted',
        })
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete contact'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    },
    [deleteContact]
  )

  // Get selected contact
  const selectedContact = selectedContactId
    ? getContactById(selectedContactId)
    : undefined

  // Fetch contacts on mount
  useEffect(() => {
    // Run once on mount (prevents accidental re-fetch loops if deps are unstable)
    fetchContacts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    contacts,
    selectedContact,
    selectedContactId,
    isLoading,
    error,
    fetchContacts,
    createContact,
    editContact,
    selectContact,
    removeContact,
  }
}
