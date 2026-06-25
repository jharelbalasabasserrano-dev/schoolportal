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
  | 'Other Leave'
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
  filedDate?: string
  officeDepartment?: string
  workingDays?: number
  inclusiveDates?: string
  communication?: string
  leaveDetail?: string
  vacationLeaveTotalEarned?: string
  vacationLeaveLess?: string
  vacationLeaveBalance?: string
  sickLeaveTotalEarned?: string
  sickLeaveLess?: string
  sickLeaveBalance?: string
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
  status?: 'Sent' | 'Delivered' | 'Read'
  readBy?: string[]
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

export type Announcement = {
  id: string
  title: string
  body: string
  audience?: 'all' | 'employee'
  authorId: string
  authorName: string
  authorRole: Role
  createdAt: string
}


export const studentRequestKinds: RequestKind[] = ['TOR Request', 'COE Request', 'Exit Clearance', 'Certificate of Registration', 'Certificate of Grades', 'Certificate of Credit Units', 'Change of Subject due to Conflict of Schedule', 'Adding/Dropping of Subjects', 'Other Registrar Request', 'Facility Reservation']
export const documentKinds: RequestKind[] = ['TOR Request', 'COE Request', 'Exit Clearance', 'Certificate of Registration', 'Certificate of Grades', 'Certificate of Credit Units', 'Change of Subject due to Conflict of Schedule', 'Adding/Dropping of Subjects', 'Other Registrar Request']
export const leaveKinds: RequestKind[] = ['Vacation Leave', 'Mandatory/Forced Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Special Privilege Leave', 'Solo Parent Leave', 'Study Leave', '10-Day VAWC Leave', 'Rehabilitation Privilege', 'Special Leave Benefits for Women', 'Special Emergency (Calamity) Leave', 'Adoption Leave', 'Other Leave']
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
  announcements: 'eduportal-announcements-v1',
}
export const facilities = [
  ['Room 301 - Main Building', 'Classroom'],
  ['Room 405 - Main Building', 'Classroom'],
  ['Computer Lab 4', 'Laboratory'],
  ['Chemistry Lab 2', 'Laboratory'],
  ['AVR 1 - Library Annex', 'Audio-Visual Room'],
  ['AVR 2 - Engineering Building', 'Audio-Visual Room'],
  ['Conference Room A', 'Conference Room'],
  ['Bonifacio Auditorium', 'Auditorium'],
]

export const initialUsers: User[] = [
  { id: 'stu-01', name: 'Maria Clara Santos', email: 'maria.santos@student.edu', password: 'password123', role: 'student', department: 'BS Computer Science - 3rd Year' },
  { id: 'reg-01', name: 'Atty. Ramon Villanueva', email: 'registrar@edu.portal', password: 'password123', role: 'registrar', department: 'Registrar Office' },
  { id: 'sup-01', name: 'Liza Mendoza', email: 'supply@edu.portal', password: 'password123', role: 'supply', department: 'Supply Office' },
  { id: 'fac-01', name: 'Facilities Office', email: 'facilities@edu.portal', password: 'password123', role: 'adminOffice', department: 'Admin Office' },
  { id: 'hr-01', name: 'HR Office', email: 'hr@edu.portal', password: 'password123', role: 'hr', department: 'HR Office' },
  { id: 'emp-01', name: 'Prof. Joseph Reyes', email: 'j.reyes@edu.portal', password: 'password123', role: 'employee', department: 'Senior High School' },
  { id: 'sys-01', name: 'Dr. Helena Cabrera', email: 'admin@edu.portal', password: 'password123', role: 'admin', department: 'ICT Office' },
]

export const initialRequests: PortalRequest[] = [
  { id: 'FR-2026-102', title: 'Computer Lab 4 reservation', kind: 'Facility Reservation', ownerId: 'stu-01', owner: 'Maria Clara Santos', office: 'Admin Office', status: 'Pending', date: '2026-06-18', time: '09:00-11:30', remarks: 'Thesis defense rehearsal', facility: 'Computer Lab 4' },
  { id: 'DR-2026-002', title: 'COE', kind: 'COE Request', ownerId: 'stu-01', owner: 'Maria Clara Santos', office: 'Registrar', status: 'Pending', date: '2026-05-28', time: '10:30', remarks: 'Scholarship renewal requirement' },
  { id: 'FR-2026-101', title: 'AVR 2 - Engineering Building', kind: 'Facility Reservation', ownerId: 'stu-01', owner: 'Maria Clara Santos', office: 'Admin Office', status: 'Approved', date: '2026-06-10', time: '13:00-15:00', remarks: 'Thesis presentation dry run', facility: 'AVR 2 - Engineering Building', updatedBy: 'Facilities Office' },
  { id: 'FR-2026-103', title: 'AVR 2 - Engineering Building', kind: 'Facility Reservation', ownerId: 'stu-02', owner: 'Other Student', office: 'Admin Office', status: 'Approved', date: '2026-06-10', time: '10:00-12:00', remarks: 'Student organization seminar', facility: 'AVR 2 - Engineering Building', updatedBy: 'Facilities Office' },
  { id: 'FR-2026-104', title: 'Conference Room A', kind: 'Facility Reservation', ownerId: 'emp-01', owner: 'Prof. Joseph Reyes', office: 'Admin Office', status: 'Approved', date: '2026-06-15', time: '14:00-16:00', remarks: 'Department curriculum planning', facility: 'Conference Room A', updatedBy: 'Facilities Office' },
  { id: 'DR-2026-001', title: 'TOR', kind: 'TOR Request', ownerId: 'stu-01', owner: 'Maria Clara Santos', office: 'Registrar', status: 'Approved', date: '2026-05-12', time: '09:00', remarks: 'Application for graduate studies abroad', updatedBy: 'Ms. Reyes' },
  { id: 'DR-2026-003', title: 'Exit Clearance', kind: 'Exit Clearance', ownerId: 'stu-01', owner: 'Maria Clara Santos', office: 'Registrar', status: 'Completed', date: '2026-04-15', time: '13:00', remarks: 'Internship endorsement', updatedBy: 'Ms. Reyes' },
  { id: 'DR-2026-004', title: 'COE', kind: 'COE Request', ownerId: 'stu-01', owner: 'Maria Clara Santos', office: 'Registrar', status: 'Rejected', date: '2026-03-02', time: '11:00', remarks: 'Visa application supporting document', updatedBy: 'Ms. Reyes' },
  { id: 'SR-2026-301', title: 'Bond paper, markers, and printer ink', kind: 'Supply Request', ownerId: 'emp-01', owner: 'Prof. Joseph Reyes', office: 'Supply Office', status: 'Pending', date: '2026-05-28', time: '08:30', remarks: 'For midterm examination printing and lecture materials' },
  { id: 'SR-2026-302', title: 'Extension cords and USB flash drives', kind: 'Inventory Request', ownerId: 'emp-01', owner: 'Prof. Joseph Reyes', office: 'Supply Office', status: 'Approved', date: '2026-05-10', time: '10:00', remarks: 'Lab equipment for incoming 2nd semester classes', updatedBy: 'Liza Mendoza' },
  { id: 'SR-2026-303', title: 'Sticky notes and manila folders', kind: 'Supply Request', ownerId: 'emp-01', owner: 'Prof. Joseph Reyes', office: 'Supply Office', status: 'Rejected', date: '2026-04-02', time: '09:00', remarks: 'Office organization supplies', updatedBy: 'Liza Mendoza' },
  { id: 'LV-2026-501', title: 'Vacation leave', kind: 'Vacation Leave', ownerId: 'emp-01', owner: 'Prof. Joseph Reyes', office: 'HR Office', status: 'Pending', date: '2026-06-20', time: '2026-06-24', remarks: 'Family vacation - will return papers after the leave period.' },
  { id: 'LV-2026-502', title: 'Sick leave', kind: 'Sick Leave', ownerId: 'emp-01', owner: 'Prof. Joseph Reyes', office: 'HR Office', status: 'Approved', date: '2026-04-18', time: '2026-04-19', remarks: 'Medical appointment and recovery.', updatedBy: 'HR Office' },
  { id: 'LV-2026-503', title: 'Official leave', kind: 'Official Leave', ownerId: 'emp-01', owner: 'Prof. Joseph Reyes', office: 'HR Office', status: 'Approved', date: '2026-05-10', time: '2026-05-12', remarks: 'Attending national engineering conference.', updatedBy: 'HR Office' },
  { id: 'LV-2026-504', title: 'Personal leave', kind: 'Personal Leave', ownerId: 'emp-01', owner: 'Prof. Joseph Reyes', office: 'HR Office', status: 'Rejected', date: '2026-03-05', time: '2026-03-05', remarks: 'Personal errand - will make up class schedule.', updatedBy: 'HR Office' },
  { id: 'REQ-2406', title: 'Vacation leave filing', kind: 'Vacation Leave', ownerId: 'emp-01', owner: 'Juan Reyes', office: 'HR Office', status: 'Approved', date: '2026-06-18', time: '07:30', remarks: 'Approved by department head', updatedBy: 'HR Office' },
]

export const initialMessages: Message[] = [
  { id: 'MSG-1', requestId: 'DR-2026-002', senderId: 'reg-01', senderName: 'Ms. Reyes', body: 'Hi Maria, for the COE request - which semester does your scholarship require certification for? Is it the current semester or the entire academic year?', sentAt: 'May 29, 7:00 PM' },
  { id: 'MSG-2', requestId: 'DR-2026-001', senderId: 'reg-01', senderName: 'Ms. Reyes', body: "Noted. We'll prepare it with the dry seal.", sentAt: 'May 14, 3:15 PM' },
  { id: 'MSG-3', requestId: 'DR-2026-004', senderId: 'reg-01', senderName: 'Ms. Reyes', body: 'No problem. Once you re-submit with the correct semester indicated, we can review it again.', sentAt: 'Mar 4, 10:20 AM' },
]

export const initialAnnouncements: Announcement[] = [
  { id: 'ANN-2026-001', title: 'Final Exam Schedule Released', body: 'Check the academic calendar for the updated final examinations schedule.', authorId: 'reg-01', authorName: 'Atty. Ramon Villanueva', authorRole: 'registrar', createdAt: 'May 20, 2026, 3:30 PM' },
  { id: 'ANN-2026-002', title: 'Reminder: Enrollment Period', body: 'Online enrollment for 1st Semester AY 2026-2027 opens on June 22.', authorId: 'sys-01', authorName: 'Dr. Helena Cabrera', authorRole: 'admin', createdAt: 'May 29, 2026, 11:00 PM' },
]

export const initialInventory: SupplyItem[] = [
  { id: 'INV-001', name: 'Bond Paper (A4)', quantity: 250, unit: 'ream', minThreshold: 50, location: 'Shelf A1', category: 'Paper Products', cost: 45, supplier: 'Premium Papers Inc.', expiryDate: '2027-12-31' },
  { id: 'INV-002', name: 'Markers (assorted)', quantity: 8, unit: 'box', minThreshold: 20, location: 'Shelf B2', category: 'Writing Supplies', cost: 125, supplier: 'Art Supply Co.', expiryDate: '2026-06-30' },
  { id: 'INV-003', name: 'Printer Ink (Black)', quantity: 18, unit: 'cartridge', minThreshold: 10, location: 'Cabinet C1', category: 'Technology', cost: 85, supplier: 'Tech Solutions Ltd.', expiryDate: '2028-03-15' },
  { id: 'INV-004', name: 'USB Flash Drive (32GB)', quantity: 45, unit: 'piece', minThreshold: 15, location: 'Shelf D3', category: 'Technology', cost: 350, supplier: 'Digital Storage Inc.', expiryDate: '2029-01-01' },
  { id: 'INV-005', name: 'Extension Cords', quantity: 12, unit: 'piece', minThreshold: 8, location: 'Shelf E1', category: 'Desk Accessories', cost: 95, supplier: 'Electrical Supplies Ltd.', expiryDate: '2030-05-20' },
  { id: 'INV-006', name: 'Manila Folders', quantity: 4, unit: 'box', minThreshold: 10, location: 'Shelf A3', category: 'Filing & Storage', cost: 280, supplier: 'Office Supplies Hub', expiryDate: '2027-08-10' },
  { id: 'INV-007', name: 'Sticky Notes', quantity: 6, unit: 'pack', minThreshold: 15, location: 'Shelf B1', category: 'Writing Supplies', cost: 45, supplier: 'Paper Products Ltd.', expiryDate: '2026-09-30' },
  { id: 'INV-008', name: 'Printer Ink (Color)', quantity: 5, unit: 'cartridge', minThreshold: 8, location: 'Cabinet C1', category: 'Technology', cost: 125, supplier: 'Tech Solutions Ltd.', expiryDate: '2028-02-28' },
  { id: 'INV-009', name: 'Ballpoint Pens (Box of 12)', quantity: 45, unit: 'box', minThreshold: 20, location: 'Shelf A1', category: 'Writing Supplies', cost: 85, supplier: 'Pen Manufacturing Co.', expiryDate: '2026-12-31' },
  { id: 'INV-010', name: 'Copy Paper (500 sheets)', quantity: 120, unit: 'ream', minThreshold: 50, location: 'Shelf B1', category: 'Paper Products', cost: 40, supplier: 'Premium Papers Inc.', expiryDate: '2027-10-15' },
]

export const initialSuppliers: SupplierInfo[] = [
  { id: 'SUP-001', name: 'Premium Papers Inc.', contact: '+63-2-8234-5678', email: 'sales@prempapers.ph', leadTime: 3 },
  { id: 'SUP-002', name: 'Art Supply Co.', contact: '+63-917-123-4567', email: 'info@artsupply.ph', leadTime: 5 },
  { id: 'SUP-003', name: 'Tech Solutions Ltd.', contact: '+63-2-8765-4321', email: 'support@techsol.ph', leadTime: 7 },
  { id: 'SUP-004', name: 'Digital Storage Inc.', contact: '+63-917-987-6543', email: 'sales@digitalstorage.ph', leadTime: 2 },
  { id: 'SUP-005', name: 'Electrical Supplies Ltd.', contact: '+63-2-8456-7890', email: 'orders@elecsupp.ph', leadTime: 4 },
  { id: 'SUP-006', name: 'Office Supplies Hub', contact: '+63-917-555-6666', email: 'contact@officesupplies.ph', leadTime: 2 },
]

export const initialCategories: SupplyCategory[] = [
  { id: 'CAT-001', name: 'Writing Supplies', color: 'bg-orange-100 text-orange-800' },
  { id: 'CAT-002', name: 'Paper Products', color: 'bg-blue-100 text-blue-800' },
  { id: 'CAT-003', name: 'Desk Accessories', color: 'bg-green-100 text-green-800' },
  { id: 'CAT-004', name: 'Filing & Storage', color: 'bg-purple-100 text-purple-800' },
  { id: 'CAT-005', name: 'Technology', color: 'bg-red-100 text-red-800' },
]

export const initialStockMovements: StockMovement[] = [
  { id: 'SM-001', itemId: 'INV-001', itemName: 'Bond Paper (A4)', type: 'Stock In', quantity: 50, reason: 'Regular restock', performedBy: 'Liza Mendoza', date: '2026-05-28 09:30' },
  { id: 'SM-002', itemId: 'INV-002', itemName: 'Markers (assorted)', type: 'Stock Out', quantity: 12, reason: 'Department supply request', performedBy: 'Liza Mendoza', date: '2026-05-27 14:15' },
  { id: 'SM-003', itemId: 'INV-009', itemName: 'Ballpoint Pens (Box of 12)', type: 'Stock In', quantity: 25, reason: 'Bulk order delivery', performedBy: 'Liza Mendoza', date: '2026-05-26 10:00' },
  { id: 'SM-004', itemId: 'INV-007', itemName: 'Sticky Notes', type: 'Stock Out', quantity: 8, reason: 'Faculty office request', performedBy: 'Liza Mendoza', date: '2026-05-25 11:20' },
  { id: 'SM-005', itemId: 'INV-003', itemName: 'Printer Ink (Black)', type: 'Stock In', quantity: 10, reason: 'Scheduled purchase', performedBy: 'Liza Mendoza', date: '2026-05-24 08:45' },
]

export const roleMeta: Record<Role, { label: string; portal: string }> = {
  student: { label: 'Student', portal: 'Student Portal' },
  registrar: { label: 'Registrar', portal: 'Registrar Office' },
  supply: { label: 'Supply Office', portal: 'Supply Portal' },
  adminOffice: { label: 'Admin Office', portal: 'Facilities Portal' },
  hr: { label: 'HR Office', portal: 'HR Portal' },
  employee: { label: 'Employee', portal: 'Employee Portal' },
  admin: { label: 'System Admin', portal: 'Admin Portal' },
}
