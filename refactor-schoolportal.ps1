$ErrorActionPreference = 'Stop'

$root = 'c:\Users\Hi\portal\frontend\School-Request-Management-Portal\School-Request-Management-Portal'
$file = Join-Path $root 'src\SchoolPortal.tsx'
$text = Get-Content -Raw -LiteralPath $file

$types = @'
export type Role = 'student' | 'registrar' | 'supply' | 'adminOffice' | 'hr' | 'employee' | 'admin'
export type Status = 'Pending' | 'Approved' | 'Rejected' | 'Completed'
export type Office = 'Registrar' | 'Supply Office' | 'Admin Office' | 'HR Office'

export type RequestKind =
  | 'TOR Request'
  | 'COE Request'
  | 'Exit Clearance'
  | 'Certificate of Registration'
  | 'Certificate of Grades'
  | 'Certificate of Credit Units'
  | 'Supply Request'
  | 'Inventory Request'
  | 'Vacation Leave'
  | 'Sick Leave'
  | 'Personal Leave'
  | 'Official Leave'
  | 'Facility Reservation'

export type User = {
  id: string
  name: string
  email: string
  password: string
  role: Role
  department: string
  avatarUrl?: string
}

export type PortalRequest = {
  id: string
  title: string
  kind: RequestKind
  ownerId: string
  owner: string
  office: Office
  status: Status
  date: string
  time: string
  remarks: string
  facility?: string
  attendees?: number
  purpose?: string
  facilityRemarks?: string
  studentId?: string
  yearLevel?: string
  semester?: string
  schoolYear?: string
  program?: string
  receivedBy?: string
  releasedBy?: string
  updatedBy?: string
}

export type ExitClearanceResponse = {
  id: string
  reference_number: string
  tracking_number: string
  status: Status
}

export type Message = {
  id: string
  requestId: string
  senderId: string
  senderName: string
  body: string
  sentAt: string
}

export type SupplyItem = {
  id: string
  name: string
  quantity: number
  unit: string
  minThreshold: number
  location: string
  category: string
  cost?: number
  supplier?: string
  expiryDate?: string
  sku?: string
}

export type SupplyCategory = {
  id: string
  name: string
  color: string
}

export type StockMovement = {
  id: string
  itemId: string
  itemName: string
  type: 'Stock In' | 'Stock Out'
  quantity: number
  reason: string
  performedBy: string
  date: string
  previousQty?: number
  newQty?: number
}

export type SupplierInfo = {
  id: string
  name: string
  contact: string
  email: string
  leadTime: number
}

export type AuthContextValue = {
  accounts: User[]
  user: User | null
  addAccount: (account: Omit<User, 'id'>) => void
  deleteAccount: (id: string) => void
  updateAccount: (id: string, updates: Omit<User, 'id' | 'password'>) => void
  login: (email: string, password: string, remember: boolean) => boolean
  logout: () => void
  changePassword: (currentPassword: string, nextPassword: string) => boolean
  updateProfile: (updates: Pick<User, 'name' | 'department' | 'avatarUrl'>) => void
}

export type ActiveModal =
  | { type: 'viewRequest'; request: PortalRequest }
  | { type: 'decision'; request: PortalRequest; status: Status }
  | { type: 'users' }
  | null
'@
Set-Content -LiteralPath (Join-Path $root 'src\types\index.ts') -Value $types -NoNewline

$dataMatch = [regex]::Match($text, '(?s)const studentRequestKinds: RequestKind\[\].*?const roleMeta: Record<Role, \{ label: string; portal: string \}> = \{.*?\n\}')
if (-not $dataMatch.Success) { throw 'Could not find data block' }
$data = $dataMatch.Value
$data = $data -replace 'const ', 'export const '
$data = $data -replace 'export export ', 'export '
$data = "import type { Message, PortalRequest, RequestKind, Role, SupplierInfo, SupplyCategory, SupplyItem, StockMovement, User } from '../types'`r`n`r`n" + $data
Set-Content -LiteralPath (Join-Path $root 'src\utils\portalData.ts') -Value $data -NoNewline

$apiMatch = [regex]::Match($text, '(?s)async function submitExitClearanceRequest\(request: PortalRequest\): Promise<ExitClearanceResponse> \{.*?\n\}')
if (-not $apiMatch.Success) { throw 'Could not find API block' }
$api = $apiMatch.Value -replace '^async function', 'export async function'
$api = "import type { ExitClearanceResponse, PortalRequest } from '../types'`r`n`r`n" + $api
Set-Content -LiteralPath (Join-Path $root 'src\utils\api.ts') -Value $api -NoNewline

$helpersMatch = [regex]::Match($text, '(?s)const notificationItems = \[.*?\r?\n\}\r?\n\r?\nexport default function SchoolPortal')
if (-not $helpersMatch.Success) { throw 'Could not find helper block' }
$helpersBlock = $helpersMatch.Value -replace '\r?\nexport default function SchoolPortal$', ''
$helpers = $helpersBlock
$helpers = $helpers -replace 'const notificationItems =', 'export const notificationItems ='
$helpers = $helpers -replace '(?m)^function ', 'export function '
$helpers = "import { BadgeCheck, Bell, Building2, CalendarClock, CheckCircle2, Clock, FileText, Home, Info, Layers3, Megaphone, MessageSquare, PackageCheck, Save, ShieldCheck, User, UsersRound, XCircle } from 'lucide-react'`r`nimport type { PortalRequest, RequestKind, Role, Status, User as PortalUser } from '../types'`r`nimport { documentKinds, facilities, leaveKinds, studentRequestKinds } from './portalData'`r`n`r`n" + $helpers
$helpers = $helpers -replace 'getAdminStats\(requests: PortalRequest\[\], accounts: User\[\]\)', 'getAdminStats(requests: PortalRequest[], accounts: PortalUser[])'
Set-Content -LiteralPath (Join-Path $root 'src\utils\portalHelpers.ts') -Value $helpers -NoNewline

$imports = @'
import type { ActiveModal, AuthContextValue, Message, PortalRequest, RequestKind, Role, Status, StockMovement, SupplierInfo, SupplyCategory, SupplyItem, User } from './types'
import { initialCategories, initialInventory, initialMessages, initialRequests, initialStockMovements, initialSuppliers, initialUsers, roleMeta, storageKeys } from './utils/portalData'
import { submitExitClearanceRequest } from './utils/api'
import {
  formatDate,
  formatShortDate,
  getAdminActivityLogs,
  getAdminRequestType,
  getAdminStats,
  getAdminTypeRows,
  getAdminTypeTone,
  getAttendeeCount,
  getCounts,
  getCopiesForRequest,
  getDateDuration,
  getDocumentTitle,
  getEmployeeRequestDetails,
  getEmployeeRequestTitle,
  getEmployeeTypeTone,
  getFacilityPrintVenue,
  getFacilityReferenceNumber,
  getFacilityType,
  getInitials,
  getLeaveDateRange,
  getLeaveTypeLabel,
  getLeaveTypeRows,
  getNavItems,
  getRegistrarReferenceNumber,
  getRegistrarRequestLabel,
  getSupplyItems,
  getSystemAdminRequests,
  getTopFacilities,
  getVisibleRequests,
  hasFacilityConflict,
  isEmployeePortalRequest,
  isLeaveApplication,
  notificationItems,
  printFacilityBookingForm,
  printRegistrarRequestForm,
} from './utils/portalHelpers'
'@

$text = $text -replace "import \{ createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode \} from 'react'\r?\nimport \{ BrowserRouter, Navigate, Route, Routes, useNavigate \} from 'react-router-dom'", "import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'`r`nimport { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'`r`n$imports"
$text = [regex]::Replace($text, '(?s)\r?\ntype Role = .*?\r?\nconst AuthContext =', "`r`nconst AuthContext =", 1)
$text = [regex]::Replace($text, '(?s)\r?\nconst notificationItems = \[.*?\r?\nexport default function SchoolPortal', "`r`nexport default function SchoolPortal", 1)
Set-Content -LiteralPath $file -Value $text -NoNewline
