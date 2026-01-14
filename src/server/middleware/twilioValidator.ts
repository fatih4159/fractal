import { Request, Response, NextFunction } from 'express'
import { validateTwilioWebhook } from '../services/twilio/client.js'
import env from '../config/env.js'

/**
 * Middleware to validate Twilio webhook signatures
 */
export function twilioWebhookValidator(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-twilio-signature'] as string

  if (!signature) {
    console.error('Missing Twilio signature')
    return res.status(403).json({
      success: false,
      error: {
        message: 'Missing Twilio signature',
      },
    })
  }

  // Construct the full URL
  const protocol = req.headers['x-forwarded-proto'] || req.protocol
  const host = req.headers['x-forwarded-host'] || req.get('host')
  const url = `${protocol}://${host}${req.originalUrl}`

  // Get params from body (for POST) or query (for GET)
  const params = req.method === 'POST' ? req.body : req.query

  // Validate signature
  const isValid = validateTwilioWebhook(signature, url, params)

  if (!isValid) {
    console.error('Invalid Twilio signature')
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid Twilio signature',
      },
    })
  }

  next()
}
