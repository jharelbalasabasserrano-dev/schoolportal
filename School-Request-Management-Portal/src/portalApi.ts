import type { Message, PortalRequest, StockMovement, SupplierInfo, SupplyCategory, SupplyItem, User } from './portalData'

export type BootstrapData = {
  accounts: User[]
  requests: PortalRequest[]
  messages: Message[]
  inventory: SupplyItem[]
  categories: SupplyCategory[]
  suppliers: SupplierInfo[]
  stockMovements: StockMovement[]
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'https://schoolportal-1nm8.onrender.com'

function fromApiPayload(data: BootstrapData & { stock_movements?: StockMovement[] }): BootstrapData {
  return {
    ...data,
    stockMovements: data.stockMovements ?? data.stock_movements ?? [],
  }
}

export function hasBootstrapRows(data: BootstrapData) {
  return data.accounts.length > 0 ||
    data.requests.length > 0 ||
    data.messages.length > 0 ||
    data.inventory.length > 0 ||
    data.categories.length > 0 ||
    data.suppliers.length > 0 ||
    data.stockMovements.length > 0
}

export async function loadBootstrapData() {
  const response = await fetch(`${apiBaseUrl}/api/bootstrap`)
  if (!response.ok) throw new Error(`Failed to load database data (${response.status})`)
  return fromApiPayload(await response.json())
}

export async function syncBootstrapData(data: BootstrapData) {
  const response = await fetch(`${apiBaseUrl}/api/bootstrap`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error(`Failed to sync database data (${response.status})`)
}
