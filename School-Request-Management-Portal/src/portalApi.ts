import { initialAnnouncements, initialCategories, initialInventory, initialMessages, initialRequests, initialStockMovements, initialSuppliers, initialUsers, type Announcement, type Message, type PortalRequest, type StockMovement, type SupplierInfo, type SupplyCategory, type SupplyItem, type User } from './portalData'

export type BootstrapData = {
  accounts: User[]
  requests: PortalRequest[]
  messages: Message[]
  announcements: Announcement[]
  inventory: SupplyItem[]
  categories: SupplyCategory[]
  suppliers: SupplierInfo[]
  stockMovements: StockMovement[]
}

const productionApiBaseUrl = import.meta.env.VITE_API_BASE_URL
const apiBaseUrl = import.meta.env.DEV
  ? ''
  : productionApiBaseUrl && !productionApiBaseUrl.includes('127.0.0.1') && !productionApiBaseUrl.includes('localhost')
    ? productionApiBaseUrl
    : 'https://schoolportal-1nm8.onrender.com'
const requestTimeoutMs = import.meta.env.DEV ? 6000 : 60000
const bootstrapRetryDelayMs = 1500

let bootstrapLoadPromise: Promise<BootstrapData> | null = null

type ApiPortalRequest = PortalRequest & {
  filingDate?: string
  vacationLeaveEarned?: string
  sickLeaveEarned?: string
}

function toApiTimestamp(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function toApiDate(value: string | undefined, fallback = new Date()) {
  if (!value?.trim()) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback.toISOString().slice(0, 10)
  return parsed.toISOString().slice(0, 10)
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function isTimeoutError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function fromApiRequest(request: ApiPortalRequest): PortalRequest {
  return {
    ...request,
    filedDate: request.filedDate ?? request.filingDate,
    vacationLeaveTotalEarned: request.vacationLeaveTotalEarned ?? request.vacationLeaveEarned,
    sickLeaveTotalEarned: request.sickLeaveTotalEarned ?? request.sickLeaveEarned,
  }
}

function toApiRequest(request: PortalRequest): ApiPortalRequest {
  return {
    ...request,
    date: toApiDate(request.date) ?? new Date().toISOString().slice(0, 10),
    filingDate: toApiDate(request.filedDate),
    vacationLeaveEarned: request.vacationLeaveTotalEarned,
    sickLeaveEarned: request.sickLeaveTotalEarned,
  }
}

function toApiAnnouncement(announcement: Announcement): Announcement {
  return {
    ...announcement,
    createdAt: toApiTimestamp(announcement.createdAt),
  }
}

function toApiInventoryItem(item: SupplyItem): SupplyItem {
  return {
    ...item,
    expiryDate: toApiDate(item.expiryDate),
  }
}

function toApiStockMovement(movement: StockMovement): StockMovement {
  return {
    ...movement,
    date: toApiTimestamp(movement.date),
  }
}

function toApiMessage(message: Message): Message {
  return {
    ...message,
    sentAt: toApiTimestamp(message.sentAt),
    status: message.status ?? 'Delivered',
    readBy: message.readBy ?? [],
  }
}

function fromApiPayload(data: BootstrapData & { requests?: ApiPortalRequest[]; announcements?: Announcement[]; stock_movements?: StockMovement[] }): BootstrapData {
  return {
    ...data,
    requests: (data.requests ?? []).map(fromApiRequest),
    announcements: data.announcements ?? [],
    stockMovements: data.stockMovements ?? data.stock_movements ?? [],
  }
}

function toApiPayload(data: BootstrapData) {
  return {
    ...data,
    requests: data.requests.map(toApiRequest),
    announcements: data.announcements.map(toApiAnnouncement),
    inventory: data.inventory.map(toApiInventoryItem),
    stockMovements: data.stockMovements.map(toApiStockMovement),
    messages: data.messages.map(toApiMessage),
  }
}

async function getErrorMessage(response: Response, fallback: string) {
  const text = await response.text().catch(() => '')
  if (!text) return fallback

  try {
    const data = JSON.parse(text) as { error?: string; message?: string }
    return [data.error, data.message].filter(Boolean).join(': ') || fallback
  } catch {
    return text
  }
}

export function createInitialBootstrapData(accounts: User[] = initialUsers): BootstrapData {
  return {
    accounts,
    requests: initialRequests,
    messages: initialMessages,
    announcements: initialAnnouncements,
    inventory: initialInventory,
    categories: initialCategories,
    suppliers: initialSuppliers,
    stockMovements: initialStockMovements,
  }
}

export function hasBootstrapRows(data: BootstrapData) {
  return data.accounts.length > 0 ||
    data.requests.length > 0 ||
    data.messages.length > 0 ||
    data.announcements.length > 0 ||
    data.inventory.length > 0 ||
    data.categories.length > 0 ||
    data.suppliers.length > 0 ||
    data.stockMovements.length > 0
}

export async function loadBootstrapData() {
  bootstrapLoadPromise ??= loadBootstrapDataOnce().catch((error) => {
    bootstrapLoadPromise = null
    throw error
  })

  return bootstrapLoadPromise
}

export async function refreshBootstrapData() {
  return loadBootstrapDataOnce()
}

async function loadBootstrapDataOnce() {
  const url = `${apiBaseUrl}/api/bootstrap`
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url)
      if (!response.ok) throw new Error(await getErrorMessage(response, `Failed to load database data (${response.status})`))
      return fromApiPayload(await response.json())
    } catch (error) {
      lastError = error
      if (!isTimeoutError(error) || attempt === 1) break
      await delay(bootstrapRetryDelayMs)
    }
  }

  const message = isTimeoutError(lastError)
    ? `request timed out after ${requestTimeoutMs / 1000} seconds`
    : lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`Cannot reach backend${apiBaseUrl ? ` at ${apiBaseUrl}` : ''}: ${message}`)
}

export async function syncBootstrapData(data: BootstrapData) {
  const response = await fetchWithTimeout(`${apiBaseUrl}/api/bootstrap`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApiPayload(data)),
  }).catch((error) => {
    const message = isTimeoutError(error)
      ? `request timed out after ${requestTimeoutMs / 1000} seconds`
      : error instanceof Error ? error.message : String(error)
    throw new Error(`Cannot reach backend${apiBaseUrl ? ` at ${apiBaseUrl}` : ''}: ${message}`)
  })
  if (!response.ok) throw new Error(await getErrorMessage(response, `Failed to sync database data (${response.status})`))
}
