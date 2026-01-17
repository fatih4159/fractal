import { prisma } from '../../index.js'
import { twilioClient, formatPhoneNumber, formatWhatsAppNumber, mapTwilioStatus } from './client.js'
import { ChannelType, Direction, MessageStatus } from '../../../shared/types.js'
import env from '../../config/env.js'

type TwilioListMessage = Awaited<ReturnType<typeof twilioClient.messages.list>>[number]

function stripTransportPrefix(value: string | null | undefined): string {
  if (!value) return ''
  return value.startsWith('whatsapp:') ? value.replace('whatsapp:', '') : value
}

function toTwilioAddress(channelType: ChannelType, identifier: string): string {
  if (channelType === ChannelType.WHATSAPP) return formatWhatsAppNumber(identifier)
  return formatPhoneNumber(identifier)
}

function getOurTwilioNumber(channelType: ChannelType): string {
  if (channelType === ChannelType.WHATSAPP) {
    return formatWhatsAppNumber(env.TWILIO_WHATSAPP_NUMBER || '+14155238886')
  }
  // For SMS/MMS, use the configured phone number
  return formatPhoneNumber(env.TWILIO_PHONE_NUMBER || '')
}

function inferChannelTypeFromTwilioMessage(message: TwilioListMessage): ChannelType {
  const from = message.from || ''
  const to = message.to || ''
  const isWhatsApp = from.startsWith('whatsapp:') || to.startsWith('whatsapp:')
  if (isWhatsApp) return ChannelType.WHATSAPP

  // If Twilio reports media, treat as MMS; otherwise SMS.
  const numMedia = parseInt((message.numMedia as any) || '0', 10)
  return numMedia > 0 ? ChannelType.MMS : ChannelType.SMS
}

function inferDirectionFromTwilioMessage(message: TwilioListMessage): Direction {
  // Twilio direction examples: inbound, outbound-api, outbound-reply, etc.
  const dir = (message.direction || '').toLowerCase()
  return dir.startsWith('inbound') ? Direction.INBOUND : Direction.OUTBOUND
}

async function maybeFetchMediaUrls(messageSid: string, numMedia: string | null | undefined): Promise<string[]> {
  const count = parseInt(numMedia || '0', 10)
  if (!count) return []
  try {
    const mediaList = await twilioClient.messages(messageSid).media.list()
    return mediaList.map((media) => `https://api.twilio.com${media.uri.replace('.json', '')}`)
  } catch (error) {
    console.error('Error fetching media URLs for history sync:', error)
    return []
  }
}

export interface SyncConversationFromTwilioOptions {
  limit?: number
  includeMedia?: boolean
}

export interface SyncConversationFromTwilioResult {
  inserted: number
  updated: number
  twilioFetched: number
}

/**
 * Fetch recent Twilio messages for a conversation's contact/channel and upsert into DB.
 *
 * Notes:
 * - Twilio does not expose full delivery status history via the Messages API; we store the
 *   current Twilio status as a status event (at dateUpdated/dateCreated).
 * - We fetch both inbound (from contact) and outbound (to contact) and de-dupe by SID.
 */
export async function syncConversationFromTwilio(
  conversationId: string,
  options: SyncConversationFromTwilioOptions = {}
): Promise<SyncConversationFromTwilioResult> {
  const limit = options.limit ?? 200
  const includeMedia = options.includeMedia ?? true

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      contact: {
        include: {
          channels: true,
        },
      },
    },
  })

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  console.log(`Syncing conversation ${conversationId} with channel type: ${conversation.channelType}`)
  console.log(`Contact has ${conversation.contact.channels.length} channels:`, conversation.contact.channels.map(c => ({ type: c.type, identifier: c.identifier, isPrimary: c.isPrimary })))

  const channel = conversation.contact.channels.find((c) => c.type === conversation.channelType && c.isPrimary) ??
    conversation.contact.channels.find((c) => c.type === conversation.channelType)

  if (!channel) {
    throw new Error(`No matching contact channel found for conversation (looking for type: ${conversation.channelType})`)
  }

  const contactAddress = toTwilioAddress(conversation.channelType as any, channel.identifier)
  const ourNumber = getOurTwilioNumber(conversation.channelType as any)

  console.log(`Fetching messages for contact address: ${contactAddress}`)
  console.log(`Using our Twilio number: ${ourNumber}`)

  const pageSize = Math.min(Math.max(limit, 1), 1000)

  // Fetch messages between our number and the contact's number
  // Outbound: from our number TO contact
  // Inbound: from contact TO our number
  const [outbound, inbound] = await Promise.all([
    twilioClient.messages.list({ from: ourNumber, to: contactAddress, pageSize }),
    twilioClient.messages.list({ from: contactAddress, to: ourNumber, pageSize }),
  ])

  console.log(`Twilio API returned ${outbound.length} outbound and ${inbound.length} inbound messages`)

  const merged = [...outbound, ...inbound]
  const bySid = new Map<string, TwilioListMessage>()
  for (const msg of merged) {
    if (msg.sid) bySid.set(msg.sid, msg)
  }

  const unique = Array.from(bySid.values()).sort((a, b) => {
    const ta = (a.dateCreated?.getTime?.() ?? 0) as number
    const tb = (b.dateCreated?.getTime?.() ?? 0) as number
    return ta - tb
  })

  const sliced = unique.length > limit ? unique.slice(unique.length - limit) : unique
  const sids = sliced.map((m) => m.sid).filter(Boolean) as string[]

  const existing = await prisma.message.findMany({
    where: { twilioSid: { in: sids } },
    select: { id: true, twilioSid: true, status: true, deliveredAt: true, readAt: true, sentAt: true, mediaUrls: true },
  })

  const existingBySid = new Map(existing.map((m) => [m.twilioSid as string, m]))

  let inserted = 0
  let updated = 0

  // Process sequentially to keep DB load predictable (Twilio list is already the slow part).
  for (const twilioMsg of sliced) {
    const sid = twilioMsg.sid
    if (!sid) continue

    const status = mapTwilioStatus(twilioMsg.status || 'queued') as MessageStatus
    const direction = inferDirectionFromTwilioMessage(twilioMsg)
    const channelType = inferChannelTypeFromTwilioMessage(twilioMsg)

    const createdAt = twilioMsg.dateCreated ? new Date(twilioMsg.dateCreated) : new Date()
    const updatedAt = twilioMsg.dateUpdated ? new Date(twilioMsg.dateUpdated) : createdAt
    const sentAt = twilioMsg.dateSent ? new Date(twilioMsg.dateSent) : undefined

    const from = stripTransportPrefix(twilioMsg.from)
    const to = stripTransportPrefix(twilioMsg.to)
    const body = twilioMsg.body || ''

    const errorCode = twilioMsg.errorCode?.toString()
    const errorMessage = twilioMsg.errorMessage || undefined

    const mediaUrls =
      includeMedia ? await maybeFetchMediaUrls(sid, (twilioMsg.numMedia as any) || '0') : []

    const statusTimestamp = updatedAt

    const current = existingBySid.get(sid)
    if (!current) {
      await prisma.message.create({
        data: {
          twilioSid: sid,
          conversationId,
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
              timestamp: statusTimestamp,
              rawPayload: {
                source: 'twilio-history-sync',
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
      inserted += 1
      continue
    }

    const shouldUpdateStatus = current.status !== status
    const shouldUpdateMedia = includeMedia && (current.mediaUrls?.length || 0) === 0 && mediaUrls.length > 0

    if (!shouldUpdateStatus && !shouldUpdateMedia) {
      continue
    }

    await prisma.$transaction(async (tx) => {
      await tx.message.update({
        where: { id: current.id },
        data: {
          status,
          errorCode,
          errorMessage,
          ...(sentAt && !current.sentAt ? { sentAt } : {}),
          ...(status === MessageStatus.DELIVERED && !current.deliveredAt ? { deliveredAt: updatedAt } : {}),
          ...(status === MessageStatus.READ && !current.readAt ? { readAt: updatedAt, deliveredAt: current.deliveredAt ?? updatedAt } : {}),
          ...(shouldUpdateMedia ? { mediaUrls } : {}),
          updatedAt,
        },
      })

      if (shouldUpdateStatus) {
        await tx.statusEvent.create({
          data: {
            messageId: current.id,
            status,
            timestamp: statusTimestamp,
            rawPayload: {
              source: 'twilio-history-sync',
              sid,
              status: twilioMsg.status,
            },
          },
        })
      }
    })

    updated += 1
  }

  // Best-effort: update conversation summary based on newest synced message
  const last = sliced[sliced.length - 1]
  if (last?.sid) {
    const lastBody = last.body || (parseInt((last.numMedia as any) || '0', 10) > 0 ? '[Media]' : '')
    const lastAt = last.dateCreated ? new Date(last.dateCreated) : new Date()
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: lastBody || null,
        lastMessageAt: lastAt,
      },
    })
  }

  const result = { inserted, updated, twilioFetched: sliced.length }
  console.log(`Sync complete for conversation ${conversationId}:`, result)
  return result
}

