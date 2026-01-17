import { Router } from 'express'
import { prisma } from '../../index.js'
import { z } from 'zod'
import { sendMessage, sendTemplateMessage } from '../../services/messaging.js'
import { ChannelType } from '../../../shared/types.js'
import { messagingRateLimiter } from '../../middleware/rateLimiter.js'

const router = Router()

// Validation schemas
const sendMessageSchema = z.object({
  to: z.string().min(1),
  body: z.string().optional(),
  channelType: z.nativeEnum(ChannelType),
  mediaUrls: z.array(z.string().url()).optional(),
  scheduledAt: z.string().datetime().optional(),
  conversationId: z.string().optional(),
  contactId: z.string().optional(),
})

const sendTemplateSchema = z.object({
  to: z.string().min(1),
  contentSid: z.string().min(1),
  channelType: z.nativeEnum(ChannelType),
  variables: z.record(z.string()).optional(),
  conversationId: z.string().optional(),
  contactId: z.string().optional(),
})

const bulkSendSchema = z.object({
  recipients: z.array(z.string().min(1)),
  body: z.string().optional(),
  channelType: z.nativeEnum(ChannelType),
  mediaUrls: z.array(z.string().url()).optional(),
})

/**
 * GET /api/messages - List messages with pagination and filters
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const conversationId = req.query.conversationId as string
    const status = req.query.status as string
    const direction = req.query.direction as string

    const where: any = {}

    if (conversationId) {
      where.conversationId = conversationId
    }

    if (status) {
      where.status = status
    }

    if (direction) {
      where.direction = direction
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
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
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.message.count({ where }),
    ])

    res.json({
      success: true,
      data: messages,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error listing messages:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * GET /api/messages/:id - Get a single message with full status history
 */
router.get('/:id', async (req, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
      include: {
        statusHistory: {
          orderBy: { timestamp: 'asc' },
        },
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

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Message not found',
        },
      })
    }

    res.json({
      success: true,
      data: message,
    })
  } catch (error) {
    console.error('Error fetching message:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * POST /api/messages - Send a message
 */
router.post('/', messagingRateLimiter, async (req, res) => {
  try {
    const body = sendMessageSchema.parse(req.body)

    const message = await sendMessage({
      to: body.to,
      body: body.body,
      channelType: body.channelType,
      mediaUrls: body.mediaUrls,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      conversationId: body.conversationId,
      contactId: body.contactId,
    })

    res.status(201).json({
      success: true,
      data: message,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          details: error.errors,
        },
      })
    }

    console.error('Error sending message:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * POST /api/messages/template - Send a template message
 */
router.post('/template', messagingRateLimiter, async (req, res) => {
  try {
    const body = sendTemplateSchema.parse(req.body)

    const message = await sendTemplateMessage({
      to: body.to,
      contentSid: body.contentSid,
      channelType: body.channelType,
      variables: body.variables,
      conversationId: body.conversationId,
      contactId: body.contactId,
    })

    res.status(201).json({
      success: true,
      data: message,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          details: error.errors,
        },
      })
    }

    console.error('Error sending template message:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * POST /api/messages/bulk - Send messages to multiple recipients
 */
router.post('/bulk', messagingRateLimiter, async (req, res) => {
  try {
    const body = bulkSendSchema.parse(req.body)

    const results = await Promise.allSettled(
      body.recipients.map((recipient) =>
        sendMessage({
          to: recipient,
          body: body.body,
          channelType: body.channelType,
          mediaUrls: body.mediaUrls,
        })
      )
    )

    const successful = results.filter((r) => r.status === 'fulfilled')
    const failed = results.filter((r) => r.status === 'rejected')

    res.json({
      success: true,
      data: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        results: results.map((r, index) => ({
          recipient: body.recipients[index],
          status: r.status,
          data: r.status === 'fulfilled' ? r.value : undefined,
          error: r.status === 'rejected' ? r.reason.message : undefined,
        })),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          details: error.errors,
        },
      })
    }

    console.error('Error sending bulk messages:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * DELETE /api/messages/:id - Cancel a scheduled message
 */
router.delete('/:id', async (req, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
    })

    if (!message) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Message not found',
        },
      })
    }

    if (message.status !== 'QUEUED') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Only queued messages can be canceled',
        },
      })
    }

    // TODO: Cancel via Twilio if needed
    // if (message.twilioSid) {
    //   await cancelScheduledSMS(message.twilioSid)
    // }

    await prisma.message.update({
      where: { id: req.params.id },
      data: { status: 'CANCELED' },
    })

    res.json({
      success: true,
      data: null,
    })
  } catch (error) {
    console.error('Error canceling message:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

export default router
