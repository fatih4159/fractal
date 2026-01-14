import { Router } from 'express'
import { prisma } from '../../index.js'
import { z } from 'zod'
import { ChannelType } from '../../../shared/types.js'

const router = Router()

// Validation schemas
const createContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  channels: z
    .array(
      z.object({
        type: z.nativeEnum(ChannelType),
        identifier: z.string().min(1),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
  metadata: z.record(z.any()).optional(),
})

const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  metadata: z.record(z.any()).optional(),
})

const addChannelSchema = z.object({
  type: z.nativeEnum(ChannelType),
  identifier: z.string().min(1),
  isPrimary: z.boolean().optional(),
})

/**
 * GET /api/contacts - List all contacts with pagination
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const search = req.query.search as string

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          channels: true,
          _count: {
            select: { conversations: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contact.count({ where }),
    ])

    res.json({
      success: true,
      data: contacts,
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
    console.error('Error listing contacts:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * GET /api/contacts/:id - Get a single contact
 */
router.get('/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: {
        channels: true,
        conversations: {
          include: {
            _count: {
              select: { messages: true },
            },
          },
          orderBy: { lastMessageAt: 'desc' },
        },
      },
    })

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Contact not found',
        },
      })
    }

    res.json({
      success: true,
      data: contact,
    })
  } catch (error) {
    console.error('Error fetching contact:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * POST /api/contacts - Create a new contact
 */
router.post('/', async (req, res) => {
  try {
    const body = createContactSchema.parse(req.body)

    const contact = await prisma.contact.create({
      data: {
        name: body.name,
        email: body.email,
        metadata: body.metadata,
        channels: body.channels
          ? {
              create: body.channels.map((channel, index) => ({
                type: channel.type,
                identifier: channel.identifier,
                isPrimary: channel.isPrimary ?? index === 0,
              })),
            }
          : undefined,
      },
      include: {
        channels: true,
      },
    })

    res.status(201).json({
      success: true,
      data: contact,
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

    console.error('Error creating contact:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * PUT /api/contacts/:id - Update a contact
 */
router.put('/:id', async (req, res) => {
  try {
    const body = updateContactSchema.parse(req.body)

    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: body,
      include: {
        channels: true,
      },
    })

    res.json({
      success: true,
      data: contact,
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

    console.error('Error updating contact:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * DELETE /api/contacts/:id - Delete a contact
 */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.contact.delete({
      where: { id: req.params.id },
    })

    res.json({
      success: true,
      data: null,
    })
  } catch (error) {
    console.error('Error deleting contact:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * POST /api/contacts/:id/channels - Add a channel to a contact
 */
router.post('/:id/channels', async (req, res) => {
  try {
    const body = addChannelSchema.parse(req.body)

    const channel = await prisma.channel.create({
      data: {
        contactId: req.params.id,
        type: body.type,
        identifier: body.identifier,
        isPrimary: body.isPrimary ?? false,
      },
    })

    res.status(201).json({
      success: true,
      data: channel,
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

    console.error('Error adding channel:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

export default router
