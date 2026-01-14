import { Router } from 'express'
import { listTemplates, getTemplate } from '../../services/twilio/templates.js'
import { prisma } from '../../index.js'

const router = Router()

/**
 * GET /api/templates - List all available templates
 */
router.get('/', async (req, res) => {
  const useCacheOnly = req.query.cache === 'true'
  let twilioError: string | null = null

  // If cache-only mode, skip Twilio and return from database
  if (useCacheOnly) {
    const dbTemplates = await prisma.template.findMany({
      orderBy: { name: 'asc' },
    })

    return res.json({
      success: true,
      data: dbTemplates.map((t) => ({
        sid: t.twilioSid,
        friendlyName: t.name,
        language: t.language,
        variables: t.variables,
        types: t.body ? JSON.parse(t.body) : {},
        approvalStatus: t.status,
      })),
      meta: {
        source: 'database',
        count: dbTemplates.length,
      },
    })
  }

  try {
    // Try to get from Twilio
    const twilioTemplates = await listTemplates()

    console.log(`[API] Received ${twilioTemplates.length} templates from Twilio service`)

    // Sync with database for caching
    if (twilioTemplates.length > 0) {
      for (const template of twilioTemplates) {
        try {
          await prisma.template.upsert({
            where: { twilioSid: template.sid },
            create: {
              twilioSid: template.sid,
              name: template.friendlyName,
              language: template.language,
              status: template.approvalStatus || 'approved',
              channelType: 'WHATSAPP',
              variables: template.variables,
              body: JSON.stringify(template.types),
            },
            update: {
              name: template.friendlyName,
              language: template.language,
              status: template.approvalStatus || 'approved',
              variables: template.variables,
              body: JSON.stringify(template.types),
            },
          })
        } catch (dbErr) {
          console.error(`[API] Failed to cache template ${template.sid}:`, dbErr)
        }
      }
    }

    return res.json({
      success: true,
      data: twilioTemplates,
      meta: {
        source: 'twilio',
        count: twilioTemplates.length,
      },
    })
  } catch (error) {
    twilioError = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API] Error listing templates from Twilio:', twilioError)
  }

  // Twilio failed - try database fallback
  try {
    const dbTemplates = await prisma.template.findMany({
      orderBy: { name: 'asc' },
    })

    if (dbTemplates.length > 0) {
      return res.json({
        success: true,
        data: dbTemplates.map((t) => ({
          sid: t.twilioSid,
          friendlyName: t.name,
          language: t.language,
          variables: t.variables,
          types: t.body ? JSON.parse(t.body) : {},
          approvalStatus: t.status,
        })),
        meta: {
          source: 'database',
          count: dbTemplates.length,
          warning: `Could not fetch from Twilio (${twilioError}), showing ${dbTemplates.length} cached templates`,
        },
      })
    }
  } catch (dbError) {
    console.error('[API] Database fallback also failed:', dbError)
  }

  // Both Twilio and database failed - return error with details
  return res.status(503).json({
    success: false,
    data: [],
    error: {
      message: 'Unable to load templates',
      details: twilioError,
      suggestion: 'Check Twilio credentials and Content API access. Make sure content templates exist in your Twilio account.',
    },
  })
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
