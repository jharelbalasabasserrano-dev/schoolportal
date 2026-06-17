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
  | 'Change of Subject due to Conflict of Schedule'
  | 'Adding/Dropping of Subjects'
  | 'Other Registrar Request'
  | 'Supply Request'
  | 'Inventory Request'
  | 'Vacation Leave'
  | 'Mandatory/Forced Leave'
  | 'Sick Leave'
  | 'Maternity Leave'
  | 'Paternity Leave'
  | 'Special Privilege Leave'
  | 'Solo Parent Leave'
  | 'Study Leave'
  | '10-Day VAWC Leave'
  | 'Rehabilitation Privilege'
  | 'Special Leave Benefits for Women'
  | 'Special Emergency (Calamity) Leave'
  | 'Adoption Leave'
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
  major?: string
  transferReason?: string
  requestedDocs?: string[]
  claimReleaseDate?: string
  receivedBy?: string
  releasedBy?: string
  position?: string
  salary?: string
  workingDays?: number
  inclusiveDates?: string
  communication?: string
  leaveDetail?: string
  hrRemarks?: string
  updatedBy?: string
}

export type Message = {
  id: string
  requestId: string
  senderId: string
  senderName: string
  body: string
  sentAt: string
  attachment?: MessageAttachment
}

export type MessageAttachment = {
  dataUrl: string
  name: string
  size: number
  type: string
}

export const messageAttachmentCache = new Map<string, MessageAttachment>()

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


export const studentRequestKinds: RequestKind[] = ['TOR Request', 'COE Request', 'Exit Clearance', 'Certificate of Registration', 'Certificate of Grades', 'Certificate of Credit Units', 'Change of Subject due to Conflict of Schedule', 'Adding/Dropping of Subjects', 'Other Registrar Request', 'Facility Reservation']
export const documentKinds: RequestKind[] = ['TOR Request', 'COE Request', 'Exit Clearance', 'Certificate of Registration', 'Certificate of Grades', 'Certificate of Credit Units', 'Change of Subject due to Conflict of Schedule', 'Adding/Dropping of Subjects', 'Other Registrar Request']
export const leaveKinds: RequestKind[] = ['Vacation Leave', 'Mandatory/Forced Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Special Privilege Leave', 'Solo Parent Leave', 'Study Leave', '10-Day VAWC Leave', 'Rehabilitation Privilege', 'Special Leave Benefits for Women', 'Special Emergency (Calamity) Leave', 'Adoption Leave']
export const legacyLeaveKinds: RequestKind[] = ['Personal Leave', 'Official Leave']
export const allLeaveKinds: RequestKind[] = [...leaveKinds, ...legacyLeaveKinds]
export const storageKeys = {
  accounts: 'eduportal-accounts-v2',
  user: 'eduportal-user-v2',
  requests: 'eduportal-requests-v3',
  messages: 'eduportal-messages-v2',
  notifications: 'eduportal-notifications-v2',
  inventory: 'eduportal-inventory-v1',
  categories: 'eduportal-categories-v1',
  stockMovements: 'eduportal-stock-movements-v1',
  suppliers: 'eduportal-suppliers-v1',
}
export const facilities = [
  ['Room 301 - Main Building', 'Classroom'],
  ['Room 405 - Main Building', 'Classroom'],
  ['Computer Lab 4', 'Laboratory'],
  ['Chemistry Lab 2', 'Laboratory'],
  ['AVR 1 - Library Annex', 'Audio-Visual Room'],
  ['AVR 2 - Engineering Building', 'Audio-Visual Room'],
  ['Bonifacio Auditorium', 'Auditorium'],
]

export const initialUsers: User[] = []

export const initialRequests: PortalRequest[] = []

export const initialMessages: Message[] = []

export const initialInventory: SupplyItem[] = []

export const initialSuppliers: SupplierInfo[] = []

export const initialCategories: SupplyCategory[] = []

export const initialStockMovements: StockMovement[] = []

export const roleMeta: Record<Role, { label: string; portal: string }> = {
  student: { label: 'Student', portal: 'Student Portal' },
  registrar: { label: 'Registrar', portal: 'Registrar Office' },
  supply: { label: 'Supply Office', portal: 'Supply Portal' },
  adminOffice: { label: 'Admin Office', portal: 'Facilities Portal' },
  hr: { label: 'HR Office', portal: 'HR Portal' },
  employee: { label: 'Employee', portal: 'Employee Portal' },
  admin: { label: 'System Admin', portal: 'Admin Portal' },
}
