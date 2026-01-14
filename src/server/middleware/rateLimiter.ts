import { Request, Response, NextFunction } from 'express'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 60000)

export interface RateLimitOptions {
  windowMs?: number // Time window in milliseconds
  max?: number // Max requests per window
  message?: string
  keyGenerator?: (req: Request) => string
}

/**
 * Simple in-memory rate limiter middleware
 * For production, consider using Redis-backed rate limiting
 */
export function rateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => {
      // Use API key if available, otherwise use IP
      if (req.apiKey) {
        return `apikey:${req.apiKey.id}`
      }
      return `ip:${req.ip || req.connection.remoteAddress || 'unknown'}`
    },
  } = options

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req)
    const now = Date.now()

    if (!store[key] || store[key].resetTime < now) {
      // Initialize or reset
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      }
      return next()
    }

    store[key].count++

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - store[key].count))
    res.setHeader('X-RateLimit-Reset', store[key].resetTime)

    if (store[key].count > max) {
      return res.status(429).json({
        success: false,
        error: {
          message,
          code: 'RATE_LIMIT_EXCEEDED',
        },
      })
    }

    next()
  }
}

/**
 * Stricter rate limit for authentication endpoints
 */
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later',
})

/**
 * Rate limit for API endpoints
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
})

/**
 * Rate limit for message sending
 */
export const messagingRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: 'Message rate limit exceeded, please slow down',
})
