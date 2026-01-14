import { Request, Response, NextFunction } from 'express'
import { prisma } from '../index.js'
import crypto from 'crypto'

// Extend Express Request type to include apiKey
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string
        name: string
        permissions: string[]
      }
    }
  }
}

/**
 * Middleware to validate API key
 */
export async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Missing API key',
      },
    })
  }

  try {
    // Hash the API key to compare with stored hash
    const hashedKey = hashApiKey(apiKey)

    // Find API key in database
    const storedApiKey = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
    })

    if (!storedApiKey || !storedApiKey.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or inactive API key',
        },
      })
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: storedApiKey.id },
      data: { lastUsedAt: new Date() },
    })

    // Attach API key info to request
    req.apiKey = {
      id: storedApiKey.id,
      name: storedApiKey.name,
      permissions: storedApiKey.permissions,
    }

    next()
  } catch (error) {
    console.error('Error authenticating API key:', error)
    return res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    })
  }
}

/**
 * Middleware to check if API key has required permissions
 */
export function requirePermissions(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authenticated',
        },
      })
    }

    const hasPermission = permissions.every((permission) =>
      req.apiKey!.permissions.includes(permission) || req.apiKey!.permissions.includes('*')
    )

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      })
    }

    next()
  }
}

/**
 * Hash an API key for secure storage
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  return `frac_${crypto.randomBytes(32).toString('hex')}`
}
