import { createClient } from '@supabase/supabase-js'
import type { Message, MessageAttachment } from './portalData'

type RequestMessageRow = {
  attachment_data_url: string | null
  attachment_storage_path: string | null
  attachment_name: string | null
  attachment_size: number | null
  attachment_type: string | null
  body: string
  id: string
  read_by: string[] | null
  request_id: string
  sender_id: string | null
  sender_name: string
  sent_at: string
  status: Message['status'] | null
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const messageAttachmentBucket = (import.meta.env.VITE_SUPABASE_MESSAGE_ATTACHMENTS_BUCKET as string | undefined) ?? 'message-attachments'

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function isSupabaseRealtimeEnabled() {
  return Boolean(supabase)
}

export async function messageFromRealtimePayload(payload: { new: Partial<RequestMessageRow> }) {
  return messageFromRequestMessageRow(payload.new)
}

export async function messageFromRequestMessageRow(row: Partial<RequestMessageRow>): Promise<Message | null> {
  if (!row.id || !row.request_id || !row.sender_name || !row.sent_at) return null
  const accessUrl = row.attachment_storage_path ? await createAttachmentAccessUrl(row.attachment_storage_path) : undefined

  return {
    id: row.id,
    requestId: row.request_id,
    senderId: row.sender_id ?? '',
    senderName: row.sender_name,
    body: row.body ?? '',
    sentAt: row.sent_at,
    status: row.status ?? 'Delivered',
    readBy: row.read_by ?? [],
    attachment: (row.attachment_data_url || row.attachment_storage_path) && row.attachment_name && row.attachment_size && row.attachment_type
      ? {
          dataUrl: row.attachment_data_url ?? '',
          name: row.attachment_name,
          size: row.attachment_size,
          type: row.attachment_type,
          storagePath: row.attachment_storage_path ?? undefined,
          accessUrl,
        }
      : undefined,
  }
}

export async function refreshMessageAttachmentUrl(message: Message): Promise<Message> {
  if (!message.attachment?.storagePath || message.attachment.accessUrl) return message
  const accessUrl = await createAttachmentAccessUrl(message.attachment.storagePath)
  return accessUrl ? { ...message, attachment: { ...message.attachment, accessUrl } } : message
}

export async function refreshMessageAttachmentUrls(messages: Message[]) {
  return Promise.all(messages.map(refreshMessageAttachmentUrl))
}

export async function uploadMessageAttachment(requestId: string, messageId: string, attachment: MessageAttachment) {
  if (!supabase || !attachment.dataUrl) return attachment

  const response = await fetch(attachment.dataUrl)
  const blob = await response.blob()
  const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'attachment'
  const storagePath = `${requestId}/${messageId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage
    .from(messageAttachmentBucket)
    .upload(storagePath, blob, {
      contentType: attachment.type || 'application/octet-stream',
      upsert: true,
    })

  if (error) throw error
  const accessUrl = await createAttachmentAccessUrl(storagePath)
  return {
    ...attachment,
    dataUrl: '',
    storagePath,
    accessUrl,
  }
}

async function createAttachmentAccessUrl(storagePath: string) {
  if (!supabase) return undefined
  const { data, error } = await supabase.storage
    .from(messageAttachmentBucket)
    .createSignedUrl(storagePath, 60 * 60)
  if (!error && data?.signedUrl) return data.signedUrl

  const publicData = supabase.storage.from(messageAttachmentBucket).getPublicUrl(storagePath)
  return publicData.data.publicUrl
}

export async function loadReadNotificationIds(userId: string) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('user_id', userId)
    .eq('is_read', true)
  if (error) throw error
  return (data ?? []).map((row) => row.notification_id as string)
}

export async function markNotificationReadInSupabase(userId: string, notificationId: string) {
  if (!supabase) return
  const { error } = await supabase
    .from('notification_reads')
    .upsert({ user_id: userId, notification_id: notificationId, is_read: true, read_at: new Date().toISOString() })
  if (error) throw error
}

export async function markNotificationUnreadInSupabase(userId: string, notificationId: string) {
  if (!supabase) return
  const { error } = await supabase
    .from('notification_reads')
    .delete()
    .eq('user_id', userId)
    .eq('notification_id', notificationId)
  if (error) throw error
}
