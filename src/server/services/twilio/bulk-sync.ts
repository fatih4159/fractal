import { prisma } from '../../index.js'
import { twilioClient, formatPhoneNumber, formatWhatsAppNumber, mapTwilioStatus } from './client.js'
import { ChannelType, Direction, MessageStatus } from '../../../shared/types.js'
import env from '../../config/env.js'

type TwilioListMessage = Awaited<ReturnType<typeof twilioClient.messages.list>>[number]

function stripTransportPrefix(value: string | null | undefined): string {
  if (!value) return ''
  return value.startsWith('whatsapp:') ? value.replace('whatsapp:', '') : value
}

function inferChannelTypeFromTwilioMessage(message: TwilioListMessage): ChannelType {
  const from = message.from || ''
  const to = message.to || ''
  const isWhatsApp = from.startsWith('whatsapp:') || to.startsWith('whatsapp:')
  if (isWhatsApp) return ChannelType.WHATSAPP

  const numMedia = parseInt((message.numMedia as any) || '0', 10)
  return numMedia > 0 ? ChannelType.MMS : ChannelType.SMS
}

function inferDirectionFromTwilioMessage(message: TwilioListMessage, ourNumbers: Set<string>): Direction {
  const from = stripTransportPrefix(message.from)
  // If the message is from one of our numbers, it's outbound
  return ourNumbers.has(from) ? Direction.OUTBOUND : Direction.INBOUND
}

function getOurPhoneNumber(): string {
  return formatPhoneNumber(env.TWILIO_PHONE_NUMBER || '')
}

function getOurWhatsAppNumber(): string {
  return formatWhatsAppNumber(env.TWILIO_WHATSAPP_NUMBER || '+14155238886')
}

async function maybeFetchMediaUrls(messageSid: string, numMedia: string | null | undefined): Promise<string[]> {
  const count = parseInt(numMedia || '0', 10)
  if (!count) return []
  try {
    const mediaList = await twilioClient.messages(messageSid).media.list()
    return mediaList.map((media) => `https://api.twilio.com${media.uri.replace('.json', '')}`)
  } catch (error) {
    console.error('Error fetching media URLs for bulk sync:', error)
    return []
  }
}

export interface BulkSyncOptions {
  limit?: number
  includeMedia?: boolean
  dateAfter?: Date // Only sync messages after this date
}

export interface BulkSyncResult {
  contactsCreated: number
  conversationsCreated: number
  messagesInserted: number
  messagesUpdated: number
  totalFetched: number
  errors: string[]
}

/**
 * Bulk sync all messages from Twilio to populate the database with historical data.
 * This discovers existing conversations and creates contacts/conversations as needed.
 */
export async function bulkSyncFromTwilio(options: BulkSyncOptions = {}): Promise<BulkSyncResult> {
  const limit = options.limit ?? 1000
  const includeMedia = options.includeMedia ?? true
  const dateAfter = options.dateAfter

  console.log('🔄 Starting bulk sync from Twilio...')
  console.log(`Options: limit=${limit}, includeMedia=${includeMedia}, dateAfter=${dateAfter?.toISOString() || 'none'}`)

  // Track our phone numbers for direction inference
  const ourNumbers = new Set<string>([
    stripTransportPrefix(getOurPhoneNumber()),
    stripTransportPrefix(getOurWhatsAppNumber()),
  ])

  const result: BulkSyncResult = {
    contactsCreated: 0,
    conversationsCreated: 0,
    messagesInserted: 0,
    messagesUpdated: 0,
    totalFetched: 0,
    errors: [],
  }

  try {
    // Fetch all messages from Twilio
    const pageSize = Math.min(Math.max(limit, 1), 1000)
    const listOptions: any = { pageSize }

    if (dateAfter) {
      listOptions.dateSentAfter = dateAfter
    }

    console.log('📡 Fetching messages from Twilio API...')
    const allMessages = await twilioClient.messages.list(listOptions)
    result.totalFetched = allMessages.length

    console.log(`✅ Fetched ${allMessages.length} messages from Twilio`)

    // Group messages by contact (the party that's not us)
    const messagesByContact = new Map<string, TwilioListMessage[]>()

    for (const msg of allMessages) {
      const from = stripTransportPrefix(msg.from)
      const to = stripTransportPrefix(msg.to)

      // Determine which party is the contact (not us)
      const contactNumber = ourNumbers.has(from) ? to : from
      if (!contactNumber) continue

      if (!messagesByContact.has(contactNumber)) {
        messagesByContact.set(contactNumber, [])
      }
      messagesByContact.get(contactNumber)!.push(msg)
    }

    console.log(`📊 Found messages with ${messagesByContact.size} unique contacts`)

    // Process each contact
    for (const [contactNumber, messages] of messagesByContact.entries()) {
      try {
        // Determine channel type from first message
        const firstMsg = messages[0]
        const channelType = inferChannelTypeFromTwilioMessage(firstMsg)

        console.log(`\n👤 Processing contact: ${contactNumber} (${channelType}, ${messages.length} messages)`)

        // Find or create contact and channel
        let channel = await prisma.channel.findUnique({
          where: {
            type_identifier: {
              type: channelType,
              identifier: contactNumber,
            },
          },
          include: { contact: true },
        })

        let contact
        if (!channel) {
          console.log(`  ✨ Creating new contact: ${contactNumber}`)
          contact = await prisma.contact.create({
            data: {
              name: contactNumber,
              channels: {
                create: {
                  type: channelType,
                  identifier: contactNumber,
                  isPrimary: true,
                },
              },
            },
          })
          result.contactsCreated += 1
        } else {
          contact = channel.contact
        }

        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
          where: {
            contactId: contact.id,
            channelType,
          },
        })

        if (!conversation) {
          console.log(`  ✨ Creating new conversation`)
          conversation = await prisma.conversation.create({
            data: {
              contactId: contact.id,
              channelType,
            },
          })
          result.conversationsCreated += 1
        }

        // Get existing messages for this conversation
        const existingMessages = await prisma.message.findMany({
          where: { conversationId: conversation.id },
          select: { twilioSid: true, status: true, id: true },
        })

        const existingBySid = new Map(existingMessages.map((m) => [m.twilioSid as string, m]))

        // Process messages for this contact
        let lastMessageBody = ''
        let lastMessageAt = new Date(0)

        for (const twilioMsg of messages) {
          const sid = twilioMsg.sid
          if (!sid) continue

          const status = mapTwilioStatus(twilioMsg.status || 'queued') as MessageStatus
          const direction = inferDirectionFromTwilioMessage(twilioMsg, ourNumbers)

          const createdAt = twilioMsg.dateCreated ? new Date(twilioMsg.dateCreated) : new Date()
          const updatedAt = twilioMsg.dateUpdated ? new Date(twilioMsg.dateUpdated) : createdAt
          const sentAt = twilioMsg.dateSent ? new Date(twilioMsg.dateSent) : undefined

          const from = stripTransportPrefix(twilioMsg.from)
          const to = stripTransportPrefix(twilioMsg.to)
          const body = twilioMsg.body || ''

          const errorCode = twilioMsg.errorCode?.toString()
          const errorMessage = twilioMsg.errorMessage || undefined

          const mediaUrls = includeMedia ? await maybeFetchMediaUrls(sid, (twilioMsg.numMedia as any) || '0') : []

          // Track latest message
          if (createdAt > lastMessageAt) {
            lastMessageAt = createdAt
            lastMessageBody = body || (mediaUrls.length > 0 ? '[Media]' : '')
          }

          const existing = existingBySid.get(sid)
          if (!existing) {
            // Create new message
            await prisma.message.create({
              data: {
                twilioSid: sid,
                conversationId: conversation.id,
                direction,
                channelType,
                from,
                to,
                body,
                mediaUrls,
                status,
                errorCode,
                errorMessage,
                sentAt,
                deliveredAt:
                  status === MessageStatus.DELIVERED || status === MessageStatus.READ ? updatedAt : undefined,
                readAt: status === MessageStatus.READ ? updatedAt : undefined,
                createdAt,
                updatedAt,
                statusHistory: {
                  create: {
                    status,
                    timestamp: updatedAt,
                    rawPayload: {
                      source: 'twilio-bulk-sync',
                      sid,
                      status: twilioMsg.status,
                      direction: twilioMsg.direction,
                      dateCreated: twilioMsg.dateCreated,
                      dateUpdated: twilioMsg.dateUpdated,
                    },
                  },
                },
              },
            })
            result.messagesInserted += 1
          } else if (existing.status !== status) {
            // Update existing message if status changed
            await prisma.$transaction(async (tx) => {
              await tx.message.update({
                where: { id: existing.id },
                data: {
                  status,
                  errorCode,
                  errorMessage,
                  updatedAt,
                },
              })

              await tx.statusEvent.create({
                data: {
                  messageId: existing.id,
                  status,
                  timestamp: updatedAt,
                  rawPayload: {
                    source: 'twilio-bulk-sync',
                    sid,
                    status: twilioMsg.status,
                  },
                },
              })
            })
            result.messagesUpdated += 1
          }
        }

        // Update conversation with latest message
        if (lastMessageAt > new Date(0)) {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessage: lastMessageBody || null,
              lastMessageAt,
            },
          })
        }

        console.log(`  ✅ Processed ${messages.length} messages for ${contactNumber}`)
      } catch (error) {
        const errorMsg = `Error processing contact ${contactNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`  ❌ ${errorMsg}`)
        result.errors.push(errorMsg)
      }
    }

    console.log('\n🎉 Bulk sync complete!')
    console.log(`  Contacts created: ${result.contactsCreated}`)
    console.log(`  Conversations created: ${result.conversationsCreated}`)
    console.log(`  Messages inserted: ${result.messagesInserted}`)
    console.log(`  Messages updated: ${result.messagesUpdated}`)
    console.log(`  Total fetched: ${result.totalFetched}`)
    console.log(`  Errors: ${result.errors.length}`)

    return result
  } catch (error) {
    const errorMsg = `Fatal error during bulk sync: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`❌ ${errorMsg}`)
    result.errors.push(errorMsg)
    throw error
  }
}
