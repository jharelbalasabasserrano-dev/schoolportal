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

const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
const messageAttachmentBucket = normalizeEnvValue(import.meta.env.VITE_SUPABASE_MESSAGE_ATTACHMENTS_BUCKET as string | undefined) ?? 'message-attachments'
const maxMessageAttachmentSize = 50 * 1024 * 1024
const supabaseConfigIssues = getSupabaseConfigIssues()

type AttachmentUploadContext = {
  bucket: string
  fileName: string
  fileSize: number
  fileType: string
  messageId: string
  requestId: string
  storagePath?: string
}

export const supabase = supabaseConfigIssues.length === 0 && supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function logSupabaseStartupConfiguration() {
  const details = getSupabaseConfigDetails()
  if (supabaseConfigIssues.length > 0) {
    console.error('[supabase config] Frontend Supabase Storage is not configured correctly', {
      ...details,
      issues: supabaseConfigIssues,
    })
    return
  }

  console.info('[supabase config] Frontend Supabase Storage configuration loaded', details)
}

export function isSupabaseRealtimeEnabled() {
  return Boolean(supabase)
}

export async function messageFromRealtimePayload(payload: { new: Partial<RequestMessageRow> }) {
  return messageFromRequestMessageRow(payload.new)
}

export async function messageFromRequestMessageRow(row: Partial<RequestMessageRow>): Promise<Message | null> {
  if (!row.id || !row.request_id || !row.sender_name || !row.sent_at) return null
  const attachment = row.attachment_storage_path && row.attachment_name && row.attachment_size !== null && row.attachment_size !== undefined && row.attachment_type
    ? {
        dataUrl: '',
        name: row.attachment_name,
        size: row.attachment_size,
        type: row.attachment_type,
        storagePath: row.attachment_storage_path,
        accessUrl: await createAttachmentAccessUrl(row.attachment_storage_path),
      }
    : undefined

  return {
    id: row.id,
    requestId: row.request_id,
    senderId: row.sender_id ?? '',
    senderName: row.sender_name,
    body: row.body ?? '',
    sentAt: row.sent_at,
    status: row.status ?? 'Delivered',
    readBy: row.read_by ?? [],
    attachment,
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
  const context: AttachmentUploadContext = {
    bucket: messageAttachmentBucket,
    fileName: attachment.name,
    fileSize: attachment.size,
    fileType: attachment.type || 'application/octet-stream',
    messageId,
    requestId,
  }
  logAttachmentEvent('upload requested', context)

  if (!supabase) {
    throwAttachmentError(getSupabaseConfigurationErrorMessage(), context)
  }
  if (!attachment.dataUrl) {
    if (!attachment.storagePath) {
      throwAttachmentError('Attachment has no browser file data or Supabase Storage path to send.', context)
    }
    logAttachmentEvent('upload skipped because attachment already has a storage path', { ...context, storagePath: attachment.storagePath })
    return attachment
  }
  if (attachment.size > maxMessageAttachmentSize) {
    throwAttachmentError(`Message attachments must be 50 MB or smaller. Selected file is ${formatBytes(attachment.size)}.`, context)
  }

  const response = await fetch(attachment.dataUrl)
  const blob = await response.blob()
  if (blob.size > maxMessageAttachmentSize) {
    throwAttachmentError(`Message attachments must be 50 MB or smaller. Encoded file is ${formatBytes(blob.size)}.`, context)
  }

  const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'attachment'
  const storagePath = `${cleanPathSegment(requestId)}/${cleanPathSegment(messageId)}/${Date.now()}-${safeName}`
  context.storagePath = storagePath
  await logStoragePreflight(context)
  logAttachmentEvent('upload started', { ...context, blobSize: blob.size })

  const { error } = await supabase.storage
    .from(messageAttachmentBucket)
    .upload(storagePath, blob, {
      contentType: attachment.type || 'application/octet-stream',
      upsert: true,
    })

  if (error) {
    console.error('[message attachment] Supabase Storage upload failed', {
      ...context,
      error: serializeError(error),
    })
    throwAttachmentError(`Supabase Storage upload failed: ${formatUnknownError(error)}`, context, error)
  }

  const accessUrl = await createAttachmentAccessUrl(storagePath)
  logAttachmentEvent('upload completed', { ...context, hasAccessUrl: Boolean(accessUrl) })
  return {
    ...attachment,
    dataUrl: '',
    storagePath,
    accessUrl,
  }
}

export async function createAttachmentAccessUrl(storagePath: string) {
  if (!supabase) return undefined
  const { data, error } = await supabase.storage
    .from(messageAttachmentBucket)
    .createSignedUrl(storagePath, 60 * 60)
  if (!error && data?.signedUrl) return data.signedUrl
  logAttachmentPermissionError('Failed to create signed URL', { bucket: messageAttachmentBucket, storagePath }, error)
  return undefined
}

export function getAttachmentErrorMessage(error: unknown) {
  return formatUnknownError(error)
}

export async function requireAttachmentAccessUrl(storagePath: string) {
  const accessUrl = await createAttachmentAccessUrl(storagePath)
  if (accessUrl) return accessUrl
  const message = `Supabase Storage signed URL failed for bucket "${messageAttachmentBucket}" and path "${storagePath}". Check bucket existence, SELECT policy on storage.objects, and object path.`
  console.error('[message attachment] Signed URL required but unavailable', {
    bucket: messageAttachmentBucket,
    storagePath,
    message,
  })
  throw new Error(message)
}

async function logStoragePreflight(context: AttachmentUploadContext) {
  if (!supabase) return
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  logAttachmentEvent('auth preflight', {
    ...context,
    authMode: sessionData.session ? 'supabase-authenticated' : 'anon-or-custom-portal-auth',
    sessionError: sessionError ? serializeError(sessionError) : undefined,
  })

  const { data, error } = await supabase.storage.getBucket(context.bucket)
  if (error) {
    logAttachmentPermissionError('Storage bucket preflight failed. The bucket may be missing or the anon key may not be allowed to read bucket metadata.', {
      ...context,
      note: 'Upload will still be attempted so the UI can show the exact Storage/RLS error.',
    }, error)
    return
  }

  logAttachmentEvent('bucket preflight', {
    ...context,
    bucketPublic: data.public,
    bucketFileSizeLimit: data.file_size_limit,
    bucketAllowedMimeTypes: data.allowed_mime_types,
  })
}

function cleanPathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown'
}

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function getSupabaseConfigIssues() {
  const issues: string[] = []
  if (!supabaseUrl) issues.push('Missing VITE_SUPABASE_URL.')
  else if (!isValidSupabaseProjectUrl(supabaseUrl)) issues.push('VITE_SUPABASE_URL must be a valid Supabase project URL such as https://project-ref.supabase.co.')

  if (!supabaseAnonKey) issues.push('Missing VITE_SUPABASE_ANON_KEY.')
  else if (supabaseAnonKey.length < 80) issues.push('VITE_SUPABASE_ANON_KEY is unexpectedly short; check that the full anon key was pasted.')

  if (!messageAttachmentBucket) issues.push('Missing VITE_SUPABASE_MESSAGE_ATTACHMENTS_BUCKET.')
  return issues
}

function isValidSupabaseProjectUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')
  } catch {
    return false
  }
}

function getSupabaseConfigDetails() {
  return {
    mode: import.meta.env.MODE,
    isDev: import.meta.env.DEV,
    supabaseUrl: supabaseUrl ?? '(missing)',
    anonKeyPresent: Boolean(supabaseAnonKey),
    anonKeyLength: supabaseAnonKey?.length ?? 0,
    bucket: messageAttachmentBucket,
    maxAttachmentBytes: maxMessageAttachmentSize,
  }
}

function getSupabaseConfigurationErrorMessage() {
  return [
    'Supabase Storage is not configured for the frontend.',
    ...supabaseConfigIssues,
    'Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_SUPABASE_MESSAGE_ATTACHMENTS_BUCKET in School-Request-Management-Portal/.env for local dev.',
    'For Render production builds, add the same VITE_* variables to the frontend service environment and redeploy.',
  ].join(' ')
}

function throwAttachmentError(message: string, context: AttachmentUploadContext, cause?: unknown): never {
  const error = new Error(`${message} Bucket: ${context.bucket}. Path: ${context.storagePath ?? '(not created yet)'}. File: ${context.fileName} (${formatBytes(context.fileSize)}, ${context.fileType}).`)
  console.error('[message attachment] Upload blocked', {
    ...context,
    message,
    cause: cause ? serializeError(cause) : undefined,
  })
  throw error
}

function logAttachmentPermissionError(message: string, details: Record<string, unknown>, error: unknown) {
  const serialized = serializeError(error)
  console.warn('[message attachment] Storage permission or configuration error', {
    ...details,
    message,
    error: serialized,
  })
}

function logAttachmentEvent(event: string, details: Record<string, unknown>) {
  console.info(`[message attachment] ${event}`, details)
}

function formatUnknownError(error: unknown) {
  if (!error) return 'Unknown error'
  if (error instanceof Error) return error.message
  if (typeof error === 'object') {
    const data = error as { error?: string; message?: string; name?: string; status?: number | string; statusCode?: number | string }
    return [
      data.name,
      data.status ?? data.statusCode,
      data.error,
      data.message,
    ].filter(Boolean).join(': ') || JSON.stringify(error)
  }
  return String(error)
}

function serializeError(error: unknown) {
  if (!error) return undefined
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack }
  if (typeof error === 'object') return { ...error }
  return { message: String(error) }
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
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
