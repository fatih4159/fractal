import { Router } from 'express'
import { prisma } from '../../index.js'
import { z } from 'zod'
import crypto from 'crypto'

const router = Router()

// Validation schema
const registerWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  description: z.string().optional(),
})

/**
 * GET /api/webhooks - List all registered webhooks
 */
router.get('/', async (req, res) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      success: true,
      data: webhooks,
    })
  } catch (error) {
    console.error('Error listing webhooks:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * GET /api/webhooks/:id - Get a specific webhook
 */
router.get('/:id', async (req, res) => {
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: req.params.id },
    })

    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Webhook not found',
        },
      })
    }

    res.json({
      success: true,
      data: webhook,
    })
  } catch (error) {
    console.error('Error fetching webhook:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * POST /api/webhooks - Register a new webhook
 */
router.post('/', async (req, res) => {
  try {
    const body = registerWebhookSchema.parse(req.body)

    // Generate a secret for signing webhook payloads
    const secret = crypto.randomBytes(32).toString('hex')

    const webhook = await prisma.webhook.create({
      data: {
        url: body.url,
        events: body.events,
        secret,
        description: body.description,
      },
    })

    res.status(201).json({
      success: true,
      data: webhook,
      meta: {
        message: 'Webhook registered successfully. Use the secret to verify webhook signatures.',
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

    console.error('Error registering webhook:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * PATCH /api/webhooks/:id - Update webhook status
 */
router.patch('/:id', async (req, res) => {
  try {
    const { isActive } = req.body

    const webhook = await prisma.webhook.update({
      where: { id: req.params.id },
      data: {
        isActive: isActive ?? true,
      },
    })

    res.json({
      success: true,
      data: webhook,
    })
  } catch (error) {
    console.error('Error updating webhook:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

/**
 * DELETE /api/webhooks/:id - Delete a webhook
 */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.webhook.delete({
      where: { id: req.params.id },
    })

    res.json({
      success: true,
      data: null,
    })
  } catch (error) {
    console.error('Error deleting webhook:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

export default router
