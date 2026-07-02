import { BadgeCheck, Bell, Building2, CalendarClock, CheckCircle2, Clock, FileText, Home, Info, Layers3, Megaphone, MessageSquare, PackageCheck, Save, ShieldCheck, User as UserIcon, UsersRound, XCircle } from 'lucide-react'
import ccdLogo from './assets/ccd-logo.png'
import { allLeaveKinds, documentKinds, facilities, messageAttachmentCache, studentRequestKinds, type Message, type MessageAttachment, type PortalRequest, type RequestKind, type Role, type User } from './portalData'

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
  { id: 'coe-rejected', kind: 'rejection', title: 'COE Request Rejected', body: 'Your COE request was rejected. Reason: please re-submit with correct semester indicated.', date: '3/4/2026, 5:46:00 PM', age: '90d ago', read: true, icon: XCircle, tone: 'bg-red-100 text-red-800' },
  { id: 'exam-schedule', kind: 'announcement', title: 'Final Exam Schedule Released', body: 'Check the academic calendar for the updated final examinations schedule.', date: '5/20/2026, 3:30:00 PM', age: '13d ago', read: true, icon: Megaphone, tone: 'bg-amber-100 text-amber-800' },
  { id: 'enrollment-reminder', kind: 'info', title: 'Reminder: Enrollment Period', body: 'Online enrollment for 1st Semester AY 2026-2027 opens on June 22.', date: '5/29/2026, 11:00:00 PM', age: '3d ago', read: false, icon: Info, tone: 'bg-stone-100 text-stone-700' },
]

export function getNavItems(role: Role) {
  const student = [
    { label: 'Overview', icon: Home },
    { label: 'Request Document', icon: FileText },
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
  return list.filter((request) =>
    user.role === 'admin' ||
    (user.role === 'student' && request.ownerId === user.id && studentRequestKinds.includes(request.kind)) ||
    (user.role === 'employee' && request.ownerId === user.id) ||
    (user.role === 'registrar' && request.office === 'Registrar') ||
    (user.role === 'supply' && request.office === 'Supply Office') ||
    (user.role === 'adminOffice' && request.office === 'Admin Office') ||
    (user.role === 'hr' && request.office === 'HR Office')
  )
}

export function getCounts(list: PortalRequest[]) {
  return {
    Pending: list.filter((item) => item.status === 'Pending').length,
    Approved: list.filter((item) => item.status === 'Approved').length,
    Rejected: list.filter((item) => item.status === 'Rejected').length,
    Completed: list.filter((item) => item.status === 'Completed').length,
  }
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
    if (request.kind !== 'Facility Reservation' || request.facility !== facility || request.date !== date || request.status === 'Rejected') return false
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
  const programOptions = ['Bachelor of Early Childhood Education', 'Bachelor of Technical-Vocational Teacher Education', 'major in Heating, Ventilating, Airconditioning, and Refrigeration Technology', 'major in Computer Programming', 'Bachelor of Science in Entrepreneurship']
  const requestOptions = ['Certificate of Registration', 'Certificate of Enrollment', 'Certificate of Grades', 'Certificate of Credit Units', 'Transcript of Records (TOR)', 'Change of Subject due to Conflict of Schedule', 'Adding/Dropping of Subjects', 'Other']
  const selectedPrograms = [request.program ?? '', request.major ?? '']
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
      ${programOptions.map((option) => `<div class="item">${check(selectedPrograms, option)} ${escapeHtml(option)}</div>`).join('')}
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
      <img class="logo" src="${ccdLogo}" alt="City College of Davao seal">
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
  const leaveTypes = getCivilServiceLeaveTypes()
  const check = (selected: string, option: string) => `<span class="box">${selected === option ? 'x' : ''}</span>`
  const checked = (value: boolean) => `<span class="box">${value ? 'x' : ''}</span>`
  const line = (value = '', label = '') => `<div class="line-row ${label ? '' : 'line-row-full'}">${label ? `<span>${escapeHtml(label)}</span>` : ''}<span class="line">${escapeHtml(value)}</span></div>`
  const leaveType = getCivilServiceLeaveLabel(request.kind)
  const recommendation = request.status === 'Rejected' ? 'For disapproval' : request.status === 'Pending' ? '' : 'For approval'
  const workingDays = String(request.workingDays ?? getDateDuration(request.date, request.time))
  const inclusiveDates = request.inclusiveDates ?? getLeaveDateRange(request)
  const leaveDetail = request.leaveDetail ?? ''
  const leaveCreditRows = [
    ['Total Earned', request.vacationLeaveTotalEarned ?? '', request.sickLeaveTotalEarned ?? ''],
    ['Less this application', request.vacationLeaveLess ?? '', request.sickLeaveLess ?? ''],
    ['Balance', request.vacationLeaveBalance ?? '', request.sickLeaveBalance ?? ''],
  ]

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(getLeaveReferenceNumber(request))}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body { background: #e2e8f0; padding: 8px; font-family: "Times New Roman", Times, serif; color: #000; font-size: 8.2px; line-height: 1.04; }
    .sheet { width: 186mm; min-height: 273mm; margin: 0 auto; overflow: hidden; background: #fff; box-shadow: 0 12px 24px rgba(15, 23, 42, .16); page-break-inside: avoid; }
    .inner { height: 273mm; padding: 0; display: flex; flex-direction: column; }
    .form-heading { position: relative; height: 28mm; border: 1px solid #000; border-bottom: 0; padding: 2mm; }
    .form-label { position: absolute; left: 2mm; top: 2mm; font-size: 9px; font-weight: 700; line-height: 1.15; }
    .logo { position: absolute; left: 48mm; top: 3mm; width: 14mm; height: 14mm; object-fit: contain; border-radius: 999px; }
    .title-block { position: absolute; left: 50%; top: 3mm; width: 90mm; transform: translateX(-50%); text-align: center; }
    .republic, .city { font-size: 9.5px; font-weight: 700; }
    .government { margin-top: .9mm; font-size: 10px; font-weight: 700; }
    h1 { margin: 4mm 0 0; text-align: center; font-size: 15px; font-weight: 900; text-decoration: underline; text-underline-offset: 2px; }
    .received-wrap { position: absolute; right: 2mm; top: 2mm; width: 46mm; }
    .received-box { height: 20mm; border: 1.5px solid #000; padding: 1mm 1.5mm; background: white; }
    .received-org { text-align: center; font-size: 7.6px; font-weight: 900; line-height: 1.1; }
    .received-title { margin-top: 1mm; text-align: center; font-size: 12px; font-weight: 900; line-height: 1; letter-spacing: 2.5px; }
    .stamp-lines { margin-top: 1.1mm; }
    .stamp-line { display: grid; grid-template-columns: 7mm 1fr; align-items: end; gap: 1mm; margin-top: .8mm; font-size: 7.4px; font-weight: 800; text-transform: uppercase; }
    .stamp-value { min-height: 3mm; border-bottom: 1px solid #000; font-size: 7.6px; font-weight: 400; text-transform: none; }
    .reference-row { display: grid; grid-template-columns: 20mm 1fr; align-items: end; gap: 1mm; margin-top: .8mm; white-space: nowrap; font-size: 7.8px; font-weight: 800; }
    .ref-line { border-bottom: 1px solid #000; font-family: monospace; text-align: center; }
    .content { flex: 1; display: flex; flex-direction: column; }
    .employee-info { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.6px; }
    .employee-info th, .employee-info td { border: 1px solid #000; height: 6mm; padding: .55mm 1mm; vertical-align: middle; }
    .employee-info th { text-align: left; font-weight: 900; text-transform: uppercase; }
    .employee-info td { height: 8mm; text-align: center; font-weight: 700; }
    .name-note { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: .6mm; font-size: 7px; font-weight: 400; }
    .section { border: 1px solid #000; border-top: 0; }
    .section-title { margin: 0; border-bottom: 1px solid #000; padding: .9mm 0; text-align: center; font-size: 9.5px; font-weight: 900; text-transform: uppercase; }
    .application-section { height: 112mm; }
    .application-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 76mm 30.8mm; height: calc(112mm - 5.2mm); }
    .action-section { height: 86mm; }
    .action-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 48mm 32.8mm; height: calc(86mm - 5.2mm); }
    .cell { padding: 1.15mm 1.8mm; min-width: 0; }
    .grid-right { border-left: 1px solid #000; }
    .grid-bottom { border-top: 1px solid #000; }
    .column { display: flex; flex-direction: column; height: 100%; }
    .subhead { margin: 0 0 1mm; font-weight: 900; text-transform: uppercase; }
    .block { margin-top: 2mm; }
    .leave-types { flex: 1; }
    .item { display: flex; align-items: flex-start; gap: 1.3mm; min-height: 2.85mm; margin: 0 0 .32mm; }
    .box { display: inline-flex; flex: 0 0 auto; width: 3mm; height: 3mm; align-items: center; justify-content: center; border: 1px solid #000; font-size: 7px; line-height: 1; }
    .italic { margin: 1mm 0 .6mm; font-style: italic; }
    .line-row { display: grid; grid-template-columns: 25mm 1fr; align-items: end; gap: 1.4mm; margin-top: .45mm; }
    .line-row-full { grid-template-columns: 1fr; margin-top: .85mm; }
    .line { min-height: 3.25mm; border-bottom: 1px solid #000; padding: 0 1mm; text-align: center; }
    .compact-line .line { min-height: 3.2mm; }
    .signature { margin-top: auto; padding-top: 2mm; text-align: center; }
    .signature .line { display: block; min-height: 4mm; border-bottom: 1px solid #000; font-weight: 700; }
    .signature p { margin: .8mm 0 0; }
    .credits-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 1.5mm; font-size: 8.3px; text-align: center; }
    .credits-table th, .credits-table td { border: 1px solid #000; height: 5.7mm; padding: .6mm; }
    .president-block { width: 82mm; margin: auto auto 0; padding-top: 2mm; text-align: center; }
    .president-signature-line { width: 66mm; height: 3.5mm; margin: 0 auto 1mm; border-bottom: 1px solid #000; }
    @media print {
      body { background: white; padding: 0; }
      .sheet { width: 100%; min-height: auto; box-shadow: none; }
      .inner { height: calc(297mm - 24mm); }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <div class="inner">
      <div class="form-heading">
        <div class="form-label">Civil Service Form No. 6<br>Revised 2020</div>
        <img class="logo" src="${ccdLogo}" alt="City College of Davao logo">
        <div class="title-block">
          <div class="republic">Republic of the Philippines</div>
          <div class="government">CITY GOVERNMENT OF DAVAO</div>
          <div class="city">DAVAO CITY</div>
          <h1>APPLICATION FOR LEAVE</h1>
        </div>
        <div class="received-wrap">
          <div class="received-box">
            <div class="received-org">CITY COLLEGE OF DAVAO</div>
            <div class="received-title">RECEIVED</div>
            <div class="stamp-lines">
              <div class="stamp-line"><span>Date:</span><span class="stamp-value">${escapeHtml(request.receivedDate ? formatDate(request.receivedDate) : '')}</span></div>
              <div class="stamp-line"><span>Time:</span><span class="stamp-value">${escapeHtml(request.receivedTime ?? '')}</span></div>
              <div class="stamp-line"><span>By:</span><span class="stamp-value">${escapeHtml(request.receivedBy ?? '')}</span></div>
            </div>
          </div>
          <div class="reference-row"><span>Reference No.:</span><span class="ref-line">${escapeHtml(getLeaveReferenceNumber(request))}</span></div>
        </div>
      </div>
      <div class="content">
        <table class="employee-info">
          <colgroup>
            <col style="width:23%">
            <col style="width:33%">
            <col style="width:16%">
            <col style="width:16%">
            <col style="width:12%">
          </colgroup>
          <thead>
            <tr>
              <th>1. Office/Department</th>
              <th>2. Name (Last, First, Middle)</th>
              <th>3. Date of Filing</th>
              <th>4. Position</th>
              <th>5. Salary</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(request.officeDepartment ?? 'CITY COLLEGE OF DAVAO')}</td>
              <td>${escapeHtml(request.owner)}<div class="name-note"><span>(Last)</span><span>(First)</span><span>(Middle)</span></div></td>
              <td>${escapeHtml(formatDate(request.filedDate ?? request.date))}</td>
              <td>${escapeHtml(request.position ?? '')}</td>
              <td>${escapeHtml(request.salary ?? '')}</td>
            </tr>
          </tbody>
        </table>
        <section class="section application-section">
          <p class="section-title">6. Details of Application</p>
          <div class="application-grid">
            <div class="cell column">
              <div class="leave-types">
                <p class="subhead">6.A Type of Leave to be Availed Of</p>
                ${leaveTypes.map((type) => `<div class="item">${check(leaveType, type)}<span>${escapeHtml(type)}</span></div>`).join('')}
                <div class="line-row compact-line"><span>Others:</span><span class="line">${escapeHtml(request.kind === 'Other Leave' ? request.customLeaveType?.trim() ?? '' : '')}</span></div>
              </div>
            </div>
            <div class="cell column grid-right">
              <div>
                <p class="subhead">6.B Details of Leave</p>
                <p class="italic">In case of Vacation/Special Privilege Leave:</p>
                <div class="item">${checked(/philippines/i.test(leaveDetail))}<span>Within the Philippines</span></div>
                ${line(leaveDetail, 'Specify')}
                <div class="item">${checked(/abroad/i.test(leaveDetail))}<span>Abroad</span></div>
                ${line(leaveDetail, 'Specify')}
                <p class="italic">In case of Sick Leave:</p>
                <div class="item">${checked(/hospital|in patient/i.test(leaveDetail))}<span>In Hospital</span></div>
                ${line(leaveDetail, 'Specify illness')}
                <div class="item">${checked(/out patient|outpatient/i.test(leaveDetail))}<span>Out Patient</span></div>
                ${line(leaveDetail, 'Specify illness')}
                <p class="italic">In case of Special Leave Benefits for Women:</p>
                ${line(leaveDetail, 'Specify illness')}
                <p class="italic">In case of Study Leave:</p>
                <div class="item">${checked(/master|degree/i.test(leaveDetail))}<span>Completion of Master's Degree</span></div>
                <div class="item">${checked(/bar|board/i.test(leaveDetail))}<span>BAR/Board Examination Review</span></div>
                <p class="italic">Other purpose:</p>
                <div class="item">${checked(/monetization/i.test(leaveDetail))}<span>Monetization of Leave Credits</span></div>
                <div class="item">${checked(/terminal/i.test(leaveDetail))}<span>Terminal Leave</span></div>
              </div>
            </div>
            <div class="cell column grid-bottom">
              <div class="block">
                <p class="subhead">6.C Number of Working Days Applied For</p>
                ${line(`${workingDays} day(s)`)}
                <p class="subhead" style="margin-top:1.6mm;">Inclusive Dates</p>
                ${line(inclusiveDates)}
                <p class="subhead" style="margin-top:1.6mm;">Leave Duration</p>
                ${line(request.leaveDuration ? getLeaveDurationText(request) : '')}
              </div>
            </div>
            <div class="cell column grid-right grid-bottom">
              <div class="block">
                <p class="subhead">6.D Communication</p>
                <div class="item">${check(request.communication ?? 'Not Requested', 'Requested')}<span>Requested</span></div>
                <div class="item">${check(request.communication ?? 'Not Requested', 'Not Requested')}<span>Not Requested</span></div>
              </div>
              <div class="signature"><span class="line">${escapeHtml(request.owner)}</span><p>Signature of Applicant</p></div>
            </div>
          </div>
        </section>
        <section class="section action-section">
          <p class="section-title">7. Details of Action on Application</p>
          <div class="action-grid">
            <div class="cell column">
              <p class="subhead">7.A Certification of Leave Credits</p>
              <table class="credits-table">
                <thead><tr><th></th><th>Vacation Leave</th><th>Sick Leave</th></tr></thead>
                <tbody>${leaveCreditRows.map(([label, vacation, sick]) => `<tr><td style="text-align:left;"><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(vacation)}</td><td>${escapeHtml(sick)}</td></tr>`).join('')}</tbody>
              </table>
              <div class="signature"><span class="line">${escapeHtml(request.receivedBy ?? '')}</span><p>Authorized Officer</p></div>
            </div>
            <div class="cell column grid-right">
              <p class="subhead">7.B Recommendation</p>
              <div class="item">${check(recommendation, 'For approval')}<span>For approval</span></div>
              <div class="item">${check(recommendation, 'For disapproval')}<span>For disapproval due to</span></div>
              ${line(request.status === 'Rejected' ? request.hrRemarks ?? request.remarks : '')}
              <div class="signature"><span class="line">${escapeHtml(request.updatedBy ?? '')}</span><p>Authorized Officer</p></div>
            </div>
            <div class="cell grid-bottom">
              <p class="subhead">7.C Approved For:</p>
              ${line(request.status === 'Approved' ? workingDays : '', 'days with pay')}
              ${line('', 'days without pay')}
              ${line('', 'others (Specify)')}
            </div>
            <div class="cell grid-right grid-bottom">
              <p class="subhead">7.D Disapproved Due To:</p>
              ${line(request.status === 'Rejected' ? request.hrRemarks ?? request.remarks : '')}
            </div>
          </div>
        </section>
        <div class="president-block">
          <p style="margin:.5mm 0 0;font-weight:800;">Wenefredo E. Cagape, EdD, PhD</p>
          <div class="president-signature-line">&nbsp;</div>
          <p style="margin:.5mm 0 0;">College President</p>
          <p style="margin:.5mm 0 0;">(Authorized Official)</p>
        </div>
      </div>
    </div>
  </main>
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
  return requests.filter((request) =>
    documentKinds.includes(request.kind) ||
    request.kind === 'Facility Reservation' ||
    ['Supply Request', 'Inventory Request'].includes(request.kind) ||
    isLeaveApplication(request)
  )
}

export function getAdminStats(requests: PortalRequest[], accounts: User[]) {
  const counts = getCounts(requests)
  const approvedLike = counts.Approved + counts.Completed
  return {
    pending: counts.Pending,
    approved: counts.Approved,
    rejected: counts.Rejected,
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
