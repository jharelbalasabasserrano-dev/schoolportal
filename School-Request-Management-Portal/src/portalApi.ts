import { initialAnnouncements, initialCategories, initialInventory, initialMessages, initialRequests, initialStockMovements, initialSuppliers, initialUsers, type Announcement, type Message, type PortalRequest, type StockMovement, type SupplierInfo, type SupplyCategory, type SupplyItem, type User } from './portalData'
import { stripAttachmentDataForStorage } from './portalHelpers'

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

const apiBaseUrl = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? 'https://schoolportal-1nm8.onrender.com'
const requestTimeoutMs = 6000

type ApiPortalRequest = PortalRequest & {
  filingDate?: string
  vacationLeaveEarned?: string
  sickLeaveEarned?: string
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
    filingDate: request.filedDate,
    vacationLeaveEarned: request.vacationLeaveTotalEarned,
    sickLeaveEarned: request.sickLeaveTotalEarned,
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
    messages: data.messages.map(stripAttachmentDataForStorage),
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
  const response = await fetchWithTimeout(`${apiBaseUrl}/api/bootstrap`).catch((error) => {
    throw new Error(`Cannot reach backend${apiBaseUrl ? ` at ${apiBaseUrl}` : ''}: ${error instanceof Error ? error.message : String(error)}`)
  })
  if (!response.ok) throw new Error(`Failed to load database data (${response.status})`)
  return fromApiPayload(await response.json())
}

export async function syncBootstrapData(data: BootstrapData) {
  const response = await fetchWithTimeout(`${apiBaseUrl}/api/bootstrap`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApiPayload(data)),
  }).catch((error) => {
    throw new Error(`Cannot reach backend${apiBaseUrl ? ` at ${apiBaseUrl}` : ''}: ${error instanceof Error ? error.message : String(error)}`)
  })
  if (!response.ok) throw new Error(`Failed to sync database data (${response.status})`)
}
