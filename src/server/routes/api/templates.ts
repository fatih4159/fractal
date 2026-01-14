import { Router } from 'express'
import { listTemplates, getTemplate } from '../../services/twilio/templates.js'
import { prisma } from '../../index.js'

const router = Router()

/**
 * GET /api/templates - List all available templates
 */
router.get('/', async (req, res) => {
  try {
    // Try to get from Twilio
    const twilioTemplates = await listTemplates()

    // Also sync with database
    for (const template of twilioTemplates) {
      await prisma.template.upsert({
        where: { twilioSid: template.sid },
        create: {
          twilioSid: template.sid,
          name: template.friendlyName,
          language: template.language,
          status: 'approved',
          channelType: 'WHATSAPP',
          variables: template.variables,
          body: JSON.stringify(template.types),
        },
        update: {
          name: template.friendlyName,
          language: template.language,
          variables: template.variables,
          body: JSON.stringify(template.types),
        },
      })
    }

    res.json({
      success: true,
      data: twilioTemplates,
    })
  } catch (error) {
    console.error('Error listing templates:', error)

    // Fallback to database if Twilio fails
    const dbTemplates = await prisma.template.findMany()

    res.json({
      success: true,
      data: dbTemplates,
      meta: {
        source: 'database',
        warning: 'Could not fetch from Twilio, showing cached templates',
      },
    })
  }
})

/**
 * GET /api/templates/:sid - Get a specific template
 */
router.get('/:sid', async (req, res) => {
  try {
    const template = await getTemplate(req.params.sid)

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Template not found',
        },
      })
    }

    res.json({
      success: true,
      data: template,
    })
  } catch (error) {
    console.error('Error fetching template:', error)
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
})

export default router
