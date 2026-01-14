import { twilioClient } from './client.js'

export interface Template {
  sid: string
  friendlyName: string
  language: string
  variables: Record<string, string>
  types: {
    [key: string]: {
      body: string
      actions?: any[]
    }
  }
}

/**
 * List all approved content templates
 */
export async function listTemplates(): Promise<Template[]> {
  try {
    const contents = await twilioClient.content.v1.contents.list({ pageSize: 100 })

    return contents
      .filter((content) => content.approvalRequests?.status === 'approved')
      .map((content) => ({
        sid: content.sid,
        friendlyName: content.friendlyName || content.sid,
        language: content.language,
        variables: content.variables || {},
        types: content.types || {},
      }))
  } catch (error: any) {
    console.error('Error listing templates:', error)
    throw new Error(`Failed to list templates: ${error.message}`)
  }
}

/**
 * Get a specific template by SID
 */
export async function getTemplate(contentSid: string): Promise<Template | null> {
  try {
    const content = await twilioClient.content.v1.contents(contentSid).fetch()

    if (!content) {
      return null
    }

    return {
      sid: content.sid,
      friendlyName: content.friendlyName || content.sid,
      language: content.language,
      variables: content.variables || {},
      types: content.types || {},
    }
  } catch (error: any) {
    console.error('Error fetching template:', error)
    return null
  }
}

/**
 * Create a new content template
 * Note: Templates need to be approved by WhatsApp before use
 */
export async function createTemplate(options: {
  friendlyName: string
  language: string
  variables?: Record<string, string>
  types: {
    [key: string]: {
      body: string
      actions?: any[]
    }
  }
}): Promise<Template> {
  try {
    const content = await twilioClient.content.v1.contents.create({
      friendlyName: options.friendlyName,
      language: options.language,
      variables: options.variables,
      types: options.types,
    })

    return {
      sid: content.sid,
      friendlyName: content.friendlyName || content.sid,
      language: content.language,
      variables: content.variables || {},
      types: content.types || {},
    }
  } catch (error: any) {
    console.error('Error creating template:', error)
    throw new Error(`Failed to create template: ${error.message}`)
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(contentSid: string): Promise<void> {
  try {
    await twilioClient.content.v1.contents(contentSid).remove()
  } catch (error: any) {
    console.error('Error deleting template:', error)
    throw new Error(`Failed to delete template: ${error.message}`)
  }
}

/**
 * Get template approval status
 */
export async function getTemplateApprovalStatus(
  contentSid: string
): Promise<string | null> {
  try {
    const content = await twilioClient.content.v1.contents(contentSid).fetch()
    return content.approvalRequests?.status || null
  } catch (error: any) {
    console.error('Error fetching template approval status:', error)
    return null
  }
}
