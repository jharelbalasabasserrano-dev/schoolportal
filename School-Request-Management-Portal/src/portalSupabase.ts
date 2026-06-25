import { createClient, type RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Message } from './portalData'

type RequestMessageRow = {
  attachment_data_url: string | null
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

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function isSupabaseRealtimeEnabled() {
  return Boolean(supabase)
}

export function messageFromRealtimePayload(payload: RealtimePostgresChangesPayload<RequestMessageRow>) {
  return messageFromRequestMessageRow(payload.new)
}

export function messageFromRequestMessageRow(row: Partial<RequestMessageRow>): Message | null {
  if (!row.id || !row.request_id || !row.sender_name || !row.sent_at) return null

  return {
    id: row.id,
    requestId: row.request_id,
    senderId: row.sender_id ?? '',
    senderName: row.sender_name,
    body: row.body ?? '',
    sentAt: row.sent_at,
    status: row.status ?? 'Delivered',
    readBy: row.read_by ?? [],
    attachment: row.attachment_data_url && row.attachment_name && row.attachment_size && row.attachment_type
      ? {
          dataUrl: row.attachment_data_url,
          name: row.attachment_name,
          size: row.attachment_size,
          type: row.attachment_type,
        }
      : undefined,
  }
}
