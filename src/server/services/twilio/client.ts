import twilio from 'twilio'
import env from '../../config/env.js'

// Initialize Twilio client
export const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)

// Twilio status to our MessageStatus mapping
export function mapTwilioStatus(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    queued: 'QUEUED',
    sending: 'SENDING',
    sent: 'SENT',
    delivered: 'DELIVERED',
    undelivered: 'UNDELIVERED',
    failed: 'FAILED',
    read: 'READ',
    canceled: 'CANCELED',
  }

  return statusMap[twilioStatus.toLowerCase()] || 'QUEUED'
}

// Helper to format phone numbers
export function formatPhoneNumber(number: string): string {
  // Remove spaces, dashes, and parentheses
  let cleaned = number.replace(/[\s\-()]/g, '')

  // Add + if not present
  if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`
  }

  return cleaned
}

// Helper to format WhatsApp number
export function formatWhatsAppNumber(number: string): string {
  const cleaned = formatPhoneNumber(number)
  return `whatsapp:${cleaned}`
}

// Validate Twilio webhook signature
export function validateTwilioWebhook(
  signature: string,
  url: string,
  params: Record<string, any>
): boolean {
  return twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, params)
}

export default twilioClient
