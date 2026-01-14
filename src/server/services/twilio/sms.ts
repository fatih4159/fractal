import { twilioClient, formatPhoneNumber } from './client.js'
import env from '../../config/env.js'

export interface SendSMSOptions {
  to: string
  body: string
  mediaUrls?: string[]
  from?: string
  scheduledAt?: Date
  statusCallback?: string
}

export interface SMSResult {
  sid: string
  status: string
  to: string
  from: string
  body: string
  dateCreated: Date
  errorCode?: string
  errorMessage?: string
}

/**
 * Send an SMS or MMS message via Twilio
 */
export async function sendSMS(options: SendSMSOptions): Promise<SMSResult> {
  try {
    const to = formatPhoneNumber(options.to)
    const from = options.from
      ? formatPhoneNumber(options.from)
      : env.TWILIO_PHONE_NUMBER || env.TWILIO_MESSAGING_SERVICE_SID

    if (!from) {
      throw new Error('No Twilio phone number or messaging service configured')
    }

    const messageOptions: any = {
      to,
      body: options.body,
    }

    // Use Messaging Service if SID is provided, otherwise use phone number
    if (from.startsWith('MG')) {
      messageOptions.messagingServiceSid = from
    } else {
      messageOptions.from = from
    }

    // Add media URLs for MMS
    if (options.mediaUrls && options.mediaUrls.length > 0) {
      messageOptions.mediaUrl = options.mediaUrls
    }

    // Add status callback if provided
    if (options.statusCallback) {
      messageOptions.statusCallback = options.statusCallback
    }

    // Send scheduled message if date is provided
    if (options.scheduledAt) {
      messageOptions.scheduleType = 'fixed'
      messageOptions.sendAt = options.scheduledAt.toISOString()
    }

    const message = await twilioClient.messages.create(messageOptions)

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      body: message.body || '',
      dateCreated: message.dateCreated,
      errorCode: message.errorCode?.toString(),
      errorMessage: message.errorMessage || undefined,
    }
  } catch (error: any) {
    console.error('Error sending SMS:', error)
    throw new Error(`Failed to send SMS: ${error.message}`)
  }
}

/**
 * Get SMS message details
 */
export async function getSMSDetails(messageSid: string) {
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
      mediaUrls: parseInt(message.numMedia) > 0 ? await getMediaUrls(messageSid) : [],
    }
  } catch (error: any) {
    console.error('Error fetching SMS details:', error)
    throw new Error(`Failed to fetch SMS details: ${error.message}`)
  }
}

/**
 * Get media URLs from a message
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

/**
 * Cancel a scheduled message
 */
export async function cancelScheduledSMS(messageSid: string): Promise<void> {
  try {
    await twilioClient.messages(messageSid).update({ status: 'canceled' })
  } catch (error: any) {
    console.error('Error canceling scheduled SMS:', error)
    throw new Error(`Failed to cancel scheduled SMS: ${error.message}`)
  }
}
