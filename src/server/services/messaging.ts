import { prisma } from '../index.js'
import { sendSMS } from './twilio/sms.js'
import { sendWhatsApp, sendWhatsAppTemplate } from './twilio/whatsapp.js'
import { mapTwilioStatus } from './twilio/client.js'
import { ChannelType, Direction, MessageStatus } from '../../shared/types.js'
import env from '../config/env.js'

export interface SendMessageOptions {
  to: string
  body?: string
  channelType: ChannelType
  mediaUrls?: string[]
  scheduledAt?: Date
  conversationId?: string
  contactId?: string
}

export interface SendTemplateMessageOptions {
  to: string
  contentSid: string
  channelType: ChannelType
  variables?: Record<string, string>
  conversationId?: string
  contactId?: string
}

/**
 * Send a message via the appropriate channel
 */
export async function sendMessage(options: SendMessageOptions) {
  try {
    // Get or create conversation
    const conversation = options.conversationId
      ? await prisma.conversation.findUnique({ where: { id: options.conversationId } })
      : await getOrCreateConversation(options.to, options.channelType, options.contactId)

    if (!conversation) {
      throw new Error('Failed to create or find conversation')
    }

    // Create message record in database first
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: Direction.OUTBOUND,
        channelType: options.channelType,
        to: options.to,
        from: getFromNumber(options.channelType),
        body: options.body,
        mediaUrls: options.mediaUrls || [],
        status: MessageStatus.QUEUED,
        scheduledAt: options.scheduledAt,
      },
    })

    // Create initial status event
    await prisma.statusEvent.create({
      data: {
        messageId: message.id,
        status: MessageStatus.QUEUED,
      },
    })

    // Send via appropriate channel
    let twilioResult: any

    const statusCallback = `${env.APP_URL}/webhooks/twilio/status`

    if (options.channelType === ChannelType.WHATSAPP) {
      twilioResult = await sendWhatsApp({
        to: options.to,
        body: options.body,
        mediaUrls: options.mediaUrls,
        statusCallback,
      })
    } else if (options.channelType === ChannelType.SMS || options.channelType === ChannelType.MMS) {
      twilioResult = await sendSMS({
        to: options.to,
        body: options.body || '',
        mediaUrls: options.mediaUrls,
        scheduledAt: options.scheduledAt,
        statusCallback,
      })
    } else {
      throw new Error(`Unsupported channel type: ${options.channelType}`)
    }

    // Update message with Twilio SID and status
    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: {
        twilioSid: twilioResult.sid,
        status: mapTwilioStatus(twilioResult.status) as MessageStatus,
        sentAt: new Date(),
      },
      include: {
        statusHistory: true,
        conversation: {
          include: {
            contact: {
              include: {
                channels: true,
              },
            },
          },
        },
      },
    })

    // Update conversation last message
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: options.body,
        lastMessageAt: new Date(),
      },
    })

    return updatedMessage
  } catch (error: any) {
    console.error('Error sending message:', error)
    throw new Error(`Failed to send message: ${error.message}`)
  }
}

/**
 * Send a template message (WhatsApp only)
 */
export async function sendTemplateMessage(options: SendTemplateMessageOptions) {
  try {
    if (options.channelType !== ChannelType.WHATSAPP) {
      throw new Error('Template messages are only supported for WhatsApp')
    }

    // Get or create conversation
    const conversation = options.conversationId
      ? await prisma.conversation.findUnique({ where: { id: options.conversationId } })
      : await getOrCreateConversation(options.to, options.channelType, options.contactId)

    if (!conversation) {
      throw new Error('Failed to create or find conversation')
    }

    // Create message record
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: Direction.OUTBOUND,
        channelType: options.channelType,
        to: options.to,
        from: getFromNumber(options.channelType),
        body: `[Template: ${options.contentSid}]`,
        mediaUrls: [],
        status: MessageStatus.QUEUED,
        metadata: {
          contentSid: options.contentSid,
          variables: options.variables,
        },
      },
    })

    // Send template
    const statusCallback = `${env.APP_URL}/webhooks/twilio/status`
    const twilioResult = await sendWhatsAppTemplate({
      to: options.to,
      contentSid: options.contentSid,
      contentVariables: options.variables,
      statusCallback,
    })

    // Update message with Twilio SID
    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: {
        twilioSid: twilioResult.sid,
        status: mapTwilioStatus(twilioResult.status) as MessageStatus,
        sentAt: new Date(),
      },
      include: {
        statusHistory: true,
        conversation: {
          include: {
            contact: {
              include: {
                channels: true,
              },
            },
          },
        },
      },
    })

    return updatedMessage
  } catch (error: any) {
    console.error('Error sending template message:', error)
    throw new Error(`Failed to send template message: ${error.message}`)
  }
}

/**
 * Get or create a conversation for a phone number and channel type
 */
async function getOrCreateConversation(
  phoneNumber: string,
  channelType: ChannelType,
  contactId?: string
) {
  // Find or create contact
  let contact

  if (contactId) {
    contact = await prisma.contact.findUnique({ where: { id: contactId } })
  } else {
    // Try to find contact by phone number
    const channel = await prisma.channel.findUnique({
      where: {
        type_identifier: {
          type: channelType,
          identifier: phoneNumber,
        },
      },
      include: { contact: true },
    })

    contact = channel?.contact
  }

  // Create contact if doesn't exist
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        name: phoneNumber, // Use phone number as temporary name
        channels: {
          create: {
            type: channelType,
            identifier: phoneNumber,
            isPrimary: true,
          },
        },
      },
    })
  }

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      contactId: contact.id,
      channelType,
    },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        contactId: contact.id,
        channelType,
      },
    })
  }

  return conversation
}

/**
 * Get the from number for a channel type
 */
function getFromNumber(channelType: ChannelType): string {
  if (channelType === ChannelType.WHATSAPP) {
    return env.TWILIO_WHATSAPP_NUMBER || '+14155238886'
  }
  return env.TWILIO_PHONE_NUMBER || env.TWILIO_MESSAGING_SERVICE_SID || ''
}
