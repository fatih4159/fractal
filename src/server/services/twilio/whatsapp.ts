import { twilioClient, formatWhatsAppNumber } from './client.js'
import env from '../../config/env.js'

export interface SendWhatsAppOptions {
  to: string
  body?: string
  mediaUrls?: string[]
  from?: string
  statusCallback?: string
}

export interface SendWhatsAppTemplateOptions {
  to: string
  contentSid: string
  contentVariables?: Record<string, string>
  from?: string
  statusCallback?: string
}

export interface WhatsAppResult {
  sid: string
  status: string
  to: string
  from: string
  body?: string
  dateCreated: Date
  errorCode?: string
  errorMessage?: string
}

/**
 * Send a WhatsApp message (Session Message - within 24h window)
 */
export async function sendWhatsApp(options: SendWhatsAppOptions): Promise<WhatsAppResult> {
  try {
    const to = formatWhatsAppNumber(options.to)
    const from = options.from
      ? formatWhatsAppNumber(options.from)
      : formatWhatsAppNumber(env.TWILIO_WHATSAPP_NUMBER || '+14155238886')

    const messageOptions: any = {
      to,
      from,
    }

    // Add body if provided
    if (options.body) {
      messageOptions.body = options.body
    }

    // Add media URLs
    if (options.mediaUrls && options.mediaUrls.length > 0) {
      messageOptions.mediaUrl = options.mediaUrls
    }

    // Add status callback if provided
    if (options.statusCallback) {
      messageOptions.statusCallback = options.statusCallback
    }

    const message = await twilioClient.messages.create(messageOptions)

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      body: message.body || undefined,
      dateCreated: message.dateCreated,
      errorCode: message.errorCode?.toString(),
      errorMessage: message.errorMessage || undefined,
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error)
    throw new Error(`Failed to send WhatsApp message: ${error.message}`)
  }
}

/**
 * Send a WhatsApp Template Message (for initiating conversation outside 24h window)
 */
export async function sendWhatsAppTemplate(
  options: SendWhatsAppTemplateOptions
): Promise<WhatsAppResult> {
  try {
    const to = formatWhatsAppNumber(options.to)
    const from = options.from
      ? formatWhatsAppNumber(options.from)
      : formatWhatsAppNumber(env.TWILIO_WHATSAPP_NUMBER || '+14155238886')

    const messageOptions: any = {
      to,
      from,
      contentSid: options.contentSid,
    }

    // Add template variables if provided
    if (options.contentVariables) {
      messageOptions.contentVariables = JSON.stringify(options.contentVariables)
    }

    // Add status callback if provided
    if (options.statusCallback) {
      messageOptions.statusCallback = options.statusCallback
    }

    const message = await twilioClient.messages.create(messageOptions)

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      dateCreated: message.dateCreated,
      errorCode: message.errorCode?.toString(),
      errorMessage: message.errorMessage || undefined,
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp template:', error)
    throw new Error(`Failed to send WhatsApp template: ${error.message}`)
  }
}

/**
 * Get WhatsApp message details
 */
export async function getWhatsAppDetails(messageSid: string) {
  try {
    const message = await twilioClient.messages(messageSid).fetch()

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      body: message.body,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent,
      dateUpdated: message.dateUpdated,
      price: message.price,
      priceUnit: message.priceUnit,
      errorCode: message.errorCode?.toString(),
      errorMessage: message.errorMessage,
      numSegments: message.numSegments,
      mediaUrls: message.numMedia > 0 ? await getMediaUrls(messageSid) : [],
    }
  } catch (error: any) {
    console.error('Error fetching WhatsApp details:', error)
    throw new Error(`Failed to fetch WhatsApp details: ${error.message}`)
  }
}

/**
 * Get media URLs from a WhatsApp message
 */
async function getMediaUrls(messageSid: string): Promise<string[]> {
  try {
    const mediaList = await twilioClient.messages(messageSid).media.list()
    return mediaList.map((media) => `https://api.twilio.com${media.uri.replace('.json', '')}`)
  } catch (error) {
    console.error('Error fetching media URLs:', error)
    return []
  }
}
