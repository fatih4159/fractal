import { twilioClient } from './client.js'

export interface Template {
  sid: string
  friendlyName: string
  language: string
  variables: Record<string, any>
  types: Record<string, any>
  approvalStatus?: string
}

/**
 * List all approved content templates
 * Uses the contentAndApprovals endpoint to get templates with their approval status
 */
export async function listTemplates(): Promise<Template[]> {
  try {
    // Use contentAndApprovals to get templates with approval status
    // This is the correct endpoint for WhatsApp templates
    const contentsWithApprovals = await twilioClient.content.v1.contentAndApprovals.list({ limit: 100 })

    console.log(`[Templates] Fetched ${contentsWithApprovals.length} templates from Twilio Content API`)

    // Map and filter to only include approved templates (or all if approval status is not relevant)
    const templates = contentsWithApprovals
      .map((content) => {
        // The contentAndApprovals endpoint includes approval status
        const approvalStatus = (content as any).approvalRequests?.status || 
                               (content as any).approval_status ||
                               'unknown'
        
        return {
          sid: content.sid,
          friendlyName: content.friendlyName || content.sid,
          language: content.language,
          variables: content.variables || {},
          types: content.types || {},
          approvalStatus,
        }
      })

    // Log template details for debugging
    templates.forEach((t) => {
      console.log(`[Templates] Found: ${t.friendlyName} (${t.sid}) - Status: ${t.approvalStatus}`)
    })

    return templates
  } catch (error: any) {
    // Check if it's an authentication or permission error
    const errorCode = error.code || error.status
    const errorMessage = error.message || 'Unknown error'
    
    console.error('[Templates] Error listing templates from Twilio:', {
      code: errorCode,
      message: errorMessage,
      moreInfo: error.moreInfo || null,
    })

    // If contentAndApprovals fails, try the basic contents endpoint as fallback
    if (errorCode === 20003 || errorCode === 20404 || errorMessage.includes('not found')) {
      console.log('[Templates] Falling back to basic contents.list() endpoint')
      return await listTemplatesBasic()
    }

    throw new Error(`Failed to list templates: ${errorMessage}`)
  }
}

/**
 * Fallback method using basic contents.list() endpoint
 */
async function listTemplatesBasic(): Promise<Template[]> {
  try {
    const contents = await twilioClient.content.v1.contents.list({ limit: 100 })

    console.log(`[Templates] Fetched ${contents.length} templates using basic endpoint`)

    return contents.map((content) => ({
      sid: content.sid,
      friendlyName: content.friendlyName || content.sid,
      language: content.language,
      variables: content.variables || {},
      types: content.types || {},
      approvalStatus: 'unknown',
    }))
  } catch (error: any) {
    console.error('[Templates] Error with basic contents endpoint:', error.message)
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
    // Note: approvalRequests is not directly available on ContentInstance
    // You may need to check the Twilio API documentation for the correct way to access approval status
    return (content as any).approvalRequests?.status || null
  } catch (error: any) {
    console.error('Error fetching template approval status:', error)
    return null
  }
}
