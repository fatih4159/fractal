import { Router } from 'express'
import { prisma } from '../../index.js'
import { io } from '../../index.js'
import { twilioWebhookValidator } from '../../middleware/twilioValidator.js'
import { mapTwilioStatus } from '../../services/twilio/client.js'
import { ChannelType, Direction, MessageStatus } from '../../../shared/types.js'
import { emitToConversation } from '../../socket/index.js'

const router = Router()

/**
 * Webhook endpoint for incoming messages from Twilio
 */
router.post('/incoming', twilioWebhookValidator, async (req, res) => {
  try {
    const {
      MessageSid,
      From,
      To,
      Body,
      NumMedia,
      MediaUrl0,
      MediaUrl1,
      MediaUrl2,
      MediaUrl3,
      MediaUrl4,
      MediaUrl5,
      MediaUrl6,
      MediaUrl7,
      MediaUrl8,
      MediaUrl9,
    } = req.body

    console.log('📨 Incoming message webhook:', MessageSid)

    // Determine channel type
    const channelType = From.startsWith('whatsapp:')
      ? ChannelType.WHATSAPP
      : NumMedia && parseInt(NumMedia) > 0
      ? ChannelType.MMS
      : ChannelType.SMS

    // Extract phone number (remove 'whatsapp:' prefix if present)
    const fromNumber = From.replace('whatsapp:', '')
    const toNumber = To.replace('whatsapp:', '')

    // Collect media URLs
    const mediaUrls: string[] = []
    if (NumMedia && parseInt(NumMedia) > 0) {
      for (let i = 0; i < Math.min(parseInt(NumMedia), 10); i++) {
        const mediaUrl = req.body[`MediaUrl${i}`]
        if (mediaUrl) mediaUrls.push(mediaUrl)
      }
    }

    // Find or create contact and conversation
    let channel = await prisma.channel.findUnique({
      where: {
        type_identifier: {
          type: channelType,
          identifier: fromNumber,
        },
      },
      include: { contact: true },
    })

    let contact

    if (!channel) {
      // Create new contact
      contact = await prisma.contact.create({
        data: {
          name: fromNumber,
          channels: {
            create: {
              type: channelType,
              identifier: fromNumber,
              isPrimary: true,
            },
          },
        },
      })
    } else {
      contact = channel.contact
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

    // Create message
    const message = await prisma.message.create({
      data: {
        twilioSid: MessageSid,
        conversationId: conversation.id,
        direction: Direction.INBOUND,
        channelType,
        from: fromNumber,
        to: toNumber,
        body: Body || '',
        mediaUrls,
        status: MessageStatus.DELIVERED,
      },
      include: {
        conversation: {
          include: {
            contact: {
              include: {
                channels: true,
              },
            },
          },
        },
        statusHistory: true,
      },
    })

    // Create status event
    await prisma.statusEvent.create({
      data: {
        messageId: message.id,
        status: MessageStatus.DELIVERED,
        rawPayload: req.body,
      },
    })

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: Body || '[Media]',
        lastMessageAt: new Date(),
        unreadCount: {
          increment: 1,
        },
      },
    })

    // Emit socket event to all connected clients in conversation
    emitToConversation(io, conversation.id, 'message:new', message)

    // Also emit to general message feed
    io.of('/messaging').emit('message:new', message)

    // Send TwiML response
    res.type('text/xml')
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
  } catch (error) {
    console.error('Error handling incoming message:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * Webhook endpoint for message status updates from Twilio
 */
router.post('/status', twilioWebhookValidator, async (req, res) => {
  try {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body

    console.log(`📊 Status update for ${MessageSid}: ${MessageStatus}`)

    // Find message by Twilio SID
    const message = await prisma.message.findUnique({
      where: { twilioSid: MessageSid },
    })

    if (!message) {
      console.warn(`Message not found for SID: ${MessageSid}`)
      return res.status(200).send('OK')
    }

    // Map Twilio status to our MessageStatus
    const status = mapTwilioStatus(MessageStatus) as MessageStatus

    // Create status event
    await prisma.statusEvent.create({
      data: {
        messageId: message.id,
        status,
        rawPayload: req.body,
      },
    })

    // Update message
    const updateData: any = {
      status,
    }

    if (ErrorCode) {
      updateData.errorCode = ErrorCode
      updateData.errorMessage = ErrorMessage
    }

    if (MessageStatus === 'sent') {
      updateData.sentAt = new Date()
    } else if (MessageStatus === 'delivered') {
      updateData.deliveredAt = new Date()
    } else if (MessageStatus === 'read') {
      updateData.readAt = new Date()
    }

    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: updateData,
      include: {
        statusHistory: true,
      },
    })

    // Emit socket event
    emitToConversation(io, message.conversationId, 'message:status', {
      messageId: message.id,
      status,
      timestamp: new Date().toISOString(),
    })

    // TODO: Dispatch to external webhooks
    // await dispatchWebhook('message.status', { message: updatedMessage, status })

    res.status(200).send('OK')
  } catch (error) {
    console.error('Error handling status update:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

export default router
