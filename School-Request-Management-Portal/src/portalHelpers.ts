import { BadgeCheck, Bell, Building2, CalendarClock, CheckCircle2, Clock, FileText, Home, Info, Layers3, Megaphone, MessageSquare, PackageCheck, Save, ShieldCheck, User as UserIcon, UsersRound, XCircle } from 'lucide-react'
import ccdLogo from './assets/ccd-logo.png'
import davaocityseal from './assets/davao-city-seal.png'
import { academicProgramOptions, allLeaveKinds, documentKinds, facilities, facilityStatuses, hrLeaveStatuses, messageAttachmentCache, registrarStatuses, studentRequestKinds, supplyStatuses, type FacilityPortalRequest, type FacilityStatus, type HRLeavePortalRequest, type HRLeaveStatus, type Message, type MessageAttachment, type PortalRequest, type RegistrarPortalRequest, type RegistrarStatus, type RequestKind, type Role, type SupplyPortalRequest, type SupplyStatus, type User } from './portalData'

const legacyDisapprovedStatus = 'Re' + 'jected'
export type RequestModule = 'registrar' | 'hrLeave' | 'supply' | 'facility'
export type ModuleStatusMap = {
  registrar: RegistrarStatus
  hrLeave: HRLeaveStatus
  supply: SupplyStatus
  facility: FacilityStatus
}

export type NotificationItem = {
  id: string
  kind: string
  title: string
  body: string
  date: string
  age: string
  read: boolean
  icon: typeof CheckCircle2
  tone: string
}

export const notificationItems: NotificationItem[] = [
  { id: 'tor-approved', kind: 'approval', title: 'TOR Request Approved', body: 'Your TOR request (DR-2026-001) has been approved. Please pick it up at Registrar Window 3.', date: '5/15/2026, 6:11:00 PM', age: '18d ago', read: false, icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-900' },
  { id: 'facility-approved', kind: 'approval', title: 'Facility Reservation Approved', body: 'AVR 2 reservation on June 10 has been confirmed.', date: '5/26/2026, 5:00:00 PM', age: '7d ago', read: false, icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-900' },
  { id: 'coe-disapproved', kind: 'disapproval', title: 'COE Request Disapproved', body: 'Your COE request was disapproved. Reason: please re-submit with correct semester indicated.', date: '3/4/2026, 5:46:00 PM', age: '90d ago', read: true, icon: XCircle, tone: 'bg-red-100 text-red-800' },
  { id: 'exam-schedule', kind: 'announcement', title: 'Final Exam Schedule Released', body: 'Check the academic calendar for the updated final examinations schedule.', date: '5/20/2026, 3:30:00 PM', age: '13d ago', read: true, icon: Megaphone, tone: 'bg-amber-100 text-amber-800' },
  { id: 'enrollment-reminder', kind: 'info', title: 'Reminder: Enrollment Period', body: 'Online enrollment for 1st Semester AY 2026-2027 opens on June 22.', date: '5/29/2026, 11:00:00 PM', age: '3d ago', read: false, icon: Info, tone: 'bg-stone-100 text-stone-700' },
]

function normalizeOfficeValue(office: string) {
  const normalized = office.trim().toLowerCase()
  if (normalized === 'registrar' || normalized === 'registrar office') return 'Registrar'
  if (normalized === 'supply office' || normalized === 'supply') return 'Supply Office'
  if (normalized === 'admin office' || normalized === 'facilities office' || normalized === 'facility office') return 'Admin Office'
  if (normalized === 'hr office' || normalized === 'hr') return 'HR Office'
  return office
}

export function getNavItems(role: Role) {
  const student = [
    { label: 'Overview', icon: Home },
    { label: 'Request Form', icon: FileText },
    { label: 'Reserve Facility', icon: Building2 },
    { label: 'Room Availability', icon: CalendarClock },
    { label: 'My Requests', icon: PackageCheck },
    { label: 'Messages', icon: MessageSquare },
    { label: 'Notifications', icon: Bell },
    { label: 'Profile', icon: UserIcon },
  ]
  if (role === 'student') return student
  if (role === 'admin') return [
    { label: 'Overview', icon: Home },
    { label: 'Users', icon: UsersRound },
    { label: 'All Requests', icon: Layers3 },
    { label: 'Announcements', icon: Megaphone },
    { label: 'Reports', icon: Megaphone },
    { label: 'Activity Logs', icon: Clock },
    { label: 'Settings', icon: Save },
  ]
  if (role === 'registrar') return [
    { label: 'Overview', icon: Home },
    { label: 'TOR Requests', icon: FileText },
    { label: 'COE Requests', icon: BadgeCheck },
    { label: 'Exit Clearance', icon: ShieldCheck },
    { label: 'Messages', icon: MessageSquare },
    { label: 'Notifications', icon: Bell },
    { label: 'Announcements', icon: Megaphone },
  ]
  if (role === 'supply') return [
    { label: 'Overview', icon: Home },
    { label: 'Supply Requests', icon: PackageCheck },
    { label: 'Inventory', icon: Layers3 },
    { label: 'Categories', icon: Layers3 },
    { label: 'Stock Movements', icon: Clock },
    { label: 'Suppliers', icon: Building2 },
    { label: 'Reports', icon: Megaphone },
  ]
  if (role === 'adminOffice') return [
    { label: 'Overview', icon: Home },
    { label: 'Facility Reservations', icon: Building2 },
    { label: 'Room Availability', icon: CalendarClock },
    { label: 'Reports', icon: Layers3 },
  ]
  if (role === 'hr') return [
    { label: 'Overview', icon: Home },
    { label: 'Leave Applications', icon: CalendarClock },
    { label: 'Reports', icon: Layers3 },
  ]
  if (role === 'employee') return [
    { label: 'Overview', icon: Home },
    { label: 'File Leave', icon: CalendarClock },
    { label: 'Request Supplies', icon: PackageCheck },
    { label: 'Reserve Facility', icon: Building2 },
    { label: 'My Requests', icon: Layers3 },
    { label: 'Room Availability', icon: CalendarClock },
  ]
  return [{ label: 'Overview', icon: Home }, { label: 'My Requests', icon: PackageCheck }, { label: 'Messages', icon: MessageSquare }, { label: 'Notifications', icon: Bell }, { label: 'Profile', icon: UserIcon }]
}

export function getVisibleRequests(user: User, list: PortalRequest[]) {
  return sortRequestsNewestFirst(list.filter((request) =>
    user.role === 'admin' ||
    (user.role === 'student' && request.ownerId === user.id && studentRequestKinds.includes(request.kind)) ||
    (user.role === 'employee' && request.ownerId === user.id) ||
    (user.role === 'registrar' && request.office === 'Registrar') ||
    (user.role === 'supply' && request.office === 'Supply Office') ||
    (user.role === 'adminOffice' && request.office === 'Admin Office') ||
    (user.role === 'hr' && request.office === 'HR Office')
  ))
}

export function sortRequestsNewestFirst<T extends Pick<PortalRequest, 'date' | 'id' | 'time'> & { createdAt?: string }>(requests: T[]) {
  return [...requests].sort((a, b) => getRequestSortTime(b) - getRequestSortTime(a) || b.id.localeCompare(a.id))
}

function getRequestSortTime(request: Pick<PortalRequest, 'date' | 'time'> & { createdAt?: string }) {
  const candidates = [
    request.createdAt,
    /^\d{4}-\d{2}-\d{2}$/.test(request.date) ? `${request.date}T${request.time && !request.time.includes('-') ? request.time : '00:00'}` : request.date,
  ]
  for (const value of candidates) {
    if (!value) continue
    const timestamp = new Date(value).getTime()
    if (!Number.isNaN(timestamp)) return timestamp
  }
  return 0
}

export function getRequestModule(request: PortalRequest): RequestModule {
  if (request.office === 'Registrar') return 'registrar'
  if (request.office === 'HR Office') return 'hrLeave'
  if (request.office === 'Supply Office') return 'supply'
  return 'facility'
}

export function getModuleStatuses<M extends RequestModule>(module: M): readonly ModuleStatusMap[M][] {
  if (module === 'registrar') return registrarStatuses as readonly ModuleStatusMap[M][]
  if (module === 'hrLeave') return hrLeaveStatuses as readonly ModuleStatusMap[M][]
  if (module === 'supply') return supplyStatuses as readonly ModuleStatusMap[M][]
  return facilityStatuses as readonly ModuleStatusMap[M][]
}

export function getStatusCounts<T extends string>(list: { status: T }[], statuses: readonly T[]) {
  return Object.fromEntries(statuses.map((status) => [status, list.filter((item) => item.status === status).length])) as Record<T, number>
}

export function getCounts(list: PortalRequest[]) {
  const statuses = Array.from(new Set([...registrarStatuses, ...hrLeaveStatuses, ...supplyStatuses, ...facilityStatuses, ...list.map((request) => request.status)]))
  return getStatusCounts(list, statuses)
}

export function isRegistrarRequest(request: PortalRequest): request is RegistrarPortalRequest {
  return request.office === 'Registrar'
}

export function isSupplyRequest(request: PortalRequest): request is SupplyPortalRequest {
  return request.office === 'Supply Office'
}

export function isFacilityRequest(request: PortalRequest): request is FacilityPortalRequest {
  return request.kind === 'Facility Reservation'
}

export function isHRLeaveRequest(request: PortalRequest): request is HRLeavePortalRequest {
  return request.office === 'HR Office' && allLeaveKinds.includes(request.kind)
}

export function normalizeRequestStatus(request: PortalRequest): PortalRequest {
  const status = (request.status as string).trim()
  const normalizedRequest = { ...request, office: normalizeOfficeValue(request.office), status } as PortalRequest
  if (isRegistrarRequest(normalizedRequest)) {
    if (status === 'Approved') return { ...normalizedRequest, status: 'On Process' }
    if (status === 'Completed') return { ...normalizedRequest, status: 'Ready for Pick Up' }
    if (status === legacyDisapprovedStatus) return { ...normalizedRequest, status: 'Disapproved' }
  }
  if (isHRLeaveRequest(normalizedRequest) || isSupplyRequest(normalizedRequest) || isFacilityRequest(normalizedRequest)) {
    if (status === legacyDisapprovedStatus) return { ...normalizedRequest, status: 'Disapproved' } as PortalRequest
  }
  return normalizedRequest
}

export function getDocumentTitle(kind: RequestKind) {
  if (kind === 'TOR Request') return 'TOR'
  if (kind === 'COE Request') return 'COE'
  if (kind === 'Certificate of Registration') return 'Certificate of Registration'
  if (kind === 'Certificate of Grades') return 'Certificate of Grades'
  if (kind === 'Certificate of Credit Units') return 'Certificate of Credit Units'
  if (kind === 'Change of Subject due to Conflict of Schedule') return 'Change of Subject due to Conflict of Schedule'
  if (kind === 'Adding/Dropping of Subjects') return 'Adding/Dropping of Subjects'
  if (kind === 'Other Registrar Request') return 'Other'
  return 'Exit Clearance'
}

export function hasFacilityConflict(requests: PortalRequest[], date: string, time: string, facility: string) {
  const [start, end] = time.split('-')
  return requests.some((request) => {
    if (request.kind !== 'Facility Reservation' || request.facility !== facility || request.date !== date || request.status === 'Disapproved') return false
    const [reservedStart, reservedEnd] = request.time.split('-')
    return start < reservedEnd && end > reservedStart
  })
}

export function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

export function getCopiesForRequest(request: PortalRequest) {
  if (request.id === 'DR-2026-001') return 2
  if (request.id === 'DR-2026-004') return 3
  return 1
}

export function getSupplyItems(request: PortalRequest) {
  const items: Record<string, { label: string; quantity: number }[]> = {
    'SR-2026-301': [
      { label: 'Bond paper (A4, ream)', quantity: 5 },
      { label: 'Whiteboard marker set', quantity: 2 },
      { label: 'Printer ink cartridge (black)', quantity: 3 },
    ],
    'SR-2026-302': [
      { label: 'Extension cords (5m)', quantity: 4 },
      { label: 'USB flash drives (32GB)', quantity: 10 },
    ],
    'SR-2026-303': [
      { label: 'Sticky notes (3x3, pack)', quantity: 12 },
      { label: 'Manila folders', quantity: 20 },
    ],
  }
  return items[request.id] ?? [{ label: request.title, quantity: 1 }]
}

export function getFacilityType(facility?: string) {
  return facilities.find(([name]) => name === facility)?.[1] ?? (facility?.includes('Conference') ? 'Conference Room' : 'Facility')
}

export function getAttendeeCount(request: PortalRequest) {
  if (request.attendees) return request.attendees
  const attendees: Record<string, number> = {
    'FR-2026-101': 12,
    'FR-2026-102': 28,
    'FR-2026-103': 20,
    'FR-2026-104': 15,
  }
  return attendees[request.id] ?? 10
}

export function getFacilityReferenceNumber(request: PortalRequest) {
  return `FACILITY-${request.date.replaceAll('-', '')}-${request.id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`
}

export function getRegistrarReferenceNumber(request: PortalRequest) {
  return `REG-${request.date.replaceAll('-', '')}-${request.id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`
}

export function getExitClearanceReferenceNumber(request: PortalRequest) {
  return `EXIT-${request.date.replaceAll('-', '')}-${request.id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`
}

export function getLeaveReferenceNumber(request: PortalRequest) {
  return request.referenceNumber?.trim() || `LV-${request.date.slice(0, 4)}-${request.id.replace(/\D/g, '').slice(-6).padStart(6, '0')}`
}

export function createLeaveReferenceNumber(date = new Date()) {
  const year = date.getFullYear()
  const randomValues = new Uint32Array(1)
  const randomNumber = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(randomValues)[0]
    : Math.floor(Math.random() * 0xffffffff)
  const sequence = `${date.getTime().toString(36)}${randomNumber.toString(36)}`.toUpperCase()
  return `LV-${year}-${sequence}`
}

export function getRegistrarRequestLabel(kind: RequestKind) {
  if (kind === 'Certificate of Registration') return 'Certificate of Registration'
  if (kind === 'COE Request') return 'Certificate of Enrollment'
  if (kind === 'Certificate of Grades') return 'Certificate of Grades'
  if (kind === 'Certificate of Credit Units') return 'Certificate of Credit Units'
  if (kind === 'TOR Request') return 'Transcript of Records (TOR)'
  if (kind === 'Change of Subject due to Conflict of Schedule') return 'Change of Subject due to Conflict of Schedule'
  if (kind === 'Adding/Dropping of Subjects') return 'Adding/Dropping of Subjects'
  if (kind === 'Other Registrar Request') return 'Other'
  return getDocumentTitle(kind)
}

export function getFacilityPrintVenue(facility?: string) {
  const value = facility ?? ''
  if (value.includes('Library')) return 'Library'
  if (value.includes('AVR')) return 'AVR (EdTech Lab)'
  if (value.includes('Auditorium')) return 'Social Hall'
  if (value.includes('Room')) return 'Classroom'
  return 'Others'
}

export function printFacilityBookingForm(request: PortalRequest) {
  printHtmlDocument(getFacilityBookingPrintHtml(request))
}

export function printRegistrarRequestForm(request: PortalRequest) {
  printHtmlDocument(getRegistrarRequestPrintHtml(request))
}

export function printDocumentRequestForm(request: PortalRequest) {
  if (request.kind === 'Exit Clearance') printHtmlDocument(getExitClearancePrintHtml(request))
  else printRegistrarRequestForm(request)
}

export function printLeaveApplicationForm(request: PortalRequest) {
  printHtmlDocument(getLeaveApplicationPrintHtml(request))
}

export function printHtmlDocument(html: string) {
  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  frame.setAttribute('aria-hidden', 'true')
  document.body.appendChild(frame)

  const frameWindow = frame.contentWindow
  const frameDocument = frame.contentDocument ?? frameWindow?.document
  if (!frameWindow || !frameDocument) {
    document.body.removeChild(frame)
    return
  }

  frameDocument.open()
  frameDocument.write(html)
  frameDocument.close()

  window.setTimeout(() => {
    frameWindow.focus()
    frameWindow.print()
    window.setTimeout(() => {
      if (frame.parentNode) frame.parentNode.removeChild(frame)
    }, 500)
  }, 250)
}

export function printMessageAttachment(attachment: MessageAttachment) {
  const attachmentUrl = attachment.dataUrl || attachment.accessUrl || ''
  if (!attachmentUrl) return
  if (attachment.type.startsWith('image/')) {
    printHtmlDocument(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(attachment.name)}</title>
  <style>
    @page { margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", sans-serif; color: #0f172a; }
    h1 { margin: 0 0 14px; font-size: 16px; }
    img { display: block; max-width: 100%; max-height: calc(100vh - 50px); margin: 0 auto; object-fit: contain; }
  </style>
</head>
<body>
  <h1>${escapeHtml(attachment.name)}</h1>
  <img src="${attachmentUrl}" alt="${escapeHtml(attachment.name)}">
</body>
</html>`)
    return
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    window.alert('Please allow pop-ups so the attachment can open for printing.')
    return
  }

  const printableContent = attachment.type === 'application/pdf'
    ? `<embed src="${attachmentUrl}" type="application/pdf" class="document">`
    : `<div class="fallback">
        <p>This file type may not print directly in the browser.</p>
        <a href="${attachmentUrl}" download="${escapeHtml(attachment.name)}">Download ${escapeHtml(attachment.name)}</a>
      </div>`

  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(attachment.name)}</title>
  <style>
    html, body { margin: 0; min-height: 100%; font-family: "Segoe UI", sans-serif; color: #0f172a; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 16px; border-bottom: 1px solid #d9d3cc; }
    .toolbar strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    button, a { border: 0; border-radius: 6px; background: #228b22; color: white; cursor: pointer; font: inherit; font-weight: 700; padding: 9px 14px; text-decoration: none; }
    .document { display: block; width: 100%; height: calc(100vh - 58px); border: 0; }
    .fallback { padding: 32px; font-size: 18px; }
    @media print {
      .toolbar { display: none; }
      .document { height: 100vh; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>${escapeHtml(attachment.name)}</strong>
    <button onclick="window.print()">Print</button>
  </div>
  ${printableContent}
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 500)
    })
  </script>
</body>
</html>`)
  printWindow.document.close()
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function canPrintAttachment(attachment?: MessageAttachment) {
  if (!attachment) return false
  return attachment.type === 'application/pdf' || attachment.type.startsWith('image/')
}

export function getMessageAttachmentData(message: Message) {
  if (!message.attachment) return undefined
  if (message.attachment.dataUrl || message.attachment.storagePath || message.attachment.accessUrl) return message.attachment
  return messageAttachmentCache.get(message.id)
}

export function stripAttachmentDataForStorage(message: Message) {
  if (!message.attachment) return message
  return {
    ...message,
    attachment: {
      ...message.attachment,
      accessUrl: undefined,
      dataUrl: '',
    },
  }
}

export function getRegistrarRequestPrintHtml(request: PortalRequest) {
  const requestOptions = ['Certificate of Registration', 'Certificate of Enrollment', 'Certificate of Grades', 'Certificate of Credit Units', 'Transcript of Records (TOR)', 'Change of Subject due to Conflict of Schedule', 'Adding/Dropping of Subjects', 'Other']
  const check = (selected: string | string[], option: string) => `<span class="box">${(Array.isArray(selected) ? selected : [selected]).includes(option) ? 'x' : ''}</span>`

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(getRegistrarReferenceNumber(request))}</title>
  <style>
    @page { size: letter portrait; margin: 7mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e2e8f0; padding: 24px; font-family: "Segoe UI", "Times New Roman", serif; color: #0f172a; font-size: 13px; }
    .sheet { max-width: 8.5in; margin: 0 auto; background: white; padding: 24px 28px; box-shadow: 0 18px 35px rgba(15, 23, 42, .18); break-inside: avoid; page-break-inside: avoid; }
    .letterhead { position: relative; text-align: center; border-bottom: 2px solid #8b5a2b; padding: 0 115px 10px; }
    .ref { position: absolute; right: 0; top: 0; text-align: right; font-size: 9px; color: #1e6f5c; font-weight: 700; text-transform: uppercase; }
    .ref strong { display: block; margin-top: 3px; color: #1e3a3a; font-family: monospace; font-size: 11px; letter-spacing: .5px; }
    .logo { position: absolute; left: calc(50% - 205px); top: 0; width: 62px; height: 62px; object-fit: contain; border-radius: 999px; }
    .college { font-size: 20px; font-weight: 800; color: #1e3a3a; }
    .address { font-size: 11px; color: #2c5a6e; margin-top: 3px; }
    .office { margin-top: 7px; font-size: 15px; font-weight: 800; letter-spacing: 1px; }
    h1 { margin: 15px 0 16px; text-align: center; font-size: 20px; text-decoration: underline; text-underline-offset: 5px; }
    .row { display: flex; gap: 10px; align-items: baseline; margin-bottom: 9px; font-size: 13px; }
    .label { min-width: 150px; font-weight: 700; }
    .line { flex: 1; min-height: 21px; border-bottom: 1px solid #64748b; padding: 0 6px 2px; }
    .group { border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc; padding: 10px; margin: 10px 0; break-inside: avoid; page-break-inside: avoid; }
    .group-title { margin: 0 0 6px; font-weight: 800; color: #1e3a3a; }
    .item { display: flex; align-items: center; gap: 7px; margin: 5px 0; }
    .box { display: inline-flex; width: 13px; height: 13px; align-items: center; justify-content: center; border: 1px solid #334155; font-size: 10px; }
    .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 18px; break-inside: avoid; page-break-inside: avoid; }
    .sig-label { font-weight: 700; margin-bottom: 5px; }
    .sig-line { min-height: 25px; border-bottom: 1px solid #0f172a; padding: 0 6px 3px; }
    @media print { html, body { width: 100%; min-height: 0; } body { background: white; padding: 0; } .sheet { width: 100%; max-width: none; box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="letterhead">
      <div class="ref">Reference Number<strong>${escapeHtml(getRegistrarReferenceNumber(request))}</strong></div>
      <img class="logo" src="${ccdLogo}" alt="City College of Davao seal">
      <div class="college">CITY COLLEGE OF DAVAO</div>
      <div class="address">Km. 10 Catalanun Pequeno, Davao City</div>
      <div class="office">OFFICE OF THE REGISTRAR</div>
    </header>
    <h1>REQUEST FORM</h1>
    ${printRow('Date', formatDate(request.date))}
    ${printRow('Name', request.owner)}
    ${printRow('Student ID #', request.studentId ?? '')}
    ${printRow('Year Level', request.yearLevel ?? '')}
    ${printRow('Semester', request.semester ?? '')}
    ${printRow('School Year', request.schoolYear ?? '')}
    <section class="group">
      <p class="group-title">PROGRAM:</p>
      ${academicProgramOptions.map((option) => `<div class="item">${check(request.program ?? '', option)} ${escapeHtml(option)}</div>`).join('')}
    </section>
    <section class="group">
      <p class="group-title">Request for:</p>
      ${requestOptions.map((option) => `<div class="item">${check(getRegistrarRequestLabel(request.kind), option)} ${escapeHtml(option)}</div>`).join('')}
    </section>
    ${printRow('Purpose/Reason', request.remarks)}
    <section class="signatures">
      <div><p class="sig-label">Requested by:</p><p class="sig-line">${escapeHtml(request.owner)}</p></div>
      <div><p class="sig-label">Received by:</p><p class="sig-line">${escapeHtml(request.receivedBy ?? '')}</p></div>
      <div><p class="sig-label">Released by:</p><p class="sig-line">${escapeHtml(request.releasedBy ?? '')}</p></div>
    </section>
  </main>
</body>
</html>`
}

export function getExitClearancePrintHtml(request: PortalRequest) {
  const officeRows = getExitClearanceOffices().map((office) => `<tr><td>${escapeHtml(office)}</td><td></td><td></td></tr>`).join('')
  const docs = getExitClearanceDocumentOptions()
  const selectedDocs = request.requestedDocs ?? []
  const check = (option: string) => `<span class="box">${selectedDocs.includes(option) ? 'x' : ''}</span>`

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(getExitClearanceReferenceNumber(request))}</title>
  <style>
    @page { size: letter portrait; margin: 6mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e2e8f0; padding: 24px; font-family: "Segoe UI", "Times New Roman", serif; color: #0f172a; font-size: 10px; }
    .sheet { max-width: 8.5in; margin: 0 auto; background: white; padding: 20px 24px; box-shadow: 0 18px 35px rgba(15, 23, 42, .18); break-inside: avoid; page-break-inside: avoid; }
    .letterhead { position: relative; text-align: center; border-bottom: 1.5px solid #8b5a2b; padding: 0 105px 7px; }
    .ref { position: absolute; right: 0; top: 0; text-align: right; font-size: 8px; color: #1e6f5c; font-weight: 700; text-transform: uppercase; }
    .ref strong { display: block; margin-top: 2px; color: #1e3a3a; font-family: monospace; font-size: 9px; letter-spacing: .3px; }
    .logo { position: absolute; left: calc(50% - 185px); top: 0; width: 52px; height: 52px; object-fit: contain; border-radius: 999px; }
    .republic { font-size: 11px; font-weight: 700; letter-spacing: .6px; }
    .college { font-size: 18px; font-weight: 800; color: #1e3a3a; }
    .address { font-size: 10px; color: #2c5a6e; }
    h1 { margin: 11px 0 12px; text-align: center; font-size: 17px; text-decoration: underline; text-underline-offset: 4px; }
    .row { display: flex; gap: 8px; align-items: baseline; margin-bottom: 5px; font-size: 10px; }
    .label { min-width: 165px; font-weight: 700; }
    .line { flex: 1; min-height: 16px; border-bottom: 1px solid #64748b; padding: 0 5px 1px; }
    table { width: 100%; border-collapse: collapse; margin: 7px 0; font-size: 9px; }
    th, td { border: 1px solid #9ca3af; padding: 3px 5px; text-align: left; vertical-align: top; height: 20px; }
    th { background: #f1f5f9; font-weight: 800; }
    .group { border: 1px solid #cbd5e1; border-radius: 5px; background: #f8fafc; padding: 6px; margin: 6px 0; break-inside: avoid; page-break-inside: avoid; }
    .group-title { margin: 0 0 4px; font-weight: 800; color: #1e3a3a; }
    .doc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 14px; }
    .item { display: flex; align-items: center; gap: 5px; line-height: 1.15; }
    .box { display: inline-flex; flex: 0 0 auto; width: 10px; height: 10px; align-items: center; justify-content: center; border: 1px solid #334155; font-size: 7px; }
    .privacy { margin: 7px 0; padding: 6px 8px; border-left: 3px solid #b68b40; background: #fef9e6; font-size: 8px; text-align: justify; line-height: 1.25; }
    .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 8px; break-inside: avoid; page-break-inside: avoid; }
    .sig-label { font-weight: 700; margin: 0 0 4px; }
    .sig-line { min-height: 19px; border-bottom: 1px solid #0f172a; padding: 0 5px 2px; margin: 0; }
    .claim { margin-top: 12px; border-top: 1.5px dashed #2c5a6e; padding-top: 9px; break-inside: avoid; page-break-inside: avoid; }
    .claim h2 { margin: 0 0 8px; text-align: center; font-size: 14px; }
    .footer { margin-top: 9px; border-top: 1px solid #ddd; padding-top: 6px; text-align: center; font-size: 8px; color: #4a6272; }
    @media print { html, body { width: 100%; min-height: 0; } body { background: white; padding: 0; } .sheet { width: 100%; max-width: none; box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="letterhead">
      <div class="ref">Reference Number<strong>${escapeHtml(getExitClearanceReferenceNumber(request))}</strong></div>
      <img class="logo" src="${davaocityseal}" alt="City College of Davao seal">
      <div class="republic">Republic of the Philippines</div>
      <div class="college">City College of Davao</div>
      <div class="address">Km. 10 Catalanun Pequeno, Davao City</div>
    </header>
    <h1>Exit Clearance and Request Form</h1>
    ${printRow('Name of Student', request.owner)}
    ${printRow('ID Number', request.studentId ?? '')}
    ${printRow('Program', formatProgramWithMajor(request))}
    ${printRow('Year Level', request.yearLevel ?? '')}
    ${printRow('Academic Year Last Attended', request.schoolYear ?? '')}
    ${printRow('Semester', request.semester ?? '')}
    <table>
      <thead><tr><th>Office</th><th style="width:30%">Signature</th><th style="width:25%">Date</th></tr></thead>
      <tbody>${officeRows}</tbody>
    </table>
    ${printRow('Reason for transfer', request.transferReason ?? '')}
    <section class="group">
      <p class="group-title">Request for:</p>
      <div class="doc-grid">${docs.map((doc) => `<div class="item">${check(doc)} ${escapeHtml(doc)}</div>`).join('')}</div>
    </section>
    ${printRow('Purpose', request.remarks)}
    <div class="privacy">
      In compliance with Republic Act No. 10173, also known as the Data Privacy Act of 2012, the City College of Davao (CCD) is committed to protect the privacy and personal information of its employees, stakeholders, and students. The institution ensures the confidentiality, integrity, and availability of personal data that it collects, stores, and processes.
      <br><br>
      By signing below, I hereby give my consent and recognize the authority of City College of Davao (CCD), in the pursuit of its legitimate interest and functions as an educational institution, to collect, process, record, organize, update, retrieve, and use my personal data as part of my personal information in relation to my pre-admission, enrollment, and other legitimate activities of the school.
    </div>
    <section class="signatures">
      <div><p class="sig-label">Name and Signature of Student</p><p class="sig-line">${escapeHtml(request.owner)}</p></div>
      <div><p class="sig-label">Date</p><p class="sig-line">${escapeHtml(formatDate(request.date))}</p></div>
    </section>
    <section class="claim">
      <h2>CLAIM SLIP</h2>
      ${printRow('Date', formatDate(request.date))}
      ${printRow('Name of Student', request.owner)}
      ${printRow('Claim requested document/s on', request.claimReleaseDate ?? '')}
      <section class="signatures">
        <div><p class="sig-label">Received by</p><p class="sig-line">${escapeHtml(request.receivedBy ?? '')}</p></div>
        <div><p class="sig-label">Released by</p><p class="sig-line">${escapeHtml(request.releasedBy ?? '')}</p></div>
      </section>
    </section>
    <div class="footer">City College of Davao | Km. 10 Catalanun Pequeno, Davao City<br>(082)241-7380 loc. 104 | ccdregistrar@gmail.com</div>
  </main>
</body>
</html>`
}

export function getLeaveApplicationPrintHtml(request: PortalRequest) {
  const leaveTypes = getCivilServiceLeaveTypes().filter((type) => type !== 'Others')
  const checkClass = (value: boolean) => value ? 'box checked' : 'box'
  const checked = (value: boolean) => `<span class="${checkClass(value)}"></span>`
  const fitClass = (value = '') => value.length > 46 ? ' fit-xs' : value.length > 28 ? ' fit-sm' : ''
  const field = (value = '', className = 'value-line') => `<span class="${className}${fitClass(value)}">${escapeHtml(value)}</span>`
  const blank = (value = '') => `<span class="others-blank${fitClass(value)}">${escapeHtml(value)}</span>`
  const refNumber = getLeaveReferenceNumber(request)
  const leaveType = getCivilServiceLeaveLabel(request.kind)
  const recommendation = request.leaveRecommendation ?? (isLeaveDisapproved(request) ? 'For disapproval' : request.status === 'Pending' ? '' : 'For approval')
  const workingDays = String(request.workingDays ?? getDateDuration(request.date, request.time))
  const inclusiveDates = request.inclusiveDates ?? getLeaveDateRange(request)
  const leaveDetail = request.leaveDetail ?? ''
  const leaveVacationLocation = request.leaveVacationLocation ?? (/abroad/i.test(leaveDetail) ? 'Abroad' : /philippines/i.test(leaveDetail) ? 'Within the Philippines' : '')
  const leaveVacationSpecify = request.leaveVacationSpecify ?? leaveDetail
  const leaveSickLocation = request.leaveSickLocation ?? (/hospital|in patient/i.test(leaveDetail) ? 'In Hospital' : /out patient|outpatient/i.test(leaveDetail) ? 'Out Patient' : '')
  const leaveSickIllness = request.leaveSickIllness ?? leaveDetail
  const leaveWomenIllness = request.leaveWomenIllness ?? leaveDetail
  const leaveStudyPurpose = request.leaveStudyPurpose ?? (/master|degree/i.test(leaveDetail) ? 'Completion of Master\'s Degree' : /bar|board/i.test(leaveDetail) ? 'BAR/Board Examination Review' : '')
  const leaveOtherPurpose = request.leaveOtherPurpose ?? (/monetization/i.test(leaveDetail) ? 'Monetization of Leave Credits' : /terminal/i.test(leaveDetail) ? 'Terminal Leave' : '')
  const disapprovalText = request.disapprovedDueTo ?? (isLeaveDisapproved(request) ? request.hrRemarks ?? request.remarks : '')
  const approvedDaysWithPay = request.approvedDaysWithPay ?? (request.status === 'Approved' ? workingDays : '')
  const approvedDaysWithoutPay = request.approvedDaysWithoutPay ?? ''
  const approvedOther = request.approvedOther ?? ''
  const leaveCreditRows = [
    ['Total Earned', request.vacationLeaveTotalEarned ?? '', request.sickLeaveTotalEarned ?? ''],
    ['Less this application', request.vacationLeaveLess ?? '', request.sickLeaveLess ?? ''],
    ['Balance', request.vacationLeaveBalance ?? '', request.sickLeaveBalance ?? ''],
  ]
  const splitName = request.owner.includes(',')
    ? request.owner.split(',').map((part) => part.trim())
    : request.owner.trim().split(/\s+/)
  const lastName = request.owner.includes(',') ? splitName[0] ?? '' : splitName.length > 1 ? splitName[splitName.length - 1] : request.owner
  const firstName = request.owner.includes(',') ? splitName.slice(1).join(', ') : splitName.slice(0, -1).join(' ')
  const middleName = ''
  const isOtherLeave = request.kind === 'Other Leave'
  const otherLeaveText = isOtherLeave ? request.customLeaveType?.trim() ?? request.remarks : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(getLeaveReferenceNumber(request))}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    p { margin: 0; }
    html, body { margin: 0; padding: 0; background: #e9e9e9; font-family: Arial, Helvetica, sans-serif; color: #111; }
    body { display: flex; justify-content: center; padding: 14px 0 40px; }
    .sheet { width: 210mm; height: 297mm; overflow: hidden; background: #fff; padding: 7mm 9mm 7mm; box-shadow: 0 0 0 1px rgba(0,0,0,.08), 0 6px 24px rgba(0,0,0,.15); font-size: 8.8pt; line-height: 1.16; }
    .header { display: grid; grid-template-columns: 82px minmax(0, 1fr) 182px; align-items: start; margin-bottom: 5px; }
    .csc-no { font-size: 7.4pt; line-height: 1.18; padding-top: 2px; }
    .header-center { display: flex; align-items: center; justify-content: center; gap: 10px; padding-top: 1px; min-width: 0; }
    .seal { width: 58px; height: 58px; border-radius: 50%; flex-shrink: 0; object-fit: contain; }
    .header-text { text-align: center; }
    .republic { font-size: 9pt; font-weight: 400; }
    .city-gov { font-size: 10pt; font-weight: 700; margin: 1px 0; }
    .davao-city { font-size: 9.2pt; font-weight: 700; }
    .form-title { font-size: 17.2pt; font-weight: 700; margin-top: 3px; white-space: nowrap; }
    .received-wrap { display: flex; flex-direction: column; }
    .received-box { border: 1.2px solid #000; padding: 4px 6px 5px; font-size: 7pt; line-height: 1.25; margin-top: 1px; }
    .received-box .rb-title { font-size: 6.6pt; font-weight: 700; text-align: center; margin-bottom: 2px; }
    .received-box .rb-strong { font-weight: 700; text-align: center; letter-spacing: .16em; font-size: 7.2pt; margin-bottom: 4px; }
    .rb-row { display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: 4px; align-items: end; margin-bottom: 2px; }
    .rb-row span.lbl { white-space: nowrap; }
    .rb-line, .value-line { border-bottom: 1px solid #000; min-height: 10px; padding: 0 2px; overflow-wrap: anywhere; word-break: break-word; }
    .ref-line { font-size: 6.8pt; line-height: 1.05; min-height: 13px; }
    .fit-sm { font-size: 7.4pt; line-height: 1.08; }
    .fit-xs { font-size: 6.6pt; line-height: 1.05; }
    table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.main td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
    .cell-label { font-size: 8pt; font-weight: 600; }
    .field-row { margin-top: 10px; }
    table.subrow { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.subrow td { border: none; padding: 6px 6px; vertical-align: baseline; white-space: nowrap; }
    .fl-inline { display: inline-block; border-bottom: 1px solid #000; width: 58%; margin-left: 4px; min-height: 10px; vertical-align: bottom; padding: 0 2px; white-space: normal; overflow-wrap: anywhere; }
    table.namerow { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 4px; }
    table.namerow td { border: none; padding: 0 4px; text-align: center; vertical-align: bottom; }
    table.namerow .value-line { display: block; text-align: center; }
    table.namerow span.sub { font-size: 7pt; color: #333; }
    .section-header { text-align: center; font-weight: 700; font-size: 8.8pt; background: #fff; padding: 2px 5px !important; }
    ul.chk { list-style: none; margin: 2px 0 0; padding: 0; }
    ul.chk li { display: flex; align-items: flex-start; gap: 4px; margin-bottom: 1.6px; font-size: 7.7pt; line-height: 1.12; overflow-wrap: anywhere; }
    ul.chk li .box { flex-shrink: 0; width: 8.8px; height: 8.8px; border: 1px solid #000; margin-top: 1px; }
    ul.chk li .box.checked::after, .box.checked::after { content: "x"; display: block; font-size: 7.2px; line-height: 7.2px; text-align: center; font-weight: 700; }
    .subhead { font-size: 7.8pt; font-style: italic; margin: 4px 0 1px; }
    .others-line { margin-top: 4px; font-size: 7.8pt; }
    .others-blank { border-bottom: 1px solid #000; display: block; min-height: 12px; margin-top: 4px; padding: 0 2px; overflow-wrap: anywhere; word-break: break-word; }
    .inline-field { display: flex; align-items: baseline; gap: 4px; font-size: 7.8pt; margin-top: 3px; }
    .inline-field .fl { flex: 1; border-bottom: 1px solid #000; min-height: 10px; padding: 0 2px; overflow-wrap: anywhere; }
    .fill-line { display: inline-block; border-bottom: 1px solid #000; min-width: 50px; margin-left: 3px; padding: 0 2px; overflow-wrap: anywhere; }
    .signature-space { margin-top: 18px; text-align: center; font-size: 7.8pt; }
    .signature-line { border-bottom: 1px solid #000; min-height: 14px; margin-bottom: 2px; padding: 0 2px; overflow-wrap: anywhere; }
    table.credits { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 7.5pt; }
    table.credits td, table.credits th { border: 1px solid #000; padding: 2px 4px; text-align: center; }
    table.credits th { font-weight: 600; font-size: 7.2pt; }
    table.credits td.rowlabel { text-align: left; font-style: italic; }
    .as-of { display: flex; align-items: baseline; gap: 4px; font-size: 7.8pt; margin: 6px 0 3px; }
    .as-of .fl { flex: 1; border-bottom: 1px solid #000; min-height: 10px; }
    .recommend-line { display: flex; align-items: baseline; gap: 4px; font-size: 7.8pt; margin: 4px 0 1px; }
    .recommend-line .fl { flex: 1; border-bottom: 1px solid #000; min-height: 10px; padding: 0 2px; overflow-wrap: anywhere; }
    .authofficer { margin-top: 22px; text-align: center; font-size: 7.8pt; }
    .approved-row { font-size: 7.8pt; margin-bottom: 4px; display: flex; align-items: baseline; gap: 5px; }
    .approved-row .fl { width: 54px; border-bottom: 1px solid #000; min-height: 10px; text-align: center; padding: 0 2px; }
    .disapproved-lines { margin-top: 4px; }
    .disapproved-lines .fl { border-bottom: 1px solid #000; min-height: 13px; margin-bottom: 4px; padding: 0 2px; overflow-wrap: anywhere; }
    .president-block { text-align: center; margin-top: 16px; }
    .president-name { font-weight: 700; font-size: 8.8pt; }
    .president-title { font-size: 8pt; margin-top: 1px; }
    .president-sig { border-bottom: 1px solid #000; width: 230px; height: 16px; margin: 5px auto 2px; }
    .president-caption { font-size: 7.2pt; text-align: center; }
    @media screen and (max-width: 900px) { body { padding: 8px 0 24px; } .sheet { transform: scale(.72); transform-origin: top center; margin-bottom: -82mm; } }
    @media print { html, body { width: 210mm; height: 297mm; background: #fff; padding: 0; overflow: hidden; } .sheet { box-shadow: none; page-break-after: avoid; page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="sheet" id="leaveForm">
    <div class="header">
      <div class="csc-no">Civil Service Form No. 6<br>Revised 2020</div>
      <div class="header-center">
        <img class="seal" src="${davaocityseal}" alt="Davao City seal">
        <div class="header-text">
          <div class="republic">Republic of the Philippines</div>
          <div class="city-gov">CITY GOVERNMENT OF DAVAO</div>
          <div class="davao-city">DAVAO CITY</div>
          <div class="form-title">APPLICATION FOR LEAVE</div>
        </div>
      </div>
      <div class="received-wrap">
        <div class="received-box">
          <div class="rb-title">CITY COLLEGE OF DAVAO</div>
          <div class="rb-strong">R E C E I V E D</div>
          <div class="rb-row"><span class="lbl">Received Date:</span><span class="rb-line">${escapeHtml(request.receivedDate ? formatDate(request.receivedDate) : '')}</span></div>
          <div class="rb-row"><span class="lbl">Received Time:</span><span class="rb-line">${escapeHtml(request.receivedTime ?? '')}</span></div>
          <div class="rb-row"><span class="lbl">Received By:</span><span class="rb-line">${escapeHtml(request.receivedBy ?? '')}</span></div>
        </div>
        <div class="rb-row" style="margin-top:3px;"><span class="lbl">Ref. No:</span><span class="rb-line ref-line ${fitClass(refNumber).trim()}">${escapeHtml(refNumber)}</span></div>
      </div>
    </div>
    <table class="main">
      <tr>
        <td style="width:38%; border-right:none;">
          <div class="cell-label">1. OFFICE/DEPARTMENT</div>
          <div class="field-row">${field(request.officeDepartment ?? 'CITY COLLEGE OF DAVAO')}</div>
        </td>
        <td style="width:62%; border-left:none;">
          <div class="cell-label">2. NAME:</div>
          <table class="namerow"><tr>
            <td>${field(lastName)}<br><span class="sub">(Last)</span></td>
            <td>${field(firstName)}<br><span class="sub">(First)</span></td>
            <td>${field(middleName)}<br><span class="sub">(Middle)</span></td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0;">
          <table class="subrow"><tr>
            <td style="width:33%;"><span class="cell-label">3. DATE OF FILING</span><span class="fl-inline">${escapeHtml(formatDate(request.filedDate ?? request.date))}</span></td>
            <td style="width:34%;"><span class="cell-label">4. POSITION</span><span class="fl-inline">${escapeHtml(request.position ?? '')}</span></td>
            <td style="width:33%;"><span class="cell-label">5. SALARY</span><span class="fl-inline">${escapeHtml(request.salary ?? '')}</span></td>
          </tr></table>
        </td>
      </tr>
      <tr><td colspan="2" class="section-header">6. DETAILS OF APPLICATION</td></tr>
      <tr>
        <td style="width:52%;">
          <div class="cell-label">6.A TYPE OF LEAVE TO BE AVAILED OF</div>
          <ul class="chk">
            ${leaveTypes.map((type) => `<li>${checked(leaveType === type)}<span>${escapeHtml(type)}</span></li>`).join('')}
            <li>${checked(false)}<span>Compensatory Time Off</span></li>
          </ul>
          <div class="others-line">Others:</div>
          ${blank(otherLeaveText)}
          ${blank('')}
        </td>
        <td style="width:48%;">
          <div class="cell-label">6.B DETAILS OF LEAVE</div>
          <div class="subhead">In case of Vacation/Special Privilege Leave:</div>
          <ul class="chk">
            <li>${checked(leaveVacationLocation === 'Within the Philippines')}<span>Within the Philippines <span class="fill-line" style="width:120px;">${escapeHtml(leaveVacationLocation === 'Within the Philippines' ? leaveVacationSpecify : '')}</span></span></li>
            <li>${checked(leaveVacationLocation === 'Abroad')}<span>Abroad (Specify) <span class="fill-line" style="width:120px;">${escapeHtml(leaveVacationLocation === 'Abroad' ? leaveVacationSpecify : '')}</span></span></li>
          </ul>
          <div class="subhead">In case of Sick Leave:</div>
          <ul class="chk">
            <li>${checked(leaveSickLocation === 'In Hospital')}<span>In Hospital (Specify Illness) <span class="fill-line" style="width:90px;">${escapeHtml(leaveSickLocation === 'In Hospital' ? leaveSickIllness : '')}</span></span></li>
            <li>${checked(leaveSickLocation === 'Out Patient')}<span>Out Patient (Specify Illness) <span class="fill-line" style="width:90px;">${escapeHtml(leaveSickLocation === 'Out Patient' ? leaveSickIllness : '')}</span></span></li>
          </ul>
          <div class="subhead">In case of Special Leave Benefits for Women:</div>
          <div class="inline-field">(Specify Illness) <span class="fl">${escapeHtml(leaveWomenIllness)}</span></div>
          <div class="subhead" style="margin-top:12px;">In case of Study Leave:</div>
          <ul class="chk">
            <li>${checked(leaveStudyPurpose === 'Completion of Master\'s Degree')}<span>Completion of Master's Degree</span></li>
            <li>${checked(leaveStudyPurpose === 'BAR/Board Examination Review')}<span>BAR/Board Examination Review</span></li>
          </ul>
          <div class="subhead" style="margin:4px 0 2px;">Other purpose:</div>
          <ul class="chk">
            <li>${checked(leaveOtherPurpose === 'Monetization of Leave Credits')}<span>Monetization of Leave Credits</span></li>
            <li>${checked(leaveOtherPurpose === 'Terminal Leave')}<span>Terminal Leave</span></li>
          </ul>
        </td>
      </tr>
      <tr>
        <td>
          <div class="cell-label">6.C NUMBER OF WORKING DAYS APPLIED FOR</div>
          ${blank(`${workingDays} day(s)`)}
          <div class="cell-label" style="margin-top:16px;">INCLUSIVE DATES</div>
          ${blank(inclusiveDates)}
        </td>
        <td>
          <div class="cell-label">6.D COMMUTATION</div>
          <ul class="chk" style="margin-top:8px;">
            <li>${checked((request.communication ?? 'Not Requested') === 'Not Requested')}<span>Not Requested</span></li>
            <li>${checked((request.communication ?? '') === 'Requested')}<span>Requested</span></li>
          </ul>
          <div class="signature-space"><div class="signature-line">${escapeHtml(request.owner)}</div>(Signature of Applicant)</div>
        </td>
      </tr>
      <tr><td colspan="2" class="section-header">7. DETAILS OF ACTION ON APPLICATION</td></tr>
      <tr>
        <td>
          <div class="cell-label">7.A CERTIFICATION OF LEAVE CREDITS</div>
          <div class="as-of" style="margin-top:10px;">As of <span class="fl">${escapeHtml(formatDate(new Date().toISOString().slice(0, 10)))}</span></div>
          <table class="credits">
            <tr><th></th><th>Vacation Leave</th><th>Sick Leave</th></tr>
            ${leaveCreditRows.map(([label, vacation, sick]) => `<tr><td class="rowlabel">${escapeHtml(label)}</td><td>${escapeHtml(vacation)}</td><td>${escapeHtml(sick)}</td></tr>`).join('')}
          </table>
          <div class="authofficer"><div class="signature-line">${escapeHtml(request.receivedBy ?? '')}</div>(Authorized Officer)</div>
        </td>
        <td>
          <div class="cell-label">7.B RECOMMENDATION</div>
          <ul class="chk" style="margin-top:10px;">
            <li>${checked(recommendation === 'For approval')}<span>For approval</span></li>
            <li>${checked(recommendation === 'For disapproval')}<span>For disapproval due to <span class="fill-line" style="width:110px;">${escapeHtml(recommendation === 'For disapproval' ? disapprovalText : '')}</span></span></li>
          </ul>
          <div class="recommend-line"><span class="fl">${escapeHtml(request.hrRemarks ?? '')}</span></div>
          <div class="recommend-line"><span class="fl"></span></div>
          <div class="recommend-line"><span class="fl"></span></div>
          <div class="authofficer"><div class="signature-line">${escapeHtml(request.updatedBy ?? '')}</div>(Authorized Officer)</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="cell-label">7.C APPROVED FOR</div>
          <div class="approved-row" style="margin-top:10px;"><span class="fl">${escapeHtml(approvedDaysWithPay)}</span> days with pay</div>
          <div class="approved-row"><span class="fl">${escapeHtml(approvedDaysWithoutPay)}</span> days without pay</div>
          <div class="approved-row"><span class="fl">${escapeHtml(approvedOther)}</span> others (Specify)</div>
        </td>
        <td>
          <div class="cell-label">7.D DISAPPROVED DUE TO:</div>
          <div class="disapproved-lines" style="margin-top:10px;">
            <div class="fl">${escapeHtml(disapprovalText)}</div>
            <div class="fl"></div>
            <div class="fl"></div>
          </div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border-top:none;">
          <div class="president-block">
            <div class="president-name">Wenefredo E. Cagape, EdD, PhD</div>
            <div class="president-title">College President</div>
            <div class="president-sig"></div>
            <div class="president-caption">(Authorized Official)</div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}

export function getCivilServiceLeaveLabel(kind: RequestKind) {
  const leaveType = getCivilServiceLeaveTypes().find((type) => type.startsWith(kind))
  if (leaveType) return leaveType
  if (kind === 'Wellness Leave') return 'Wellness Leave'
  if (kind === 'Other Leave') return 'Others'
  if (kind === 'Personal Leave') return 'Special Privilege Leave (Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)'
  if (kind === 'Official Leave') return 'Study Leave (Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292)'
  return ''
}

export function getCivilServiceLeaveTypes() {
  return [
    'Vacation Leave (Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    'Mandatory/Forced Leave (Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    'Sick Leave (Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    'Maternity Leave (R.A. No. 11210 / IRR issued by CSC, DOLE and SSS)',
    'Paternity Leave (R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended)',
    'Special Privilege Leave (Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    'Solo Parent Leave (R.A. No. 8972 / CSC MC No. 8, s. 2004)',
    'Study Leave (Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    '10-Day VAWC Leave (R.A. No. 9262 / CSC MC No. 15, s. 2005)',
    'Rehabilitation Privilege (Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    'Special Leave Benefits for Women (R.A. No. 9710 / CSC MC No. 25, s. 2010)',
    'Special Emergency (Calamity) Leave (CSC MC No. 2, s. 2012, as amended)',
    'Adoption Leave (R.A. No. 8552)',
    'Wellness Leave',
    'Others',
  ]
}

export function getExitClearanceOffices() {
  return [
    '1. Office of the Student Affairs (OSA)',
    '2. Clinic',
    '3. Guidance',
    '4. Library',
    '5. Laboratory: Speech Lab',
    '   Computer Lab',
    '   BTVTEd Lab',
    '6. Program Head',
  ]
}

export function getExitClearanceDocumentOptions() {
  return ['Transcript of Records (TOR)', 'Special Order (S.O)', 'CAV', 'Honorable Dismissal', 'Diploma', 'Good Moral Character', 'Authentication']
}

export function formatProgramWithMajor(request: PortalRequest) {
  return request.major ? `${request.program ?? ''} - ${request.major}` : request.program ?? ''
}

export function getFacilityBookingPrintHtml(request: PortalRequest) {
  const venueOptions = ['Library', 'AVR (EdTech Lab)', 'BOT Room', 'Covered Court', 'Open Field', 'Business Incubation Room', 'Social Hall', 'Classroom']
  const selectedVenue = getFacilityPrintVenue(request.facility)
  const purpose = request.purpose ?? request.remarks
  const checkbox = (venue: string) => `<span class="box">${selectedVenue === venue ? 'x' : ''}</span>`
  const otherValue = selectedVenue === 'Others' ? escapeHtml(request.facility ?? '') : ''

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(getFacilityReferenceNumber(request))}</title>
  <style>
    @page { size: letter portrait; margin: 7mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e2e8f0; padding: 24px; font-family: "Times New Roman", serif; color: #0f172a; font-size: 13px; }
    .sheet { max-width: 8.5in; margin: 0 auto; background: white; padding: 24px 28px; box-shadow: 0 18px 35px rgba(15, 23, 42, .18); break-inside: avoid; page-break-inside: avoid; }
    .letterhead { position: relative; text-align: center; border-bottom: 2px solid #8b5a2b; padding: 0 115px 10px; }
    .ref { position: absolute; right: 0; top: 0; text-align: right; font-size: 9px; color: #1e6f5c; font-weight: 700; text-transform: uppercase; }
    .ref strong { display: block; margin-top: 3px; color: #1e3a3a; font-family: monospace; font-size: 11px; letter-spacing: .5px; }
    .logo { position: absolute; left: calc(50% - 205px); top: 0; width: 62px; height: 42px; object-fit: contain; border-radius: 999px; }
    .college { font-size: 20px; font-weight: 800; color: #1e3a3a; }
    .address { font-size: 11px; color: #2c5a6e; margin-top: 3px; }
    h1 { margin: 17px 0 18px; text-align: center; font-size: 20px; text-decoration: underline; text-underline-offset: 5px; }
    .row { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; font-size: 13px; }
    .label { min-width: 190px; font-weight: 700; }
    .line { flex: 1; min-height: 21px; border-bottom: 1px solid #64748b; padding: 0 6px 2px; }
    .venue { border: 1px solid #cbd5e1; background: #f8fafc; padding: 10px; margin: 6px 0 11px; break-inside: avoid; page-break-inside: avoid; }
    .venue-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 18px; }
    .item { display: flex; align-items: center; gap: 7px; }
    .box { display: inline-flex; width: 13px; height: 13px; align-items: center; justify-content: center; border: 1px solid #334155; font-size: 10px; }
    .note { margin-top: 14px; padding: 9px; border-left: 4px solid #b68b40; background: #fef9e6; font-size: 11px; text-align: justify; }
    @media print { html, body { width: 100%; min-height: 0; } body { background: white; padding: 0; } .sheet { width: 100%; max-width: none; box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="letterhead">
      <div class="ref">Reference Number<strong>${escapeHtml(getFacilityReferenceNumber(request))}</strong></div>
      <img class="logo" src="${ccdLogo}" alt="City College of Davao seal">
      <div class="college">CITY COLLEGE OF DAVAO</div>
      <div class="address">Km. 10 Catalanun Pequeno, Davao City</div>
    </header>
    <h1>School Facility Booking Form</h1>
    ${printRow('Date', formatDate(request.date))}
    ${printRow('Student ID #', request.studentId ?? '')}
    ${printRow('Program', formatProgramWithMajor(request))}
    ${printRow('Semester', request.semester ?? '')}
    ${printRow('School Year', request.schoolYear ?? '')}
    ${printRow('Purpose/Objective', purpose)}
    ${printRow('Time', request.time.replace('-', ' - '))}
    <p class="label">Venue (pls check one):</p>
    <section class="venue">
      <div class="venue-grid">
        ${venueOptions.map((venue) => `<div class="item">${checkbox(venue)} ${escapeHtml(venue)}</div>`).join('')}
        <div class="item" style="grid-column: 1 / -1;">${checkbox('Others')} Others (pls specify): <span class="line">${otherValue}</span></div>
      </div>
    </section>
    ${printRow('Remarks (by the Facility-in-charge)', request.facilityRemarks ?? '')}
    ${printRow('Requested by', `${request.owner} / ${formatDate(request.date)}`)}
    ${printRow('Recommended by', '')}
    ${printRow('Approved by', request.status === 'Approved' || request.status === 'Completed' ? request.updatedBy ?? 'Admin Office' : '')}
    <div class="note">Note: Booking should be made within 3-14 days before the printed usage. Bookings made early or too late is discouraged.</div>
  </main>
</body>
</html>`
}

export function printRow(label: string, value: string) {
  return `<div class="row"><span class="label">${escapeHtml(label)}:</span><span class="line">${escapeHtml(value)}</span></div>`
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function getTopFacilities(requests: PortalRequest[]) {
  const totals = new Map<string, number>()
  requests.forEach((request) => {
    const facility = request.facility ?? request.title
    totals.set(facility, (totals.get(facility) ?? 0) + 1)
  })
  return [...totals.entries()]
    .map(([facility, count]) => ({ facility, count }))
    .sort((a, b) => b.count - a.count)
}

export function isLeaveApplication(request: PortalRequest) {
  return allLeaveKinds.includes(request.kind) && request.id.startsWith('LV-')
}

export function isLeaveDisapproved(request: PortalRequest) {
  return isLeaveApplication(request) && request.status === 'Disapproved'
}

export function getRequestStatusLabel(request: PortalRequest) {
  return request.status
}

export function normalizeLeaveStatus(request: PortalRequest): PortalRequest {
  return normalizeRequestStatus(request)
}

export function getLeaveStatusFilterValue(request: HRLeavePortalRequest): HRLeaveStatus {
  return request.status
}

export function getLeaveTypeLabel(kind: RequestKind, customLeaveType?: string) {
  if (kind === 'Other Leave' && customLeaveType?.trim()) return customLeaveType.trim()
  if (kind === 'Vacation Leave') return 'Vacation'
  if (kind === 'Mandatory/Forced Leave') return 'Mandatory/Forced'
  if (kind === 'Sick Leave') return 'Sick'
  if (kind === 'Maternity Leave') return 'Maternity'
  if (kind === 'Paternity Leave') return 'Paternity'
  if (kind === 'Special Privilege Leave' || kind === 'Personal Leave') return 'Special Privilege'
  if (kind === 'Solo Parent Leave') return 'Solo Parent'
  if (kind === 'Study Leave' || kind === 'Official Leave') return 'Study'
  if (kind === '10-Day VAWC Leave') return '10-Day VAWC'
  if (kind === 'Rehabilitation Privilege') return 'Rehabilitation'
  if (kind === 'Special Leave Benefits for Women') return 'Special Leave for Women'
  if (kind === 'Special Emergency (Calamity) Leave') return 'Calamity'
  if (kind === 'Adoption Leave') return 'Adoption'
  if (kind === 'Wellness Leave') return 'Wellness'
  if (kind === 'Other Leave') return 'Other'
  return 'Leave'
}

export function getLeaveTypeIcon(kind: RequestKind) {
  if (kind === 'Sick Leave' || kind === 'Rehabilitation Privilege') return Info
  if (kind === 'Maternity Leave' || kind === 'Paternity Leave' || kind === 'Solo Parent Leave' || kind === 'Adoption Leave') return UsersRound
  if (kind === 'Special Privilege Leave' || kind === '10-Day VAWC Leave' || kind === 'Special Leave Benefits for Women') return UserIcon
  if (kind === 'Study Leave' || kind === 'Official Leave' || kind === 'Wellness Leave') return PackageCheck
  return CalendarClock
}

export function getLeaveDurationText(request: PortalRequest) {
  const duration = request.leaveDuration ?? 'Full Day'
  if (duration !== 'Half Day') return duration
  return request.leaveTime?.trim() ? `${duration} - ${request.leaveTime.trim()}` : duration
}

export function getLeaveDateRange(request: PortalRequest) {
  const start = formatShortDate(request.date)
  const end = /^\d{4}-\d{2}-\d{2}$/.test(request.time) ? formatShortDate(request.time) : start
  const range = start === end ? start : `${start} - ${end}`
  return request.leaveDuration ? `${range} (${getLeaveDurationText(request)})` : range
}

export function getLeaveTypeRows(requests: PortalRequest[]) {
  const colors: Record<string, string> = {
    Vacation: 'bg-[#3a9276]',
    'Mandatory/Forced': 'bg-lime-600',
    Sick: 'bg-[#b94247]',
    Maternity: 'bg-pink-500',
    Paternity: 'bg-sky-600',
    'Special Privilege': 'bg-[#eba900]',
    'Solo Parent': 'bg-cyan-600',
    Study: 'bg-stone-400',
    '10-Day VAWC': 'bg-rose-600',
    Rehabilitation: 'bg-teal-600',
    'Special Leave for Women': 'bg-fuchsia-600',
    Calamity: 'bg-orange-600',
    Adoption: 'bg-violet-600',
    Wellness: 'bg-emerald-600',
  }
  const rows = new Map<string, { color: string; count: number; label: string }>()
  allLeaveKinds.forEach((kind) => {
    const label = getLeaveTypeLabel(kind)
    const current = rows.get(label) ?? { label, count: 0, color: colors[label] ?? 'bg-stone-400' }
    current.count += requests.filter((request) => request.kind === kind).length
    rows.set(label, current)
  })
  return [...rows.values()]
}

export function isEmployeePortalRequest(request: PortalRequest) {
  return request.ownerId === 'emp-01' && (
    request.kind === 'Supply Request' ||
    request.kind === 'Inventory Request' ||
    request.kind === 'Facility Reservation' ||
    isLeaveApplication(request)
  )
}

export function getEmployeeRequestType(request: PortalRequest) {
  if (request.kind === 'Facility Reservation') return 'Facility'
  if (allLeaveKinds.includes(request.kind)) return 'Leave'
  if (['Supply Request', 'Inventory Request'].includes(request.kind)) return 'Supply'
  return 'Request'
}

export function getEmployeeTypeTone(request: PortalRequest) {
  const type = getEmployeeRequestType(request)
  if (type === 'Facility') return 'bg-[#4cbb17]/15 text-[#228b22]'
  if (type === 'Leave') return 'bg-emerald-100 text-emerald-900'
  if (type === 'Supply') return 'bg-amber-100 text-amber-900'
  return 'bg-stone-100 text-stone-700'
}

export function getEmployeeRequestTitle(request: PortalRequest) {
  if (request.kind === 'Facility Reservation') return request.facility ?? request.title
  if (allLeaveKinds.includes(request.kind)) return getLeaveTypeLabel(request.kind, request.customLeaveType)
  if (['Supply Request', 'Inventory Request'].includes(request.kind)) return `${getSupplyItems(request).length} item(s)`
  return request.title
}

export function getEmployeeRequestDetails(request: PortalRequest) {
  if (request.kind === 'Facility Reservation') return `${request.date} - ${request.time}`
  if (allLeaveKinds.includes(request.kind)) return `${request.date} -> ${request.time}: ${request.remarks}`
  return request.remarks
}

export function getDateDuration(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime()
  const end = new Date(`${endDate}T00:00:00`).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1
  return Math.floor((end - start) / 86_400_000) + 1
}

export function getSystemAdminRequests(requests: PortalRequest[]) {
  return sortRequestsNewestFirst(requests.filter((request) =>
    documentKinds.includes(request.kind) ||
    request.kind === 'Facility Reservation' ||
    ['Supply Request', 'Inventory Request'].includes(request.kind) ||
    isLeaveApplication(request)
  ))
}

export function getAdminStats(requests: PortalRequest[], accounts: User[]) {
  const counts = getCounts(requests)
  const approvedLike = counts.Approved + counts.Completed
  return {
    pending: counts.Pending,
    approved: counts.Approved,
    disapproved: counts.Disapproved,
    completed: counts.Completed,
    documents: requests.filter((request) => documentKinds.includes(request.kind)).length,
    facilities: requests.filter((request) => request.kind === 'Facility Reservation').length,
    supplies: requests.filter((request) => ['Supply Request', 'Inventory Request'].includes(request.kind)).length,
    leaves: requests.filter((request) => isLeaveApplication(request)).length,
    users: accounts.length,
    approvalRate: requests.length ? Math.round((approvedLike / requests.length) * 100) : 0,
  }
}

export function getAdminRequestType(request: PortalRequest) {
  if (documentKinds.includes(request.kind)) return 'Document'
  if (request.kind === 'Facility Reservation') return 'Facility'
  if (['Supply Request', 'Inventory Request'].includes(request.kind)) return 'Supply'
  if (allLeaveKinds.includes(request.kind)) return 'Leave'
  return 'Request'
}

export function getAdminTypeTone(request: PortalRequest) {
  const type = getAdminRequestType(request)
  if (type === 'Document') return 'bg-[#4cbb17]/15 text-[#228b22]'
  if (type === 'Facility') return 'bg-emerald-100 text-emerald-900'
  if (type === 'Supply') return 'bg-amber-100 text-amber-900'
  if (type === 'Leave') return 'bg-stone-100 text-stone-700'
  return 'bg-slate-100 text-slate-700'
}

export function getAdminTypeRows(requests: PortalRequest[]) {
  const rows = [
    { label: 'Document', color: 'bg-[#b94247]' },
    { label: 'Facility', color: 'bg-[#3a9276]' },
    { label: 'Supply', color: 'bg-[#eba900]' },
    { label: 'Leave', color: 'bg-stone-400' },
  ]
  return rows.map((row) => ({
    ...row,
    count: requests.filter((request) => getAdminRequestType(request) === row.label).length,
  }))
}

export function getAdminActivityLogs(requests: PortalRequest[]) {
  return requests.flatMap((request) => {
    const type = getAdminRequestType(request)
    const submitted = {
      timestamp: getRequestActivityTimestamp(request),
      user: request.owner,
      action: 'submitted',
      target: `${type} request ${request.id}`,
    }
    if (!request.updatedBy || request.status === 'Pending') return [submitted]
    return [
      submitted,
      {
        timestamp: getRequestActivityTimestamp(request),
        user: 'Approver',
        action: request.status.toLowerCase(),
        target: `${type} request ${request.id}`,
      },
    ]
  }).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export function getRequestActivityTimestamp(request: PortalRequest) {
  const displayTime = request.id === 'FR-2026-102' ? '4:15:00 PM' : request.id === 'DR-2026-002' ? '10:02:00 PM' : request.time.includes('-') ? '7:00:00 PM' : '5:00:00 PM'
  return `${formatDate(request.date)}, ${displayTime}`
}
