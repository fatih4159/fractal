import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { fileURLToPath } from 'url'
import env from './config/env.js'
import { setupSocketIO } from './socket/index.js'

function getDatabaseInfo(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl)
    const database = url.pathname.replace(/^\//, '')
    const schema = url.searchParams.get('schema') ?? 'public'
    const host = url.hostname
    const port = url.port || '5432'

    return { host, port, database, schema }
  } catch {
    return null
  }
}

function isSafeSqlIdentifier(value: string) {
  // Allow only typical Postgres identifier characters to avoid accidental injection in debug SQL.
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
}

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

const dbInfo = getDatabaseInfo(env.DATABASE_URL)
if (dbInfo) {
  console.log(`💾 Database: ${dbInfo.host}:${dbInfo.port}/${dbInfo.database} (schema=${dbInfo.schema})`)
}

async function verifyCriticalTables() {
  if (!dbInfo || !isSafeSqlIdentifier(dbInfo.schema)) return

  const schema = dbInfo.schema
  const criticalTables = ['conversations', 'messages', 'contacts']
  const missing: string[] = []

  for (const table of criticalTables) {
    // to_regclass returns NULL if the relation doesn't exist (no exception).
    const rows = await prisma.$queryRaw<Array<{ regclass: string | null }>>(
      `SELECT to_regclass('${schema}.${table}')::text AS regclass`
    )
    const exists = rows[0]?.regclass != null
    if (!exists) missing.push(`${schema}.${table}`)
  }

  if (missing.length > 0) {
    console.warn(
      [
        '⚠️  Database schema mismatch detected.',
        `Missing tables: ${missing.join(', ')}`,
        'This usually means either:',
        '- DATABASE_URL points to a different database than expected, or',
        '- migrations were not applied to this database/schema.',
        'If you use a non-public schema, ensure DATABASE_URL contains ?schema=<your_schema>.',
      ].join('\n')
    )
  }
}

// Initialize Express
const app = express()
const httpServer = createServer(app)

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.NODE_ENV === 'development' ? ['http://localhost:5173'] : [env.APP_URL],
    credentials: true,
  },
})

// Middleware
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production',
}))
app.use(cors({
  origin: env.NODE_ENV === 'development' ? ['http://localhost:5173'] : [env.APP_URL],
  credentials: true,
}))
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`)
  })
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  })
})

// API Routes
app.get('/api', (req, res) => {
  res.json({
    name: 'Fractal API',
    version: '1.0.0',
    description: 'Twilio Multi-Channel Messaging Platform',
  })
})

// Import API routes
import contactsRouter from './routes/api/contacts.js'
import messagesRouter from './routes/api/messages.js'
import conversationsRouter from './routes/api/conversations.js'
import templatesRouter from './routes/api/templates.js'
import webhooksRouter from './routes/api/webhooks.js'
import twilioWebhooksRouter from './routes/twilio/webhooks.js'

// Mount API routes
app.use('/api/contacts', contactsRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/conversations', conversationsRouter)
app.use('/api/templates', templatesRouter)
app.use('/api/webhooks', webhooksRouter)
app.use('/webhooks/twilio', twilioWebhooksRouter)

// 404 handler for API routes (before static files)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'API route not found',
    },
  })
})

app.use('/webhooks/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Webhook route not found',
    },
  })
})

// Serve static files in production
if (env.NODE_ENV === 'production') {
  const clientPath = path.resolve(__dirname, '../client')
  console.log(`📁 Serving static files from: ${clientPath}`)
  app.use(express.static(clientPath))

  // SPA fallback - serve index.html for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'))
  })
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  })
})

// Setup Socket.IO
setupSocketIO(io)

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Shutting down gracefully...')

  httpServer.close(() => {
    console.log('📪 HTTP server closed')
  })

  await prisma.$disconnect()
  console.log('💾 Database connection closed')

  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Start server
const PORT = parseInt(env.PORT, 10)

async function start() {
  try {
    await prisma.$connect()
    await verifyCriticalTables()

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 Fractal Server Started')
      console.log(`📡 Server: http://localhost:${PORT}`)
      console.log(`🌍 Environment: ${env.NODE_ENV}`)
      console.log(`🔌 WebSocket: Ready`)
      console.log('✅ Ready to handle requests')
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

void start()

export { io }
