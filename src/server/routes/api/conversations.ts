import { Router } from 'express'
import { prisma } from '../../index.js'
import { z } from 'zod'
import { ChannelType } from '../../../shared/types.js'
import { syncConversationFromTwilio } from '../../services/twilio/history.js'

const router = Router()

// Validation schema
const createConversationSchema = z.object({
  contactId: z.string().min(1),
  channelType: z.nativeEnum(ChannelType),
})

/**
 * GET /api/conversations - List all conversations
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const archived = req.query.archived === 'true'
    const channelType = req.query.channelType as ChannelType

    const where: any = {
      isArchived: archived,
    }

    if (channelType) {
      where.channelType = channelType
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          contact: {
            include: {
              channels: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
      }),
      prisma.conversation.count({ where }),
    ])

    res.json({
      success: true,
      data: conversations,
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
    console.error('Error listing conversations:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * GET /api/conversations/:id - Get a single conversation with messages
 */
router.get('/:id', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50

    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        contact: {
          include: {
            channels: true,
          },
        },
      },
    })

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Conversation not found',
        },
      })
    }

    // Get messages separately for pagination
    const [messages, totalMessages] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: req.params.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.message.count({ where: { conversationId: req.params.id } }),
    ])

    res.json({
      success: true,
      data: {
        ...conversation,
        messages: messages.reverse(), // Reverse to show oldest first
      },
      meta: {
        pagination: {
          page,
          limit,
          total: totalMessages,
          totalPages: Math.ceil(totalMessages / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * POST /api/conversations - Create a new conversation
 */
router.post('/', async (req, res) => {
  try {
    const body = createConversationSchema.parse(req.body)

    // Check if conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        contactId: body.contactId,
        channelType: body.channelType,
      },
    })

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Conversation already exists',
          code: 'CONVERSATION_EXISTS',
          data: existing,
        },
      })
    }

    const conversation = await prisma.conversation.create({
      data: {
        contactId: body.contactId,
        channelType: body.channelType,
      },
      include: {
        contact: {
          include: {
            channels: true,
          },
        },
      },
    })

    res.status(201).json({
      success: true,
      data: conversation,
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

    console.error('Error creating conversation:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * PATCH /api/conversations/:id/archive - Archive/unarchive a conversation
 */
router.patch('/:id/archive', async (req, res) => {
  try {
    const { archive } = req.body

    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: {
        isArchived: archive ?? true,
      },
      include: {
        contact: {
          include: {
            channels: true,
          },
        },
      },
    })

    res.json({
      success: true,
      data: conversation,
    })
  } catch (error) {
    console.error('Error archiving conversation:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * PATCH /api/conversations/:id/read - Mark conversation as read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: {
        unreadCount: 0,
      },
    })

    res.json({
      success: true,
      data: conversation,
    })
  } catch (error) {
    console.error('Error marking conversation as read:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * POST /api/conversations/:id/sync - Backfill/refresh messages from Twilio
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined
    const includeMedia = req.query.includeMedia === 'false' ? false : true

    const result = await syncConversationFromTwilio(req.params.id, {
      limit: Number.isFinite(limit as any) ? limit : undefined,
      includeMedia,
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Error syncing conversation from Twilio:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

export default router
