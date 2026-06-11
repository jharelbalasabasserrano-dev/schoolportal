import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Home,
  Info,
  Layers3,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  PackageCheck,
  Plus,
  Printer,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Save,
  Trash2,
  User,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'

type Role = 'student' | 'registrar' | 'supply' | 'adminOffice' | 'hr' | 'employee' | 'admin'
type Status = 'Pending' | 'Approved' | 'Rejected' | 'Completed'
type Office = 'Registrar' | 'Supply Office' | 'Admin Office' | 'HR Office'
type RequestKind =
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

type User = {
  id: string
  name: string
  email: string
  password: string
  role: Role
  department: string
  avatarUrl?: string
}

type PortalRequest = {
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

type ExitClearanceResponse = {
  id: string
  reference_number: string
  tracking_number: string
  status: Status
}

async function submitExitClearanceRequest(request: PortalRequest): Promise<ExitClearanceResponse> {
  const response = await fetch('/api/exit-clearance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      student_name: request.owner,
      id_number: request.studentId,
      program: request.program,
      year_level: request.yearLevel,
      acad_year: request.schoolYear,
      semester: request.semester,
      reason_transfer: request.remarks,
      requested_docs: [request.title],
      purpose: request.purpose ?? request.remarks,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return response.json()
}

type Message = {
  id: string
  requestId: string
  senderId: string
  senderName: string
  body: string
  sentAt: string
}

type SupplyItem = {
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

type SupplyCategory = {
  id: string
  name: string
  color: string
}

type StockMovement = {
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

type SupplierInfo = {
  id: string
  name: string
  contact: string
  email: string
  leadTime: number
}

type AuthContextValue = {
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

type ActiveModal =
  | { type: 'viewRequest'; request: PortalRequest }
  | { type: 'decision'; request: PortalRequest; status: Status }
  | { type: 'users' }
  | null

const studentRequestKinds: RequestKind[] = ['TOR Request', 'COE Request', 'Exit Clearance', 'Certificate of Registration', 'Certificate of Grades', 'Certificate of Credit Units', 'Facility Reservation']
const documentKinds: RequestKind[] = ['TOR Request', 'COE Request', 'Exit Clearance', 'Certificate of Registration', 'Certificate of Grades', 'Certificate of Credit Units']
const leaveKinds: RequestKind[] = ['Vacation Leave', 'Sick Leave', 'Personal Leave', 'Official Leave']
const storageKeys = {
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
const facilities = [
  ['Room 301 - Main Building', 'Classroom'],
  ['Room 405 - Main Building', 'Classroom'],
  ['Computer Lab 4', 'Laboratory'],
  ['Chemistry Lab 2', 'Laboratory'],
  ['AVR 1 - Library Annex', 'Audio-Visual Room'],
  ['AVR 2 - Engineering Building', 'Audio-Visual Room'],
  ['Bonifacio Auditorium', 'Auditorium'],
]

const initialUsers: User[] = [
  { id: 'stu-01', name: 'Maria Clara Santos', email: 'maria.santos@student.edu', password: 'password123', role: 'student', department: 'BS Computer Science - 3rd Year' },
  { id: 'reg-01', name: 'Atty. Ramon Villanueva', email: 'registrar@edu.portal', password: 'password123', role: 'registrar', department: 'Registrar Office' },
  { id: 'sup-01', name: 'Liza Mendoza', email: 'supply@edu.portal', password: 'password123', role: 'supply', department: 'Supply Office' },
  { id: 'fac-01', name: 'Facilities Office', email: 'facilities@edu.portal', password: 'password123', role: 'adminOffice', department: 'Admin Office' },
  { id: 'hr-01', name: 'HR Office', email: 'hr@edu.portal', password: 'password123', role: 'hr', department: 'HR Office' },
  { id: 'emp-01', name: 'Prof. Joseph Reyes', email: 'j.reyes@edu.portal', password: 'password123', role: 'employee', department: 'Senior High School' },
  { id: 'sys-01', name: 'Dr. Helena Cabrera', email: 'admin@edu.portal', password: 'password123', role: 'admin', department: 'ICT Office' },
]

const initialRequests: PortalRequest[] = [
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

const initialMessages: Message[] = [
  { id: 'MSG-1', requestId: 'DR-2026-002', senderId: 'reg-01', senderName: 'Ms. Reyes', body: 'Hi Maria, for the COE request - which semester does your scholarship require certification for? Is it the current semester or the entire academic year?', sentAt: 'May 29, 7:00 PM' },
  { id: 'MSG-2', requestId: 'DR-2026-001', senderId: 'reg-01', senderName: 'Ms. Reyes', body: "Noted. We'll prepare it with the dry seal.", sentAt: 'May 14, 3:15 PM' },
  { id: 'MSG-3', requestId: 'DR-2026-004', senderId: 'reg-01', senderName: 'Ms. Reyes', body: 'No problem. Once you re-submit with the correct semester indicated, we can review it again.', sentAt: 'Mar 4, 10:20 AM' },
]

const initialInventory: SupplyItem[] = [
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

const initialSuppliers: SupplierInfo[] = [
  { id: 'SUP-001', name: 'Premium Papers Inc.', contact: '+63-2-8234-5678', email: 'sales@prempapers.ph', leadTime: 3 },
  { id: 'SUP-002', name: 'Art Supply Co.', contact: '+63-917-123-4567', email: 'info@artsupply.ph', leadTime: 5 },
  { id: 'SUP-003', name: 'Tech Solutions Ltd.', contact: '+63-2-8765-4321', email: 'support@techsol.ph', leadTime: 7 },
  { id: 'SUP-004', name: 'Digital Storage Inc.', contact: '+63-917-987-6543', email: 'sales@digitalstorage.ph', leadTime: 2 },
  { id: 'SUP-005', name: 'Electrical Supplies Ltd.', contact: '+63-2-8456-7890', email: 'orders@elecsupp.ph', leadTime: 4 },
  { id: 'SUP-006', name: 'Office Supplies Hub', contact: '+63-917-555-6666', email: 'contact@officesupplies.ph', leadTime: 2 },
]

const initialCategories: SupplyCategory[] = [
  { id: 'CAT-001', name: 'Writing Supplies', color: 'bg-orange-100 text-orange-800' },
  { id: 'CAT-002', name: 'Paper Products', color: 'bg-blue-100 text-blue-800' },
  { id: 'CAT-003', name: 'Desk Accessories', color: 'bg-green-100 text-green-800' },
  { id: 'CAT-004', name: 'Filing & Storage', color: 'bg-purple-100 text-purple-800' },
  { id: 'CAT-005', name: 'Technology', color: 'bg-red-100 text-red-800' },
]

const initialStockMovements: StockMovement[] = [
  { id: 'SM-001', itemId: 'INV-001', itemName: 'Bond Paper (A4)', type: 'Stock In', quantity: 50, reason: 'Regular restock', performedBy: 'Liza Mendoza', date: '2026-05-28 09:30' },
  { id: 'SM-002', itemId: 'INV-002', itemName: 'Markers (assorted)', type: 'Stock Out', quantity: 12, reason: 'Department supply request', performedBy: 'Liza Mendoza', date: '2026-05-27 14:15' },
  { id: 'SM-003', itemId: 'INV-009', itemName: 'Ballpoint Pens (Box of 12)', type: 'Stock In', quantity: 25, reason: 'Bulk order delivery', performedBy: 'Liza Mendoza', date: '2026-05-26 10:00' },
  { id: 'SM-004', itemId: 'INV-007', itemName: 'Sticky Notes', type: 'Stock Out', quantity: 8, reason: 'Faculty office request', performedBy: 'Liza Mendoza', date: '2026-05-25 11:20' },
  { id: 'SM-005', itemId: 'INV-003', itemName: 'Printer Ink (Black)', type: 'Stock In', quantity: 10, reason: 'Scheduled purchase', performedBy: 'Liza Mendoza', date: '2026-05-24 08:45' },
]

const roleMeta: Record<Role, { label: string; portal: string }> = {
  student: { label: 'Student', portal: 'Student Portal' },
  registrar: { label: 'Registrar', portal: 'Registrar Office' },
  supply: { label: 'Supply Office', portal: 'Supply Portal' },
  adminOffice: { label: 'Admin Office', portal: 'Facilities Portal' },
  hr: { label: 'HR Office', portal: 'HR Portal' },
  employee: { label: 'Employee', portal: 'Employee Portal' },
  admin: { label: 'System Admin', portal: 'Admin Portal' },
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStored<T>(key: string, fallback: T) {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<User[]>(() => {
    const stored = readStored<User[]>(storageKeys.accounts, [])
    const merged = [...initialUsers]
    stored.forEach((account) => {
      if (!merged.some((item) => item.email === account.email)) merged.push(account)
    })
    return merged
  })
  const [user, setUser] = useState<User | null>(() => {
    const savedEmail = localStorage.getItem(storageKeys.user)
    const storedAccounts = readStored<User[]>(storageKeys.accounts, initialUsers)
    return [...initialUsers, ...storedAccounts].find((account) => account.email === savedEmail) ?? null
  })

  useEffect(() => {
    localStorage.setItem(storageKeys.accounts, JSON.stringify(accounts))
  }, [accounts])

  const value = useMemo<AuthContextValue>(() => ({
    accounts,
    addAccount: (account) => {
      setAccounts((current) => [...current, { ...account, id: `${account.role}-${Date.now()}` }])
    },
    deleteAccount: (id) => {
      setAccounts((current) => current.filter((account) => account.id !== id || account.role === 'admin'))
    },
    updateAccount: (id, updates) => {
      setAccounts((current) => current.map((account) => account.id === id ? { ...account, ...updates } : account))
      setUser((current) => current?.id === id ? { ...current, ...updates } : current)
    },
    user,
    login: (email, password, remember) => {
      const match = accounts.find((account) => account.email === email.trim().toLowerCase() && account.password === password)
      if (!match) return false
      if (remember) localStorage.setItem(storageKeys.user, match.email)
      else localStorage.removeItem(storageKeys.user)
      setUser(match)
      return true
    },
    logout: () => {
      localStorage.removeItem(storageKeys.user)
      setUser(null)
    },
    changePassword: (currentPassword, nextPassword) => {
      if (!user || user.password !== currentPassword) return false
      const updated = { ...user, password: nextPassword }
      setAccounts((current) => current.map((account) => account.id === user.id ? updated : account))
      setUser(updated)
      return true
    },
    updateProfile: (updates) => {
      if (!user) return
      const updated = { ...user, ...updates }
      setAccounts((current) => current.map((account) => account.id === user.id ? updated : account))
      setUser(updated)
    },
  }), [accounts, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

function LoginPage() {
  const { accounts, login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('maria.santos@student.edu')
  const [password, setPassword] = useState('password123')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/dashboard" replace />

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (login(email, password, remember)) navigate('/dashboard')
    else setError('Invalid credentials. Use a demo account and password123.')
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#111111] lg:grid lg:grid-cols-[1fr_520px] xl:grid-cols-[1fr_620px]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#2b0708] lg:block">
        <img src="/src/assets/hero.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-65" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(36,5,6,.94),rgba(62,14,14,.58),rgba(36,5,6,.72))]" />
        <div className="relative flex min-h-screen flex-col justify-between p-14 text-white">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#f4b400] text-[#220506]">
              <GraduationCap size={30} />
            </span>
            <div>
              <h1 className="text-2xl font-bold">EduPortal</h1>
              <p className="text-sm font-semibold uppercase tracking-[.22em] text-white/75">School Request System</p>
            </div>
          </div>
          <div className="max-w-[620px]">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[.32em] text-[#ffd166]">Est. 1947 - Office of Student Services</p>
            <h2 className="text-5xl font-bold leading-tight">One portal for every campus request.</h2>
            <p className="mt-6 max-w-[580px] text-xl leading-8 text-white/85">Submit TOR and COE requests, reserve facilities, file leave applications, and track approvals all in one place.</p>
            <div className="mt-10 grid max-w-[620px] grid-cols-3 gap-4">
              {[
                ['Documents', FileText],
                ['Facilities', Building2],
                ['Leave', CalendarClock],
              ].map(([label, Icon]) => (
                <div key={label as string} className="rounded-lg border border-white/20 bg-white/15 p-4 backdrop-blur-md">
                  <span className="mb-8 flex h-10 w-10 items-center justify-center rounded-md bg-[#f4b400]/55 text-white">
                    <Icon size={20} />
                  </span>
                  <p className="font-semibold">{label as string}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-white/70">© 2026 EduPortal University. A unified school request platform.</p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl">
          <div className="mb-10 lg:hidden">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[#f4b400] text-[#220506]">
              <GraduationCap size={30} />
            </span>
            <h1 className="text-3xl font-bold">EduPortal</h1>
          </div>
          <form onSubmit={submit}>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[.32em] text-[#7a111b]">Sign in</p>
            <h2 className="text-4xl font-bold">Welcome back</h2>
            <p className="mt-4 max-w-lg text-xl leading-8 text-slate-700">Access your dashboard to manage requests, approvals, and notifications.</p>

            <label className="mt-10 block">
              <span className="mb-2 block font-medium">Email address</span>
              <span className="flex h-14 items-center rounded-md border border-[#d9d3cc] bg-white px-4 focus-within:border-[#9c2f36] focus-within:ring-4 focus-within:ring-red-100">
                <Mail size={20} className="mr-3 text-slate-500" />
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@edu.portal" className="min-w-0 flex-1 bg-transparent text-lg outline-none" />
              </span>
            </label>
            <label className="mt-5 block">
              <span className="mb-2 block font-medium">Password</span>
              <span className="flex h-14 items-center rounded-md border border-[#d9d3cc] bg-white px-4 focus-within:border-[#9c2f36] focus-within:ring-4 focus-within:ring-red-100">
                <Lock size={20} className="mr-3 text-slate-500" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="min-w-0 flex-1 bg-transparent text-lg outline-none" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <div className="mt-5 flex items-center justify-between">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-5 w-5 rounded accent-[#9d2d35]" />
                Remember me
              </label>
              <button type="button" className="font-medium text-[#7a111b]">Forgot password?</button>
            </div>
            {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-[#9d2d35] px-4 text-lg font-semibold text-white hover:bg-[#7a111b]">
              Sign in to dashboard
              <ChevronDown className="-rotate-90" size={18} />
            </button>
          </form>

          <div className="mt-8 border-t border-[#e7e1db] pt-7">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[.12em] text-slate-600">Demo accounts - Password: <span className="text-[#9d2d35]">password123</span></p>
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.slice(0, 7).map((account) => (
                <button key={account.id} onClick={() => setEmail(account.email)} className="rounded-md border border-[#e0dbd5] bg-white px-4 py-3 text-left hover:border-[#9d2d35]">
                  <span className="block text-xs font-semibold uppercase tracking-[.14em] text-slate-500">{roleMeta[account.role].label}</span>
                  <span className="block truncate font-medium">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/" replace />
}

function Dashboard() {
  const { user, logout } = useAuth()
  const [requestList, setRequestList] = useState<PortalRequest[]>(() => {
    const stored = readStored<PortalRequest[]>(storageKeys.requests, [])
    const merged = [...stored]
    initialRequests.forEach((request) => {
      if (!merged.some((item) => item.id === request.id)) merged.push(request)
    })
    return merged
  })
  const [messageList, setMessageList] = useState<Message[]>(() => readStored(storageKeys.messages, initialMessages))
  const [inventory, setInventory] = useState<SupplyItem[]>(() => {
    const stored = readStored<SupplyItem[]>(storageKeys.inventory, [])
    const merged = [...stored]
    initialInventory.forEach((item) => {
      if (!merged.some((inv) => inv.id === item.id)) merged.push(item)
    })
    return merged
  })
  const [categories] = useState<SupplyCategory[]>(() => {
    const stored = readStored<SupplyCategory[]>(storageKeys.categories, [])
    const merged = [...stored]
    initialCategories.forEach((cat) => {
      if (!merged.some((c) => c.id === cat.id)) merged.push(cat)
    })
    return merged
  })
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>(() => {
    const stored = readStored<SupplierInfo[]>(storageKeys.suppliers, [])
    const merged = [...stored]
    initialSuppliers.forEach((sup) => {
      if (!merged.some((s) => s.id === sup.id)) merged.push(sup)
    })
    return merged
  })
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const stored = readStored<StockMovement[]>(storageKeys.stockMovements, [])
    const merged = [...stored]
    initialStockMovements.forEach((move) => {
      if (!merged.some((m) => m.id === move.id)) merged.push(move)
    })
    return merged
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState('Overview')
  const [modal, setModal] = useState<ActiveModal>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationRead, setNotificationRead] = useState<Record<string, boolean>>(() => readStored(storageKeys.notifications, {}))

  useEffect(() => {
    localStorage.setItem(storageKeys.requests, JSON.stringify(requestList))
  }, [requestList])

  useEffect(() => {
    localStorage.setItem(storageKeys.messages, JSON.stringify(messageList))
  }, [messageList])

  useEffect(() => {
    localStorage.setItem(storageKeys.inventory, JSON.stringify(inventory))
  }, [inventory])

  useEffect(() => {
    localStorage.setItem(storageKeys.stockMovements, JSON.stringify(stockMovements))
  }, [stockMovements])

  useEffect(() => {
    localStorage.setItem(storageKeys.suppliers, JSON.stringify(suppliers))
  }, [suppliers])

  useEffect(() => {
    localStorage.setItem(storageKeys.notifications, JSON.stringify(notificationRead))
  }, [notificationRead])

  if (!user) return null

  const visibleRequests = getVisibleRequests(user, requestList)
  const counts = getCounts(visibleRequests)
  const canApprove = ['registrar', 'supply', 'adminOffice', 'hr', 'admin'].includes(user.role)
  const notifications = notificationItems.map((item) => ({ ...item, read: notificationRead[item.id] ?? item.read }))
  const unreadCount = notifications.filter((item) => !item.read).length
  const markAllNotificationsRead = () => {
    setNotificationRead(Object.fromEntries(notificationItems.map((item) => [item.id, true])))
  }
  const toggleNotificationRead = (id: string) => {
    const item = notifications.find((notice) => notice.id === id)
    if (!item) return
    setNotificationRead((current) => ({ ...current, [id]: !item.read }))
  }

  const addRequest = (request: PortalRequest) => {
    setRequestList((current) => [request, ...current])
    setActiveView(request.kind === 'Facility Reservation' ? 'My Requests' : 'My Requests')
  }

  const updateRequestStatus = (requestId: string, status: Status, remarks: string) => {
    setRequestList((current) => current.map((request) => {
      if (request.id !== requestId) return request
      if (request.kind === 'Facility Reservation') return { ...request, status, facilityRemarks: remarks, updatedBy: user.name }
      return { ...request, status, remarks, updatedBy: user.name }
    }))
    setModal(null)
  }

  const sendMessage = (requestId: string, body: string) => {
    if (!body.trim()) return
    setMessageList((current) => [...current, {
      id: `MSG-${Date.now()}`,
      requestId,
      senderId: user.id,
      senderName: user.name,
      body: body.trim(),
      sentAt: new Date().toLocaleString(),
    }])
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#121212]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-[345px] transform bg-[#2a0507] text-white transition lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[86px] items-center justify-between border-b border-white/10 px-8">
          <button onClick={() => setActiveView('Overview')} className="flex items-center gap-4 text-left">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f4b400] text-[#240506]">
              <GraduationCap size={28} />
            </span>
            <span>
              <span className="block text-2xl font-bold">EduPortal</span>
              <span className="block text-sm font-semibold uppercase tracking-[.16em] text-white/65">{roleMeta[user.role].portal}</span>
            </span>
          </button>
          <button className="rounded-md p-2 text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="px-5 py-7">
          <p className="mb-3 px-3 text-sm font-semibold uppercase tracking-[.18em] text-white/45">{roleMeta[user.role].label} Menu</p>
          <div className="space-y-2">
            {getNavItems(user.role).map((item) => {
              const Icon = item.icon
              const selected = activeView === item.label
              return (
                <button key={item.label} onClick={() => { setActiveView(item.label); setSidebarOpen(false) }} className={`flex h-14 w-full items-center gap-4 rounded-md px-4 text-left text-lg font-medium ${selected ? 'bg-white/13 text-white' : 'text-white/88 hover:bg-white/8'}`}>
                  <Icon size={20} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 w-full border-t border-white/10 p-6">
          <div className="flex items-center gap-4">
            <Avatar user={user} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{user.name}</p>
              <p className="truncate text-sm text-white/65">{user.email}</p>
            </div>
            <button onClick={logout} className="rounded-md p-2 text-white/80 hover:bg-white/10" aria-label="Sign out">
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[345px]">
        <header className="sticky top-0 z-30 flex h-[86px] items-center justify-between border-b border-[#e7e1db] bg-[#faf9f7]/95 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="rounded-md border border-[#e0dbd5] p-2 lg:hidden" aria-label="Open menu">
              <Menu size={22} />
            </button>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[.16em] text-slate-500">{roleMeta[user.role].label} Dashboard</p>
              <h1 className="text-2xl font-bold">{activeView}</h1>
            </div>
          </div>
          <div className="relative flex items-center gap-5">
            <button onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false) }} className="relative rounded-md p-2 hover:bg-[#f2eee9]" aria-label="Notifications">
              <Bell size={23} />
              {unreadCount > 0 && <span className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#9d2d35] text-xs font-bold text-white">{unreadCount}</span>}
            </button>
            <button onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false) }} className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-[#f2eee9]">
              <Avatar user={user} size="sm" />
              <span className="hidden text-left sm:block">
                <span className="block font-semibold">{user.name.split(' ')[0]}</span>
                <span className="block text-sm text-slate-500">{roleMeta[user.role].label}</span>
              </span>
              <ChevronDown className={profileOpen ? 'rotate-180' : ''} size={18} />
            </button>
            {notificationsOpen && <NotificationsDropdown notifications={notifications} onMarkAllRead={markAllNotificationsRead} />}
            {profileOpen && <ProfileDropdown onProfile={() => { setActiveView('Profile'); setProfileOpen(false) }} onLogout={logout} user={user} />}
          </div>
        </header>

        <main className="px-5 py-8 lg:px-8">
          {user.role === 'registrar' && ['Overview', 'TOR Requests', 'COE Requests', 'Exit Clearance'].includes(activeView) && (
            <RegistrarRequestsView key={activeView} activeView={activeView} onReview={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} />
          )}
          {user.role === 'supply' && ['Overview', 'Supply Requests', 'Inventory', 'Categories', 'Stock Movements', 'Suppliers', 'Reports'].includes(activeView) && (
            <SupplyOfficeView activeView={activeView} categories={categories} inventory={inventory} onInventoryChange={setInventory} suppliers={suppliers} onSuppliersChange={setSuppliers} stockMovements={stockMovements} onStockMovementAdd={setStockMovements} onReview={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} />
          )}
          {user.role === 'adminOffice' && ['Overview', 'Facility Reservations', 'Reports'].includes(activeView) && (
            <AdminOfficeView activeView={activeView} onReview={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} />
          )}
          {user.role === 'hr' && ['Overview', 'Leave Applications', 'Reports'].includes(activeView) && (
            <HrOfficeView activeView={activeView} onReview={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} />
          )}
          {user.role === 'employee' && ['Overview', 'File Leave', 'Request Supplies', 'Reserve Facility', 'My Requests', 'Room Availability'].includes(activeView) && (
            <EmployeePortalView activeView={activeView} existingRequests={requestList} onSubmit={addRequest} onView={setActiveView} onViewRequest={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} user={user} />
          )}
          {user.role === 'admin' && ['Overview', 'Users', 'All Requests', 'Reports', 'Activity Logs', 'Settings'].includes(activeView) && (
            <SystemAdminView activeView={activeView} onViewRequest={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} />
          )}
          {!['registrar', 'supply', 'adminOffice', 'hr', 'employee', 'admin'].includes(user.role) && activeView === 'Overview' && <OverviewView counts={counts} onView={setActiveView} requests={visibleRequests} user={user} />}
          {activeView === 'Request Document' && <RequestDocumentView onSubmit={addRequest} user={user} />}
          {user.role !== 'employee' && activeView === 'Reserve Facility' && <ReserveFacilityView existingRequests={requestList} onSubmit={addRequest} user={user} />}
          {user.role !== 'employee' && activeView === 'Room Availability' && <RoomAvailabilityView requests={requestList} />}
          {user.role !== 'employee' && activeView === 'My Requests' && <MyRequestsView requests={visibleRequests} onView={(request) => setModal({ type: 'viewRequest', request })} />}
          {activeView === 'Messages' && <MessagesView currentUser={user} messages={messageList} onSend={sendMessage} requests={requestList} />}
          {activeView === 'Notifications' && <NotificationsView notifications={notifications} onMarkAllRead={markAllNotificationsRead} onToggleRead={toggleNotificationRead} />}
          {activeView === 'Profile' && <ProfileView />}
          {user.role !== 'admin' && !getNavItems(user.role).some((item) => item.label === activeView) && <RequestsWorkspace requests={visibleRequests} canApprove={canApprove} onDecision={(request, status) => setModal({ type: 'decision', request, status })} onView={(request) => setModal({ type: 'viewRequest', request })} />}
        </main>
      </div>

      {modal?.type === 'viewRequest' && user.role === 'registrar' && <RegistrarReviewModal onClose={() => setModal(null)} onSubmit={updateRequestStatus} request={modal.request} />}
      {modal?.type === 'viewRequest' && user.role === 'supply' && <SupplyReviewModal onClose={() => setModal(null)} onSubmit={updateRequestStatus} request={modal.request} />}
      {modal?.type === 'viewRequest' && user.role === 'adminOffice' && <FacilityReviewModal onClose={() => setModal(null)} onSubmit={updateRequestStatus} request={modal.request} />}
      {modal?.type === 'viewRequest' && user.role === 'hr' && <LeaveReviewModal onClose={() => setModal(null)} onSubmit={updateRequestStatus} request={modal.request} />}
      {modal?.type === 'viewRequest' && !['registrar', 'supply', 'adminOffice', 'hr'].includes(user.role) && <RequestDetailsModal request={modal.request} onClose={() => setModal(null)} />}
      {modal?.type === 'decision' && <DecisionModal request={modal.request} status={modal.status} onClose={() => setModal(null)} onSubmit={updateRequestStatus} />}
      {modal?.type === 'users' && <UsersModal onClose={() => setModal(null)} />}
    </div>
  )
}

function OverviewView({ counts, onView, requests, user }: { counts: Record<Status, number>; onView: (view: string) => void; requests: PortalRequest[]; user: User }) {
  return (
    <div className="space-y-8">
      <section className="rounded-lg bg-[linear-gradient(100deg,#9d2d35,#9d2d35_56%,#ad4b22)] p-7 text-white shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="mb-2 font-semibold uppercase tracking-[.08em] text-white/75">Wednesday, June 3</p>
            <h2 className="text-4xl font-bold">Hi, {user.name.split(' ')[0]}</h2>
            <p className="mt-2 text-xl font-medium text-white/85">{user.department} - Student ID 2022-00451</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onView('Request Document')} className="inline-flex h-14 items-center gap-3 rounded-md bg-[#f4b400] px-7 text-lg font-semibold text-black hover:bg-[#ffcc33]">
              <Plus size={20} />
              New Request
            </button>
            <button onClick={() => onView('My Requests')} className="inline-flex h-14 items-center gap-3 rounded-md border border-white/30 bg-white/12 px-7 text-lg font-semibold hover:bg-white/18">
              <PackageCheck size={20} />
              My Requests
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={counts.Pending} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Approved" value={counts.Approved} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-800" />
        <MetricCard label="Rejected" value={counts.Rejected} icon={XCircle} tone="bg-red-100 text-red-800" />
        <MetricCard label="Completed" value={counts.Completed} icon={BadgeCheck} tone="bg-stone-100 text-stone-700" />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <ActionCard title="Request a document" subtitle="TOR, COE, or Exit Clearance" icon={FileText} tone="bg-[#b73b47] text-white" onClick={() => onView('Request Document')} />
        <ActionCard title="Reserve a facility" subtitle="Rooms, labs, AVRs" icon={Building2} tone="bg-[#2f8d73] text-white" onClick={() => onView('Reserve Facility')} highlighted />
        <ActionCard title="Track my requests" subtitle="View status and remarks" icon={PackageCheck} tone="bg-[#f4b400] text-[#240506]" onClick={() => onView('My Requests')} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_470px]">
        <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Recent requests</h2>
              <p className="text-slate-500">Latest document submissions</p>
            </div>
            <button onClick={() => onView('My Requests')} className="font-medium text-[#7a111b]">View all</button>
          </div>
          <div className="divide-y divide-[#eee9e4]">
            {requests.slice(0, 4).map((request) => (
              <div key={request.id} className="flex items-center gap-4 py-4">
                <span className={`flex h-12 w-12 items-center justify-center rounded-md ${documentKinds.includes(request.kind) ? 'bg-red-50 text-[#9d2d35]' : 'bg-emerald-50 text-emerald-800'}`}>
                  {documentKinds.includes(request.kind) ? <FileText size={20} /> : <Building2 size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{request.title} - {request.id}</p>
                  <p className="truncate text-slate-500">{request.remarks}</p>
                </div>
                <StatusPill status={request.status} />
              </div>
            ))}
          </div>
        </div>
        <AnnouncementsPanel />
      </section>
    </div>
  )
}

function RegistrarRequestsView({ activeView, onReview, requests }: { activeView: string; onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  const initialType = activeView === 'TOR Requests' ? 'TOR Request' : activeView === 'COE Requests' ? 'COE Request' : activeView === 'Exit Clearance' ? 'Exit Clearance' : 'All'
  const [typeFilter, setTypeFilter] = useState<RequestKind | 'All'>(initialType)
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All')
  const [query, setQuery] = useState('')

  const academicRequests = requests.filter((request) => documentKinds.includes(request.kind))
  const filtered = academicRequests.filter((request) => {
    const byType = typeFilter === 'All' || request.kind === typeFilter
    const byStatus = statusFilter === 'All' || request.status === statusFilter
    const byQuery = `${request.id} ${request.owner} ${request.title} ${request.remarks}`.toLowerCase().includes(query.toLowerCase())
    return byType && byStatus && byQuery
  })
  const pageTitle = typeFilter === 'TOR Request' ? 'TOR requests' : typeFilter === 'COE Request' ? 'COE requests' : typeFilter === 'Exit Clearance' ? 'Exit Clearance requests' : 'All document requests'
  const pageDescription = typeFilter === 'All' ? 'Approve or reject TOR, COE, and Exit Clearance applications.' : `Approve or reject ${getDocumentTitle(typeFilter)} applications.`

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={academicRequests.filter((request) => request.status === 'Pending').length} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="TOR" value={academicRequests.filter((request) => request.kind === 'TOR Request').length} icon={FileText} tone="bg-red-100 text-[#9d2d35]" />
        <MetricCard label="COE" value={academicRequests.filter((request) => request.kind === 'COE Request').length} icon={BadgeCheck} tone="bg-emerald-100 text-emerald-900" />
        <MetricCard label="Exit Clearance" value={academicRequests.filter((request) => request.kind === 'Exit Clearance').length} icon={ShieldCheck} tone="bg-stone-100 text-stone-700" />
      </section>

      <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-3xl font-bold">{pageTitle}</h2>
            <p className="mt-2 text-xl text-slate-600">{pageDescription}</p>
          </div>
          <label className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, name, purpose..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#9d2d35] xl:w-[390px]" />
          </label>
        </div>

        <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex w-fit rounded-full border border-[#e7e1db] bg-stone-50 p-1">
            {[
              ['All', 'All types'],
              ['TOR Request', 'TOR'],
              ['COE Request', 'COE'],
              ['Exit Clearance', 'Exit Clearance'],
            ].map(([value, label]) => (
              <button key={value} onClick={() => setTypeFilter(value as RequestKind | 'All')} className={`rounded-full px-5 py-2 font-semibold ${typeFilter === value ? 'bg-[#9d2d35] text-white' : 'text-slate-700'}`}>{label}</button>
            ))}
          </div>
          <div className="flex flex-wrap">
            {(['All', 'Pending', 'Approved', 'Rejected', 'Completed'] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-full border px-5 py-2 ${statusFilter === status ? 'border-red-300 bg-red-50 text-[#7a111b]' : 'border-[#e7e1db] hover:bg-stone-50'}`}>{status}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 text-xs font-bold uppercase tracking-widest text-slate-700 border-b-2 border-slate-200">
              <tr>
                <th className="px-7 py-5">ID</th>
                <th className="px-7 py-5">Student</th>
                <th className="px-7 py-5">Type</th>
                <th className="px-7 py-5">Purpose</th>
                <th className="px-7 py-5">Copies</th>
                <th className="px-7 py-5">Submitted</th>
                <th className="px-7 py-5">Status</th>
                <th className="px-7 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee9e4]">
              {filtered.map((request) => (
                <tr key={request.id}>
                  <td className="px-7 py-5 font-mono">{request.id}</td>
                  <td className="px-7 py-5 text-xl font-semibold">{request.owner}</td>
                  <td className="px-7 py-5"><span className="rounded-full bg-stone-100 px-3 py-1">{getDocumentTitle(request.kind)}</span></td>
                  <td className="px-7 py-5 text-xl text-slate-600">{request.remarks}</td>
                  <td className="px-7 py-5">{getCopiesForRequest(request)}</td>
                  <td className="px-7 py-5 text-slate-600">{formatShortDate(request.date)}</td>
                  <td className="px-7 py-5"><StatusPill status={request.status} /></td>
                  <td className="px-7 py-5 text-right">
                    <button onClick={() => onReview(request)} className="font-semibold text-[#7a111b]">Review</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-7 py-10 text-center text-slate-500">No document requests match this view.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function SupplyOfficeView({ activeView, categories, inventory, onInventoryChange, suppliers, onSuppliersChange, stockMovements, onStockMovementAdd, onReview, requests }: { activeView: string; categories: SupplyCategory[]; inventory: SupplyItem[]; onInventoryChange: (inventory: SupplyItem[]) => void; suppliers: SupplierInfo[]; onSuppliersChange: (suppliers: SupplierInfo[]) => void; stockMovements: StockMovement[]; onStockMovementAdd: (movements: StockMovement[]) => void; onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All')
  const [query, setQuery] = useState('')
  const supplyRequests = requests.filter((request) => ['Supply Request', 'Inventory Request'].includes(request.kind))
  const filtered = supplyRequests.filter((request) => {
    const itemText = getSupplyItems(request).map((item) => item.label).join(' ')
    const byStatus = statusFilter === 'All' || request.status === statusFilter
    const byQuery = `${request.id} ${request.owner} ${request.title} ${request.remarks} ${itemText}`.toLowerCase().includes(query.toLowerCase())
    return byStatus && byQuery
  })
  const counts = getCounts(supplyRequests)
  const total = supplyRequests.length

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={counts.Pending} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Approved" value={counts.Approved} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-800" />
        <MetricCard label="Rejected" value={counts.Rejected} icon={XCircle} tone="bg-red-100 text-red-800" />
        <MetricCard label="Total" value={total} icon={PackageCheck} tone="bg-stone-100 text-stone-700" />
      </section>

      {activeView === 'Overview' && (
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
            <h2 className="mb-5 text-2xl font-bold">Recent supply requests</h2>
            <div className="space-y-3">
              {supplyRequests.slice(0, 3).map((request) => (
                <button key={request.id} onClick={() => onReview(request)} className="flex w-full items-center gap-4 rounded-md border border-[#e7e1db] p-4 text-left hover:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold"><span className="font-mono font-normal">{request.id}</span> {request.owner}</p>
                    <p className="truncate text-slate-600">{getSupplyItems(request).map((item) => `${item.label} x${item.quantity}`).join(', ')}</p>
                  </div>
                  <span className="text-slate-500">{formatShortDate(request.date)}</span>
                  <StatusPill status={request.status} />
                </button>
              ))}
            </div>
          </div>
          <StatusBreakdownPanel counts={counts} total={total} />
        </section>
      )}

      {activeView === 'Supply Requests' && (
        <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Supply requests</h2>
              <p className="mt-2 text-xl text-slate-600">Approve supply and inventory requests from employees.</p>
            </div>
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, name, items..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#9d2d35] xl:w-[390px]" />
            </label>
          </div>
          <div className="mb-6 flex flex-wrap">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-full border px-5 py-2 ${statusFilter === status ? 'border-red-300 bg-red-50 text-[#7a111b]' : 'border-[#e7e1db] hover:bg-stone-50'}`}>{status}</button>
            ))}
          </div>
          <SupplyRequestsTable onReview={onReview} requests={filtered} />
        </section>
      )}

      {activeView === 'Inventory' && (
        <InventoryView categories={categories} inventory={inventory} onInventoryChange={onInventoryChange} suppliers={suppliers} onStockMovementAdd={onStockMovementAdd} />
      )}

      {activeView === 'Categories' && (
        <CategoriesView categories={categories} inventory={inventory} />
      )}

      {activeView === 'Stock Movements' && (
        <StockMovementsView stockMovements={stockMovements} />
      )}

      {activeView === 'Suppliers' && (
        <SuppliersView suppliers={suppliers} onSuppliersChange={onSuppliersChange} />
      )}

      {activeView === 'Reports' && (
        <AnalyticsView inventory={inventory} stockMovements={stockMovements} supplyRequests={supplyRequests} />
      )}
    </div>
  )
}

function SupplyRequestsTable({ onReview, requests }: { onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left">
        <thead className="bg-stone-50 text-sm uppercase tracking-[.12em] text-slate-600">
          <tr>
            <th className="px-7 py-5">ID</th>
            <th className="px-7 py-5">Requester</th>
            <th className="px-7 py-5">Items</th>
            <th className="px-7 py-5">Purpose</th>
            <th className="px-7 py-5">Submitted</th>
            <th className="px-7 py-5">Status</th>
            <th className="px-7 py-5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eee9e4]">
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="px-7 py-5 font-mono">{request.id}</td>
              <td className="px-7 py-5 text-xl font-semibold">{request.owner}</td>
              <td className="px-7 py-5">
                <div className="flex flex-wrap gap-2">
                  {getSupplyItems(request).map((item) => (
                    <span key={item.label} className="rounded-full bg-stone-100 px-3 py-1">{item.label} x{item.quantity}</span>
                  ))}
                </div>
              </td>
              <td className="max-w-[360px] truncate px-7 py-5 text-xl text-slate-600">{request.remarks}</td>
              <td className="px-7 py-5 text-slate-600">{formatShortDate(request.date)}</td>
              <td className="px-7 py-5"><StatusPill status={request.status} /></td>
              <td className="px-7 py-5 text-right">
                <button onClick={() => onReview(request)} className="font-semibold text-[#7a111b]">Review</button>
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={7} className="px-7 py-10 text-center text-slate-500">No supply requests match this view.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function InventoryView({ categories, inventory, onInventoryChange, onStockMovementAdd }: { categories: SupplyCategory[]; inventory: SupplyItem[]; onInventoryChange: (inventory: SupplyItem[]) => void; suppliers: SupplierInfo[]; onStockMovementAdd: (movements: StockMovement[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState<number>(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<SupplyItem | null>(null)
  const [stockChangeQty, setStockChangeQty] = useState(0)
  const [stockChangeReason, setStockChangeReason] = useState('')
  const [newItem, setNewItem] = useState({ name: '', category: '', unit: 'piece', quantity: 0, minThreshold: 10, location: '', cost: 0, supplier: '' })

  const getStockStatus = (item: SupplyItem) => {
    if (item.quantity === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' }
    if (item.quantity <= item.minThreshold) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-800' }
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-800' }
  }

  const handleUpdateQty = (id: string) => {
    const updated = inventory.map((item) => item.id === id ? { ...item, quantity: editQty } : item)
    onInventoryChange(updated)
    setEditingId(null)
  }

  const handleAddItem = () => {
    if (!newItem.name || !newItem.category) return
    const id = `INV-${Date.now()}`
    onInventoryChange([...inventory, { id, ...newItem }])
    setNewItem({ name: '', category: '', unit: 'piece', quantity: 0, minThreshold: 10, location: '', cost: 0, supplier: '' })
    setShowAddModal(false)
  }

  const inStock = inventory.filter((item) => item.quantity > 0).length
  const lowStock = inventory.filter((item) => item.quantity > 0 && item.quantity <= item.minThreshold).length
  const outOfStock = inventory.filter((item) => item.quantity === 0).length

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-3 xl:grid-cols-3">
        <MetricCard label="In Stock" value={inStock} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-800" />
        <MetricCard label="Low Stock" value={lowStock} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Out of Stock" value={outOfStock} icon={XCircle} tone="bg-red-100 text-red-800" />
      </section>

      <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Supply Inventory</h2>
            <p className="mt-2 text-xl text-slate-600">Monitor and manage current stock levels.</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 font-bold text-white hover:from-orange-600 hover:to-red-600 shadow-lg transition-all hover:shadow-xl hover:scale-105">
            <Plus size={20} />
            Add Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 text-xs font-bold uppercase tracking-widest text-slate-700 border-b-2 border-slate-200">
              <tr>
                <th className="px-7 py-5">Item Name</th>
                <th className="px-7 py-5">Category</th>
                <th className="px-7 py-5">Quantity</th>
                <th className="px-7 py-5">Unit</th>
                <th className="px-7 py-5">Min. Threshold</th>
                <th className="px-7 py-5">Location</th>
                <th className="px-7 py-5">Status</th>
                <th className="px-7 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee9e4]">
              {inventory.map((item) => {
                const status = getStockStatus(item)
                return (
                  <tr key={item.id}>
                    <td className="px-7 py-5 text-xl font-semibold">{item.name}</td>
                    <td className="px-7 py-5"><span className="rounded-full bg-stone-100 px-3 py-1 text-sm">{item.category}</span></td>
                    <td className="px-7 py-5">
                      {editingId === item.id ? (
                        <input
                          autoFocus
                          type="number"
                          min="0"
                          value={editQty}
                          onChange={(e) => setEditQty(Math.max(0, Number(e.target.value)))}
                          className="h-10 w-20 rounded border border-[#e7e1db] px-2 outline-none focus:border-[#9d2d35]"
                        />
                      ) : (
                        <span className="font-mono font-semibold text-lg">{item.quantity}</span>
                      )}
                    </td>
                    <td className="px-7 py-5 text-slate-600">{item.unit}</td>
                    <td className="px-7 py-5 text-slate-600">{item.minThreshold}</td>
                    <td className="px-7 py-5 text-slate-600">{item.location}</td>
                    <td className="px-7 py-5">
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-7 py-5 text-right">
                      {editingId === item.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleUpdateQty(item.id)} className="font-semibold text-emerald-600 hover:text-emerald-700">Save</button>
                          <button onClick={() => setEditingId(null)} className="font-semibold text-slate-400 hover:text-slate-600">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setSelectedItem(item)} className="font-semibold text-[#7a111b]">Edit</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-gradient-to-br from-white to-slate-50 p-10 shadow-2xl border border-white/20">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold">{selectedItem.name}</h2>
                <p className="mt-1 text-slate-600">{selectedItem.category} • {selectedItem.sku || 'No SKU'}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-500 hover:text-slate-700">
                <X size={28} />
              </button>
            </div>

            <div className="mb-8 grid grid-cols-4 gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-5 border border-blue-200">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Current Stock</p>
                <p className="mt-2 text-3xl font-black text-blue-900">{selectedItem.quantity}</p>
                <p className="text-xs text-blue-600 mt-1">{selectedItem.unit}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 p-5 border border-orange-200">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Min Stock Level</p>
                <p className="mt-2 text-3xl font-black text-orange-900">{selectedItem.minThreshold}</p>
                <p className="text-xs text-orange-600 mt-1">{selectedItem.unit}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-5 border border-purple-200">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Status</p>
                <p className="mt-2">
                  {selectedItem.quantity === 0 ? (
                    <span className="inline-block rounded-full bg-red-200 px-3 py-1 text-xs font-bold text-red-900">Out of Stock</span>
                  ) : selectedItem.quantity <= selectedItem.minThreshold ? (
                    <span className="inline-block rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">Low Stock</span>
                  ) : (
                    <span className="inline-block rounded-full bg-emerald-200 px-3 py-1 text-xs font-bold text-emerald-900">In Stock</span>
                  )}
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 border border-indigo-200">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Location</p>
                <p className="mt-2 text-lg font-black text-indigo-900">{selectedItem.location}</p>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4 border-t border-[#e7e1db] pt-8">
              <div>
                <p className="text-sm font-semibold text-slate-600">Unit Cost</p>
                <p className="mt-1 text-2xl font-bold">₱{selectedItem.cost || 0}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Supplier</p>
                <p className="mt-1 text-lg">{selectedItem.supplier || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Total Value</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">₱{(selectedItem.cost || 0) * selectedItem.quantity}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Expiry Date</p>
                <p className="mt-1 text-lg">{selectedItem.expiryDate || 'No expiry'}</p>
              </div>
            </div>

            <div className="mb-8 border-t border-[#e7e1db] pt-8">
              <p className="mb-4 text-sm font-semibold text-slate-700">Stock Adjustment</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={stockChangeQty}
                    onChange={(e) => setStockChangeQty(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded border border-[#e7e1db] px-3 py-2 text-center outline-none focus:border-[#9d2d35]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">Reason</label>
                  <input
                    value={stockChangeReason}
                    onChange={(e) => setStockChangeReason(e.target.value)}
                    placeholder="e.g., Restock"
                    className="w-full rounded border border-[#e7e1db] px-3 py-2 outline-none focus:border-[#9d2d35]"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => {
                      const newQty = selectedItem.quantity + stockChangeQty
                      onInventoryChange(inventory.map((item) => item.id === selectedItem.id ? { ...item, quantity: newQty } : item))
                      onStockMovementAdd && onStockMovementAdd([{
                        id: `SM-${Date.now()}`,
                        itemId: selectedItem.id,
                        itemName: selectedItem.name,
                        type: 'Stock In',
                        quantity: stockChangeQty,
                        reason: stockChangeReason || 'Stock In',
                        performedBy: 'Liza Mendoza',
                        date: new Date().toLocaleString(),
                        previousQty: selectedItem.quantity,
                        newQty,
                      }])
                      setSelectedItem({ ...selectedItem, quantity: newQty })
                      setStockChangeQty(0)
                      setStockChangeReason('')
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-bold text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                  >
                    <CheckCircle2 className="mb-1 inline mr-2" size={18} />
                    Stock In
                  </button>
                  <button
                    onClick={() => {
                      if (selectedItem.quantity < stockChangeQty) {
                        alert('Cannot remove more than available stock')
                        return
                      }
                      const newQty = selectedItem.quantity - stockChangeQty
                      onInventoryChange(inventory.map((item) => item.id === selectedItem.id ? { ...item, quantity: newQty } : item))
                      onStockMovementAdd && onStockMovementAdd([{
                        id: `SM-${Date.now()}`,
                        itemId: selectedItem.id,
                        itemName: selectedItem.name,
                        type: 'Stock Out',
                        quantity: stockChangeQty,
                        reason: stockChangeReason || 'Stock Out',
                        performedBy: 'Liza Mendoza',
                        date: new Date().toLocaleString(),
                        previousQty: selectedItem.quantity,
                        newQty,
                      }])
                      setSelectedItem({ ...selectedItem, quantity: newQty })
                      setStockChangeQty(0)
                      setStockChangeReason('')
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 py-3 font-bold text-white hover:from-red-600 hover:to-pink-600 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                  >
                    <XCircle className="mb-1 inline mr-2" size={18} />
                    Stock Out
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelectedItem(null)} className="flex-1 rounded-md border border-[#e7e1db] px-4 py-2 font-semibold hover:bg-stone-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-7 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Add New Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <label>
                <p className="mb-2 font-semibold">Item Name *</p>
                <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g., Bond Paper" className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#9d2d35]" />
              </label>
              <label>
                <p className="mb-2 font-semibold">Category *</p>
                <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#9d2d35]">
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <p className="mb-2 font-semibold">Unit</p>
                  <select value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#9d2d35]">
                    <option>piece</option>
                    <option>box</option>
                    <option>ream</option>
                    <option>pack</option>
                    <option>cartridge</option>
                  </select>
                </label>
                <label>
                  <p className="mb-2 font-semibold">Initial Qty</p>
                  <input type="number" min="0" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: Math.max(0, Number(e.target.value)) })} className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#9d2d35]" />
                </label>
              </div>
              <label>
                <p className="mb-2 font-semibold">Min Stock Alert</p>
                <input type="number" min="0" value={newItem.minThreshold} onChange={(e) => setNewItem({ ...newItem, minThreshold: Math.max(0, Number(e.target.value)) })} className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#9d2d35]" />
              </label>
              <label>
                <p className="mb-2 font-semibold">Storage Location</p>
                <input value={newItem.location} onChange={(e) => setNewItem({ ...newItem, location: e.target.value })} placeholder="e.g., Shelf A1" className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#9d2d35]" />
              </label>
              <div className="flex gap-3 pt-4">
                <button onClick={handleAddItem} className="flex-1 rounded-md bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600">Add Item</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-md border border-[#e7e1db] px-4 py-2 font-semibold hover:bg-stone-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CategoriesView({ categories, inventory }: { categories: SupplyCategory[]; inventory: SupplyItem[] }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Categories</h2>
        <p className="mt-2 text-xl text-slate-600">Organize your inventory by category</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const itemsInCat = inventory.filter((item) => item.category === category.name)
          const lowStockCount = itemsInCat.filter((item) => item.quantity > 0 && item.quantity <= item.minThreshold).length
          return (
            <div key={category.id} className="rounded-lg border border-[#e7e1db] bg-white p-7">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-xl font-bold">{category.name}</h3>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-slate-600">{itemsInCat.length} items</span>
              </div>
              {lowStockCount > 0 && (
                <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  <span className="font-semibold">{lowStockCount}</span> items low on stock
                </div>
              )}
              <div className="space-y-2">
                {itemsInCat.map((item) => {
                  const color = item.quantity === 0 ? 'text-red-600' : item.quantity <= item.minThreshold ? 'text-amber-600' : 'text-emerald-600'
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{item.name}</span>
                      <span className={`font-semibold ${color}`}>{item.quantity} {item.unit}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StockMovementsView({ stockMovements }: { stockMovements: StockMovement[] }) {
  const [typeFilter, setTypeFilter] = useState<'All' | 'Stock In' | 'Stock Out'>('All')

  const filtered = typeFilter === 'All' ? stockMovements : stockMovements.filter((move) => move.type === typeFilter)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Stock Movements</h2>
        <p className="mt-2 text-xl text-slate-600">Complete history of all stock transactions</p>
      </div>

      <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <div className="mb-6 flex flex-wrap gap-3">
          {(['All', 'Stock In', 'Stock Out'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`rounded-full border px-5 py-2 ${typeFilter === type ? 'border-red-300 bg-red-50 text-[#7a111b]' : 'border-[#e7e1db] hover:bg-stone-50'}`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-stone-50 text-sm uppercase tracking-[.12em] text-slate-600">
              <tr>
                <th className="px-7 py-5">Type</th>
                <th className="px-7 py-5">Item</th>
                <th className="px-7 py-5">Quantity</th>
                <th className="px-7 py-5">Reason</th>
                <th className="px-7 py-5">Performed By</th>
                <th className="px-7 py-5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee9e4]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-7 py-10 text-center text-slate-500">No stock movements to display.</td>
                </tr>
              ) : (
                filtered.map((move) => (
                  <tr key={move.id}>
                    <td className="px-7 py-5">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${move.type === 'Stock In' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {move.type === 'Stock In' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        {move.type}
                      </span>
                    </td>
                    <td className="px-7 py-5 font-semibold">{move.itemName}</td>
                    <td className="px-7 py-5">{move.quantity} {move.itemId}</td>
                    <td className="px-7 py-5 text-slate-600">{move.reason}</td>
                    <td className="px-7 py-5">{move.performedBy}</td>
                    <td className="px-7 py-5 text-slate-600">{move.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SuppliersView({ suppliers, onSuppliersChange }: { suppliers: SupplierInfo[]; onSuppliersChange: (suppliers: SupplierInfo[]) => void }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', email: '', leadTime: 3 })

  const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleAddSupplier = () => {
    if (!newSupplier.name || !newSupplier.email) return
    onSuppliersChange([...suppliers, { id: `SUP-${Date.now()}`, ...newSupplier }])
    setNewSupplier({ name: '', contact: '', email: '', leadTime: 3 })
    setShowAddModal(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Suppliers</h2>
        <p className="mt-2 text-xl text-slate-600">Manage your supply chain partners and contacts.</p>
      </div>

      <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <div className="mb-6 flex items-center justify-between">
          <label className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search suppliers..." className="w-full rounded-md border border-[#e7e1db] bg-stone-50 py-2 pl-12 pr-4 outline-none focus:border-[#9d2d35]" />
          </label>
          <button onClick={() => setShowAddModal(true)} className="ml-4 flex h-10 items-center gap-2 rounded-md bg-orange-500 px-5 font-semibold text-white hover:bg-orange-600">
            <Plus size={18} />
            Add Supplier
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((supplier) => (
            <div key={supplier.id} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-7 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-black text-slate-900">{supplier.name}</h3>
                <span className="text-2xl">🤝</span>
              </div>
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2 text-slate-700"><span className="text-lg">📞</span> {supplier.contact}</p>
                <p className="flex items-center gap-2 text-slate-700"><span className="text-lg">📧</span> {supplier.email}</p>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-bold uppercase text-slate-500">Lead Time</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">{supplier.leadTime} days</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-7 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Add Supplier</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <label>
                <p className="mb-2 font-semibold">Supplier Name *</p>
                <input value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} placeholder="e.g., Premium Papers Inc." className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#9d2d35]" />
              </label>
              <label>
                <p className="mb-2 font-semibold">Contact Number</p>
                <input value={newSupplier.contact} onChange={(e) => setNewSupplier({ ...newSupplier, contact: e.target.value })} placeholder="e.g., +63-2-8234-5678" className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#9d2d35]" />
              </label>
              <label>
                <p className="mb-2 font-semibold">Email *</p>
                <input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} placeholder="supplier@example.com" className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#9d2d35]" />
              </label>
              <label>
                <p className="mb-2 font-semibold">Lead Time (days)</p>
                <input type="number" min="1" value={newSupplier.leadTime} onChange={(e) => setNewSupplier({ ...newSupplier, leadTime: Math.max(1, Number(e.target.value)) })} className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#9d2d35]" />
              </label>
              <div className="flex gap-3 pt-4">
                <button onClick={handleAddSupplier} className="flex-1 rounded-md bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600">Add Supplier</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-md border border-[#e7e1db] px-4 py-2 font-semibold hover:bg-stone-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AnalyticsView({ inventory, stockMovements, supplyRequests }: { inventory: SupplyItem[]; stockMovements: StockMovement[]; supplyRequests: PortalRequest[] }) {
  const totalValue = inventory.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0)
  const avgTurnover = stockMovements.length > 0 ? (stockMovements.filter((m) => m.type === 'Stock Out').length / stockMovements.length * 100).toFixed(1) : '0'
  const lowStockItems = inventory.filter((item) => item.quantity > 0 && item.quantity <= item.minThreshold).length
  const stockOutItems = inventory.filter((item) => item.quantity === 0).length

  const topMovedItems = inventory
    .map((item) => ({
      name: item.name,
      movements: stockMovements.filter((m) => m.itemId === item.id).length,
    }))
    .sort((a, b) => b.movements - a.movements)
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Analytics & Reports</h2>
        <p className="mt-2 text-xl text-slate-600">Inventory insights and performance metrics.</p>
      </div>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Inventory Value" value={`₱${totalValue.toLocaleString()}`} icon={PackageCheck} tone="bg-blue-100 text-blue-800" />
        <MetricCard label="Stock Turnover" value={`${avgTurnover}%`} icon={Layers3} tone="bg-green-100 text-green-800" />
        <MetricCard label="Low Stock Items" value={lowStockItems} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Out of Stock" value={stockOutItems} icon={XCircle} tone="bg-red-100 text-red-800" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg hover:shadow-xl transition-all">
          <h2 className="mb-8 text-2xl font-bold text-slate-900">📊 Top Moved Items</h2>
          <div className="space-y-4">
            {topMovedItems.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-50 to-transparent hover:from-orange-100 transition-all">
                <div className="flex items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-md">{idx + 1}</span>
                  <span className="font-semibold text-slate-900">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">{item.movements} moves</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg hover:shadow-xl transition-all">
          <h2 className="mb-8 text-2xl font-bold text-slate-900">📋 Supply Requests</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all">
              <span className="font-semibold text-slate-700">Total Requests</span>
              <span className="text-2xl font-black text-slate-900 bg-white px-4 py-2 rounded-lg">{supplyRequests.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-100 hover:bg-amber-200 transition-all">
              <span className="font-semibold text-amber-900">Pending</span>
              <span className="text-lg font-bold text-amber-900 bg-white px-3 py-1 rounded">{supplyRequests.filter((r) => r.status === 'Pending').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 transition-all">
              <span className="font-semibold text-emerald-900">Approved</span>
              <span className="text-lg font-bold text-emerald-900 bg-white px-3 py-1 rounded">{supplyRequests.filter((r) => r.status === 'Approved').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-100 hover:bg-blue-200 transition-all">
              <span className="font-semibold text-blue-900">Completed</span>
              <span className="text-lg font-bold text-blue-900 bg-white px-3 py-1 rounded">{supplyRequests.filter((r) => r.status === 'Completed').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminOfficeView({ activeView, onReview, requests }: { activeView: string; onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All')
  const [query, setQuery] = useState('')
  const reservations = requests.filter((request) => request.kind === 'Facility Reservation')
  const filtered = reservations.filter((request) => {
    const byStatus = statusFilter === 'All' || request.status === statusFilter
    const byQuery = `${request.id} ${request.owner} ${request.facility} ${request.remarks}`.toLowerCase().includes(query.toLowerCase())
    return byStatus && byQuery
  })
  const counts = getCounts(reservations)
  const total = reservations.length
  const today = '2026-06-03'
  const todaysReservations = reservations.filter((request) => request.date === today && request.status !== 'Rejected')
  const upcomingApproved = reservations
    .filter((request) => request.status === 'Approved')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={counts.Pending} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Approved" value={counts.Approved} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-800" />
        <MetricCard label="Rejected" value={counts.Rejected} icon={XCircle} tone="bg-red-100 text-red-800" />
        <MetricCard label="Total" value={total} icon={Building2} tone="bg-stone-100 text-stone-700" />
      </section>

      {activeView === 'Overview' && (
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
            <h2 className="mb-6 text-2xl font-bold">Today's reservations</h2>
            <div className="space-y-3">
              {todaysReservations.map((request) => (
                <button key={request.id} onClick={() => onReview(request)} className="flex w-full items-center gap-4 rounded-md border border-[#e7e1db] p-4 text-left hover:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold">{request.facility}</p>
                    <p className="text-slate-600">{request.owner} - {request.time}</p>
                  </div>
                  <StatusPill status={request.status} />
                </button>
              ))}
              {todaysReservations.length === 0 && <p className="py-20 text-center text-lg text-slate-500">No reservations for today.</p>}
            </div>
          </div>
          <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
            <h2 className="mb-6 text-2xl font-bold">Upcoming approved</h2>
            <div className="space-y-3">
              {upcomingApproved.slice(0, 4).map((request) => (
                <button key={request.id} onClick={() => onReview(request)} className="grid w-full grid-cols-[1fr_auto] gap-4 rounded-md border border-[#e7e1db] p-4 text-left hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{request.facility}</p>
                    <p className="text-slate-600">{request.owner}</p>
                  </div>
                  <div className="text-right text-slate-600">
                    <p className="font-semibold text-slate-800">{formatShortDate(request.date)}</p>
                    <p>{request.time.replace('-', ' - ')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeView === 'Facility Reservations' && (
        <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Facility reservations</h2>
              <p className="mt-2 text-xl text-slate-600">Approve or reject room, lab, and AVR reservations.</p>
            </div>
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, name, facility..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#9d2d35] xl:w-[390px]" />
            </label>
          </div>
          <div className="mb-6 flex flex-wrap">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-full border px-5 py-2 ${statusFilter === status ? 'border-red-300 bg-red-50 text-[#7a111b]' : 'border-[#e7e1db] hover:bg-stone-50'}`}>{status}</button>
            ))}
          </div>
          <FacilityReservationsTable onReview={onReview} requests={filtered} />
        </section>
      )}

      {activeView === 'Reports' && (
        <section className="grid gap-6 xl:grid-cols-2">
          <StatusBreakdownPanel counts={counts} total={total} title="Reservation status" />
          <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
            <h2 className="mb-6 text-2xl font-bold">Most booked facilities</h2>
            <div className="space-y-4">
              {getTopFacilities(reservations).map((item, index) => (
                <div key={item.facility} className="grid grid-cols-[32px_1fr_auto] items-center gap-4 text-lg">
                  <span className="font-bold text-slate-500">{index + 1}</span>
                  <span>{item.facility}</span>
                  <span className="text-right font-semibold text-slate-500">{item.count} {item.count === 1 ? 'booking' : 'bookings'}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function FacilityReservationsTable({ onReview, requests }: { onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left">
        <thead className="bg-stone-50 text-sm uppercase tracking-[.12em] text-slate-600">
          <tr>
            <th className="px-7 py-5">ID</th>
            <th className="px-7 py-5">Requester</th>
            <th className="px-7 py-5">Facility</th>
            <th className="px-7 py-5">Date & Time</th>
            <th className="px-7 py-5">Attendees</th>
            <th className="px-7 py-5">Status</th>
            <th className="px-7 py-5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eee9e4]">
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="px-7 py-5 font-mono">{request.id}</td>
              <td className="px-7 py-5 text-xl font-semibold">{request.owner}</td>
              <td className="px-7 py-5">
                <span className="rounded-full bg-stone-100 px-3 py-1">{getFacilityType(request.facility)}</span>
                <p className="mt-2 text-lg text-slate-600">{request.facility}</p>
              </td>
              <td className="px-7 py-5 text-slate-600">
                <p>{formatShortDate(request.date)}</p>
                <p>{request.time.replace('-', ' - ')}</p>
              </td>
              <td className="px-7 py-5 text-xl">{getAttendeeCount(request)}</td>
              <td className="px-7 py-5"><StatusPill status={request.status} /></td>
              <td className="px-7 py-5 text-right">
                <button onClick={() => onReview(request)} className="font-semibold text-[#7a111b]">Review</button>
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={7} className="px-7 py-10 text-center text-slate-500">No facility reservations match this view.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function HrOfficeView({ activeView, onReview, requests }: { activeView: string; onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  const [typeFilter, setTypeFilter] = useState<RequestKind | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All')
  const [query, setQuery] = useState('')
  const leaveApplications = requests.filter((request) => isLeaveApplication(request))
  const filtered = leaveApplications.filter((request) => {
    const byType = typeFilter === 'All' || request.kind === typeFilter
    const byStatus = statusFilter === 'All' || request.status === statusFilter
    const byQuery = `${request.id} ${request.owner} ${request.remarks} ${getLeaveTypeLabel(request.kind)}`.toLowerCase().includes(query.toLowerCase())
    return byType && byStatus && byQuery
  })
  const counts = getCounts(leaveApplications)
  const total = leaveApplications.length
  const approvedRate = total ? Math.round((counts.Approved / total) * 100) : 0

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={counts.Pending} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Approved" value={counts.Approved} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-800" />
        <MetricCard label="Rejected" value={counts.Rejected} icon={XCircle} tone="bg-red-100 text-red-800" />
        <MetricCard label="Total" value={total} icon={CalendarClock} tone="bg-stone-100 text-stone-700" />
      </section>

      {activeView === 'Overview' && (
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
            <h2 className="mb-6 text-2xl font-bold">Recent leave applications</h2>
            <div className="space-y-3">
              {leaveApplications.map((request) => (
                <button key={request.id} onClick={() => onReview(request)} className="grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-md border border-[#e7e1db] p-4 text-left hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="font-semibold"><span className="font-mono font-normal">{request.id}</span> {request.owner}</p>
                    <p className="text-slate-600">{getLeaveTypeLabel(request.kind)} - {getLeaveDateRange(request)}</p>
                  </div>
                  <StatusPill status={request.status} />
                </button>
              ))}
            </div>
          </div>
          <LeaveTypeBreakdownPanel requests={leaveApplications} />
        </section>
      )}

      {activeView === 'Leave Applications' && (
        <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Leave applications</h2>
              <p className="mt-2 text-xl text-slate-600">Approve vacation, sick, personal, and official leave applications.</p>
            </div>
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, name, reason..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#9d2d35] xl:w-[390px]" />
            </label>
          </div>
          <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex w-fit rounded-full border border-[#e7e1db] bg-stone-50 p-1">
              {[
                ['All', 'All types'],
                ['Vacation Leave', 'Vacation'],
                ['Sick Leave', 'Sick'],
                ['Personal Leave', 'Personal'],
                ['Official Leave', 'Official'],
              ].map(([value, label]) => (
                <button key={value} onClick={() => setTypeFilter(value as RequestKind | 'All')} className={`rounded-full px-5 py-2 font-semibold ${typeFilter === value ? 'bg-[#9d2d35] text-white' : 'text-slate-700'}`}>{label}</button>
              ))}
            </div>
            <div className="flex flex-wrap">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-full border px-5 py-2 ${statusFilter === status ? 'border-red-300 bg-red-50 text-[#7a111b]' : 'border-[#e7e1db] hover:bg-stone-50'}`}>{status}</button>
              ))}
            </div>
          </div>
          <LeaveApplicationsTable onReview={onReview} requests={filtered} />
        </section>
      )}

      {activeView === 'Reports' && (
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-2">
            <StatusBreakdownPanel counts={counts} total={total} title="Applications by status" />
            <LeaveTypeDistributionPanel requests={leaveApplications} />
          </section>
          <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
            <h2 className="mb-6 text-2xl font-bold">Summary</h2>
            <div className="grid gap-5 text-xl md:grid-cols-3">
              {[
                ['Total applications', total],
                ['Pending', counts.Pending],
                ['Approval rate', `${approvedRate}%`],
                ['Approved', counts.Approved],
                ['Rejected', counts.Rejected],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-bold">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function LeaveApplicationsTable({ onReview, requests }: { onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left">
        <thead className="bg-stone-50 text-sm uppercase tracking-[.12em] text-slate-600">
          <tr>
            <th className="px-7 py-5">ID</th>
            <th className="px-7 py-5">Employee</th>
            <th className="px-7 py-5">Type</th>
            <th className="px-7 py-5">Dates</th>
            <th className="px-7 py-5">Reason</th>
            <th className="px-7 py-5">Status</th>
            <th className="px-7 py-5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eee9e4]">
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="px-7 py-5 font-mono">{request.id}</td>
              <td className="px-7 py-5 text-xl font-semibold">{request.owner}</td>
              <td className="px-7 py-5"><span className="rounded-full bg-stone-100 px-3 py-1">{getLeaveTypeLabel(request.kind)}</span></td>
              <td className="px-7 py-5 text-slate-600">{getLeaveDateRange(request)}</td>
              <td className="max-w-[420px] truncate px-7 py-5 text-xl text-slate-600">{request.remarks}</td>
              <td className="px-7 py-5"><StatusPill status={request.status} /></td>
              <td className="px-7 py-5 text-right">
                <button onClick={() => onReview(request)} className="font-semibold text-[#7a111b]">Review</button>
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={7} className="px-7 py-10 text-center text-slate-500">No leave applications match this view.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function LeaveTypeBreakdownPanel({ requests }: { requests: PortalRequest[] }) {
  const total = requests.length
  const rows = getLeaveTypeRows(requests)

  return (
    <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <h2 className="mb-6 text-2xl font-bold">Leave type breakdown</h2>
      <div className="space-y-5">
        {rows.map((row) => {
          const percent = total ? (row.count / total) * 100 : 0
          return (
            <div key={row.label}>
              <div className="mb-2 flex justify-between text-lg">
                <span>{row.label}</span>
                <span className="font-semibold">{row.count} ({percent.toFixed(1)}%)</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LeaveTypeDistributionPanel({ requests }: { requests: PortalRequest[] }) {
  return (
    <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <h2 className="mb-6 text-2xl font-bold">Leave type distribution</h2>
      <div className="space-y-4">
        {getLeaveTypeRows(requests).map((row, index) => (
          <div key={row.label} className="grid grid-cols-[32px_1fr_auto] items-center gap-4 text-lg">
            <span className="font-bold text-slate-500">{index + 1}</span>
            <span>{row.label}</span>
            <span className="text-right font-semibold text-slate-500">{row.count} {row.count === 1 ? 'app' : 'apps'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmployeePortalView({ activeView, existingRequests, onSubmit, onView, onViewRequest, requests, user }: { activeView: string; existingRequests: PortalRequest[]; onSubmit: (request: PortalRequest) => void; onView: (view: string) => void; onViewRequest: (request: PortalRequest) => void; requests: PortalRequest[]; user: User }) {
  const employeeRequests = requests.filter((request) => isEmployeePortalRequest(request))
  const counts = getCounts(employeeRequests)
  const total = employeeRequests.length

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={counts.Pending} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Approved" value={counts.Approved} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-800" />
        <MetricCard label="Rejected" value={counts.Rejected} icon={XCircle} tone="bg-red-100 text-red-800" />
        <MetricCard label="Total" value={total} icon={Layers3} tone="bg-stone-100 text-stone-700" />
      </section>

      {activeView === 'Overview' && <EmployeeOverviewCards onView={onView} />}
      {activeView === 'File Leave' && <EmployeeFileLeaveView onSubmit={onSubmit} user={user} />}
      {activeView === 'Request Supplies' && <EmployeeSupplyRequestView onSubmit={onSubmit} user={user} />}
      {activeView === 'Reserve Facility' && <EmployeeReserveFacilityView existingRequests={existingRequests} onSubmit={onSubmit} user={user} />}
      {activeView === 'My Requests' && <EmployeeRequestsView onView={onViewRequest} requests={employeeRequests} />}
      {activeView === 'Room Availability' && <RoomAvailabilityView requests={existingRequests} />}
    </div>
  )
}

function EmployeeOverviewCards({ onView }: { onView: (view: string) => void }) {
  const cards = [
    { title: 'File Leave', description: 'Submit vacation, sick, personal, or official leave', icon: CalendarClock, tone: 'bg-emerald-100 text-emerald-900', view: 'File Leave' },
    { title: 'Request Supplies', description: 'Order office supplies and materials', icon: PackageCheck, tone: 'bg-amber-100 text-amber-900', view: 'Request Supplies', highlighted: true },
    { title: 'Reserve Facility', description: 'Book rooms, labs, or AVRs', icon: Building2, tone: 'bg-red-100 text-[#9d2d35]', view: 'Reserve Facility' },
  ]

  return (
    <section className="grid gap-5 xl:grid-cols-3">
      {cards.map(({ description, highlighted, icon: Icon, title, tone, view }) => (
        <button key={title} onClick={() => onView(view)} className={`group rounded-lg border bg-white p-7 text-left transition hover:border-[#9d2d35] ${highlighted ? 'border-red-300 ring-1 ring-red-200' : 'border-[#e7e1db]'}`}>
          <div className="mb-14 flex items-start justify-between">
            <span className={`flex h-14 w-14 items-center justify-center rounded-md ${tone}`}><Icon size={23} /></span>
            <ChevronDown className="-rotate-90 text-slate-400 group-hover:text-[#7a111b]" size={20} />
          </div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-2 text-lg text-slate-600">{description}</p>
        </button>
      ))}
    </section>
  )
}

function EmployeeFileLeaveView({ onSubmit, user }: { onSubmit: (request: PortalRequest) => void; user: User }) {
  const [kind, setKind] = useState<RequestKind>('Vacation Leave')
  const [startDate, setStartDate] = useState('2026-06-03')
  const [endDate, setEndDate] = useState('2026-06-03')
  const [reason, setReason] = useState('')
  const duration = getDateDuration(startDate, endDate)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reason.trim()) return
    onSubmit({
      id: `LV-2026-${Date.now().toString().slice(-3)}`,
      title: getLeaveTypeLabel(kind),
      kind,
      ownerId: user.id,
      owner: user.name,
      office: 'HR Office',
      status: 'Pending',
      date: startDate,
      time: endDate,
      remarks: reason.trim(),
    })
    setReason('')
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <p className="mb-4 text-lg font-medium">Leave type</p>
      <div className="grid gap-4 lg:grid-cols-4">
        {leaveKinds.map((item) => {
          const selected = kind === item
          const Icon = item === 'Sick Leave' ? Info : item === 'Personal Leave' ? User : item === 'Official Leave' ? PackageCheck : CalendarClock
          return (
            <button key={item} type="button" onClick={() => setKind(item)} className={`flex min-h-32 flex-col items-center justify-center gap-4 rounded-lg border p-5 text-center text-lg font-semibold ${selected ? 'border-[#bd4448] bg-red-50/40 ring-1 ring-[#bd4448]' : 'border-[#e7e1db] hover:border-[#bd4448]'}`}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-md ${selected ? 'bg-[#9d2d35] text-white' : 'bg-stone-100 text-[#7a111b]'}`}><Icon size={22} /></span>
              {item}
            </button>
          )
        })}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label>
          <span className="mb-2 block font-medium">Start date</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">End date</span>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
        </label>
      </div>
      <p className="mt-4 text-slate-600">Duration: {duration} day(s)</p>
      <label className="mt-5 block">
        <span className="mb-2 block font-medium">Reason</span>
        <textarea value={reason} onChange={(event) => setReason(event.target.value.slice(0, 500))} rows={5} placeholder="Describe the reason for your leave..." className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 text-lg outline-none focus:border-[#9d2d35]" />
      </label>
      <p className="mt-2 text-slate-500">{reason.length} / 500</p>
      <button className="mt-6 inline-flex h-14 items-center gap-3 rounded-md bg-[#9d2d35] px-7 text-lg font-semibold text-white hover:bg-[#7a111b]">
        <Send size={19} />
        Submit leave application
      </button>
    </form>
  )
}

function EmployeeSupplyRequestView({ onSubmit, user }: { onSubmit: (request: PortalRequest) => void; user: User }) {
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('pcs')
  const [purpose, setPurpose] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!itemName.trim() || !purpose.trim()) return
    onSubmit({
      id: `SR-2026-${Date.now().toString().slice(-3)}`,
      title: itemName.trim(),
      kind: 'Supply Request',
      ownerId: user.id,
      owner: user.name,
      office: 'Supply Office',
      status: 'Pending',
      date: '2026-06-03',
      time: '09:00',
      remarks: purpose.trim(),
    })
    setItemName('')
    setQuantity(1)
    setPurpose('')
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-medium">Items needed</p>
        <button type="button" className="inline-flex items-center gap-2 font-medium text-[#7a111b]"><Plus size={16} />Add item</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_120px]">
        <input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Item name" className="h-14 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
        <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="h-14 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
        <select value={unit} onChange={(event) => setUnit(event.target.value)} className="h-14 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]">
          {['pcs', 'reams', 'boxes', 'sets'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <label className="mt-5 block">
        <span className="mb-2 block font-medium">Purpose</span>
        <textarea value={purpose} onChange={(event) => setPurpose(event.target.value.slice(0, 500))} rows={5} placeholder="Why are these supplies needed?" className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 text-lg outline-none focus:border-[#9d2d35]" />
      </label>
      <button className="mt-6 inline-flex h-14 items-center gap-3 rounded-md bg-[#9d2d35] px-7 text-lg font-semibold text-white hover:bg-[#7a111b]">
        <Send size={19} />
        Submit supply request
      </button>
    </form>
  )
}

function EmployeeReserveFacilityView({ existingRequests, onSubmit, user }: { existingRequests: PortalRequest[]; onSubmit: (request: PortalRequest) => void; user: User }) {
  const [facility, setFacility] = useState(facilities[0][0])
  const [date, setDate] = useState('2026-06-03')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('11:00')
  const [attendees, setAttendees] = useState(10)
  const [purpose, setPurpose] = useState('')
  const [error, setError] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!purpose.trim()) return
    if (hasFacilityConflict(existingRequests, date, `${start}-${end}`, facility)) {
      setError(`${facility} already has a booking for that schedule.`)
      return
    }
    onSubmit({
      id: `FR-2026-${Date.now().toString().slice(-3)}`,
      title: facility,
      kind: 'Facility Reservation',
      ownerId: user.id,
      owner: user.name,
      office: 'Admin Office',
      status: 'Pending',
      date,
      time: `${start}-${end}`,
      remarks: purpose.trim(),
      facility,
      attendees,
      purpose: purpose.trim(),
    })
    setPurpose('')
    setError('')
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <label className="block">
        <span className="mb-2 block font-medium">Facility</span>
        <select value={facility} onChange={(event) => setFacility(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]">
          {facilities.map(([name, type]) => <option key={name} value={name}>{name} - {type}</option>)}
        </select>
      </label>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <label>
          <span className="mb-2 block font-medium">Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">Start</span>
          <input type="time" value={start} onChange={(event) => setStart(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">End</span>
          <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
        </label>
      </div>
      <label className="mt-5 block">
        <span className="mb-2 block font-medium">Attendees</span>
        <input type="number" min={1} value={attendees} onChange={(event) => setAttendees(Number(event.target.value))} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
      </label>
      <label className="mt-5 block">
        <span className="mb-2 block font-medium">Purpose</span>
        <textarea value={purpose} onChange={(event) => setPurpose(event.target.value.slice(0, 500))} rows={5} placeholder="Describe the activity..." className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 text-lg outline-none focus:border-[#9d2d35]" />
      </label>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-red-700">{error}</p>}
      <button className="mt-6 inline-flex h-14 items-center gap-3 rounded-md bg-[#9d2d35] px-7 text-lg font-semibold text-white hover:bg-[#7a111b]">
        <Send size={19} />
        Submit reservation
      </button>
    </form>
  )
}

function EmployeeRequestsView({ onView, requests }: { onView: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#e7e1db] bg-white p-7">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left">
          <thead className="bg-stone-50 text-sm uppercase tracking-[.12em] text-slate-600">
            <tr>
              <th className="px-7 py-5">ID</th>
              <th className="px-7 py-5">Type</th>
              <th className="px-7 py-5">Details</th>
              <th className="px-7 py-5">Date</th>
              <th className="px-7 py-5">Status</th>
              <th className="px-7 py-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee9e4]">
            {requests.map((request) => (
              <tr key={request.id}>
                <td className="px-7 py-5 font-mono">{request.id}</td>
                <td className="px-7 py-5"><span className={`rounded-full px-3 py-1 ${getEmployeeTypeTone(request)}`}>{getEmployeeRequestType(request)}</span></td>
                <td className="px-7 py-5">
                  <p className="text-xl font-semibold">{getEmployeeRequestTitle(request)}</p>
                  <p className="max-w-[520px] truncate text-slate-600">{getEmployeeRequestDetails(request)}</p>
                </td>
                <td className="px-7 py-5 text-slate-600">{formatShortDate(request.date)}</td>
                <td className="px-7 py-5"><StatusPill status={request.status} /></td>
                <td className="px-7 py-5 text-right">
                  <div className="flex justify-end gap-4">
                    {request.kind === 'Facility Reservation' && (
                      <button type="button" onClick={() => printFacilityBookingForm(request)} className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                        <Printer size={16} />
                        Print
                      </button>
                    )}
                    <button type="button" onClick={() => onView(request)} className="font-semibold text-[#7a111b]">View</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SystemAdminView({ activeView, onViewRequest, requests }: { activeView: string; onViewRequest: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  const { accounts } = useAuth()
  const adminRequests = getSystemAdminRequests(requests)
  const stats = getAdminStats(adminRequests, accounts)

  return (
    <div className="space-y-8">
      <AdminMetricsRow stats={stats} />
      {activeView === 'Overview' && <AdminOverview accounts={accounts} requests={adminRequests} stats={stats} />}
      {activeView === 'Users' && <AdminUsersView />}
      {activeView === 'All Requests' && <AdminAllRequestsView onViewRequest={onViewRequest} requests={adminRequests} />}
      {activeView === 'Reports' && <AdminReportsView accounts={accounts} requests={adminRequests} stats={stats} />}
      {activeView === 'Activity Logs' && <AdminActivityLogsView requests={adminRequests} />}
      {activeView === 'Settings' && <AdminSettingsView />}
    </div>
  )
}

function AdminMetricsRow({ stats }: { stats: ReturnType<typeof getAdminStats> }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
      {[
        ['Pending', stats.pending],
        ['Approved', stats.approved],
        ['Documents', stats.documents],
        ['Facilities', stats.facilities],
        ['Supplies', stats.supplies],
        ['Leaves', stats.leaves],
        ['Users', stats.users],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg border border-[#e7e1db] bg-white p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[.14em] text-slate-500">{label}</p>
          <p className="mt-3 text-4xl font-bold">{value}</p>
        </div>
      ))}
    </section>
  )
}

function AdminOverview({ accounts, requests, stats }: { accounts: User[]; requests: PortalRequest[]; stats: ReturnType<typeof getAdminStats> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <h2 className="mb-6 text-2xl font-bold">System at a glance</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ['Student requests (docs)', stats.documents],
            ['Facility reservations', stats.facilities],
            ['Supply requests', stats.supplies],
            ['Leave applications', stats.leaves],
            ['Registered users', accounts.length],
            ['Approval rate', `${stats.approvalRate}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-[#e7e1db] bg-stone-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[.14em] text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <h2 className="mb-6 text-2xl font-bold">Recent activity</h2>
        <div className="space-y-5">
          {getAdminActivityLogs(requests).slice(0, 8).map((log) => (
            <div key={`${log.timestamp}-${log.target}-${log.action}`} className="flex gap-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${log.action === 'approved' ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-slate-700'}`}>
                {log.action === 'approved' ? <CheckCircle2 size={18} /> : <Plus size={18} />}
              </span>
              <div>
                <p className="text-lg"><span className="font-bold">{log.user}</span> {log.action} - {log.target}</p>
                <p className="text-slate-500">{log.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AdminUsersView() {
  const { accounts, addAccount, deleteAccount, updateAccount } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (account: User) => {
    setEditing(account)
    setFormOpen(true)
  }

  return (
    <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">User accounts</h2>
          <p className="text-lg text-slate-600">All registered users in the system.</p>
        </div>
        <button onClick={openCreate} className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#9d2d35] px-6 font-semibold text-white">
          <Plus size={18} />
          Add user
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left">
          <thead className="bg-stone-50 text-sm uppercase tracking-[.12em] text-slate-600">
            <tr>
              <th className="px-6 py-5">User</th>
              <th className="px-6 py-5">Email</th>
              <th className="px-6 py-5">Role</th>
              <th className="px-6 py-5">Department</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee9e4]">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <Avatar user={account} size="md" />
                    <span className="text-xl font-semibold">{account.name}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-slate-600">{account.email}</td>
                <td className="px-6 py-5"><span className="rounded-full bg-stone-100 px-3 py-1">{roleMeta[account.role].label}</span></td>
                <td className="px-6 py-5 text-slate-600">{account.department || '-'}</td>
                <td className="px-6 py-5"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-900 ring-1 ring-emerald-300"><ShieldCheck size={15} />Active</span></td>
                <td className="px-6 py-5 text-right">
                  <button onClick={() => openEdit(account)} className="mr-4 font-semibold text-[#7a111b]">View</button>
                  <button onClick={() => openEdit(account)} className="mr-4 font-medium text-slate-600">Edit</button>
                  <button disabled={account.role === 'admin'} onClick={() => deleteAccount(account.id)} className="font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-35">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {formOpen && (
        <AdminUserForm
          account={editing}
          onClose={() => setFormOpen(false)}
          onSubmit={(payload) => {
            if (editing) updateAccount(editing.id, payload)
            else addAccount({ ...payload, password: 'password123' })
            setFormOpen(false)
          }}
        />
      )}
    </section>
  )
}

function AdminUserForm({ account, onClose, onSubmit }: { account: User | null; onClose: () => void; onSubmit: (payload: Omit<User, 'id' | 'password'>) => void }) {
  const [name, setName] = useState(account?.name ?? '')
  const [email, setEmail] = useState(account?.email ?? '')
  const [role, setRole] = useState<Role>(account?.role ?? 'student')
  const [department, setDepartment] = useState(account?.department ?? '')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !email.trim()) return
    onSubmit({ name: name.trim(), email: email.trim().toLowerCase(), role, department: department.trim() || roleMeta[role].label })
  }

  return (
    <Modal title={account ? 'Edit user' : 'Add new user'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <span className="mb-2 block font-medium">Full name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Juan Dela Cruz" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
        </label>
        <label className="block">
          <span className="mb-2 block font-medium">Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="e.g. juan@student.edu" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
        </label>
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <span className="mb-2 block font-medium">Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]">
              {Object.entries(roleMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block font-medium">Department</span>
            <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. College of Science" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
          </label>
        </div>
        <p className="rounded-md border border-[#e7e1db] bg-stone-50 p-4 text-slate-600">Default password will be <span className="font-bold">password123</span>.</p>
        <div className="flex justify-end gap-3 border-t border-[#e7e1db] pt-5">
          <button type="button" onClick={onClose} className="h-12 rounded-md border border-[#d9d3cc] px-6 font-semibold">Cancel</button>
          <button className="h-12 rounded-md bg-[#9d2d35] px-6 font-semibold text-white">{account ? 'Save user' : 'Create user'}</button>
        </div>
      </form>
    </Modal>
  )
}

function AdminAllRequestsView({ onViewRequest, requests }: { onViewRequest: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'All' | 'Document' | 'Facility' | 'Supply' | 'Leave'>('All')
  const [status, setStatus] = useState<Status | 'All'>('All')
  const filtered = requests.filter((request) => {
    const requestType = getAdminRequestType(request)
    const byType = type === 'All' || requestType === type
    const byStatus = status === 'All' || request.status === status
    const byQuery = `${request.id} ${request.owner} ${request.title} ${request.remarks}`.toLowerCase().includes(query.toLowerCase())
    return byType && byStatus && byQuery
  })

  return (
    <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
        <label className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID or name..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#9d2d35]" />
        </label>
        <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-14 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]">
          {(['All', 'Document', 'Facility', 'Supply', 'Leave'] as const).map((item) => <option key={item} value={item}>{item === 'All' ? 'All types' : item}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as Status | 'All')} className="h-14 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]">
          {(['All', 'Pending', 'Approved', 'Rejected', 'Completed'] as const).map((item) => <option key={item} value={item}>{item === 'All' ? 'All status' : item}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead className="bg-stone-50 text-sm uppercase tracking-[.12em] text-slate-600">
            <tr>
              <th className="px-6 py-5">ID</th>
              <th className="px-6 py-5">Type</th>
              <th className="px-6 py-5">Requester</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5">Date</th>
              <th className="px-6 py-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee9e4]">
            {filtered.map((request) => (
              <tr key={request.id}>
                <td className="px-6 py-5 font-mono">{request.id}</td>
                <td className="px-6 py-5"><span className={`rounded-full px-3 py-1 ${getAdminTypeTone(request)}`}>{getAdminRequestType(request)}</span></td>
                <td className="px-6 py-5 text-xl">{request.owner}</td>
                <td className="px-6 py-5"><StatusPill status={request.status} /></td>
                <td className="px-6 py-5 text-slate-600">{formatShortDate(request.date)}</td>
                <td className="px-6 py-5 text-right"><button onClick={() => onViewRequest(request)} className="font-semibold text-[#7a111b]">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AdminReportsView({ accounts, requests, stats }: { accounts: User[]; requests: PortalRequest[]; stats: ReturnType<typeof getAdminStats> }) {
  const typeRows = getAdminTypeRows(requests)

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-2">
        <StatusBreakdownPanel counts={getCounts(requests)} total={requests.length} title="Requests by status" />
        <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <h2 className="mb-6 text-2xl font-bold">Requests by type</h2>
          <div className="space-y-5">
            {typeRows.map((row) => {
              const percent = requests.length ? (row.count / requests.length) * 100 : 0
              return (
                <div key={row.label}>
                  <div className="mb-2 flex justify-between text-lg">
                    <span>{row.label}</span>
                    <span className="font-semibold">{row.count} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <h2 className="mb-6 text-2xl font-bold">Summary</h2>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr_380px]">
          <div className="space-y-3 text-xl">
            {[
              ['Total requests', requests.length],
              ['Approved', stats.approved],
              ['Rejected', stats.rejected],
            ].map(([label, value]) => <div key={label} className="flex justify-between"><span className="text-slate-600">{label}</span><span className="font-bold">{value}</span></div>)}
          </div>
          <div className="space-y-3 text-xl">
            {[
              ['Pending', stats.pending],
              ['Completed', stats.completed],
              ['Registered users', accounts.length],
            ].map(([label, value]) => <div key={label} className="flex justify-between"><span className="text-slate-600">{label}</span><span className="font-bold">{value}</span></div>)}
          </div>
          <div className="space-y-3">
            <button className="flex h-14 w-full items-center justify-center gap-3 rounded-md border border-[#d9d3cc] text-lg font-semibold"><Save size={18} />Export report</button>
            <button className="flex h-14 w-full items-center justify-center gap-3 rounded-md border border-[#d9d3cc] text-lg font-semibold"><FileText size={18} />Print</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function AdminActivityLogsView({ requests }: { requests: PortalRequest[] }) {
  const [query, setQuery] = useState('')
  const logs = getAdminActivityLogs(requests).filter((log) => `${log.timestamp} ${log.user} ${log.action} ${log.target}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <label className="relative mb-6 block max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter logs..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#9d2d35]" />
      </label>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead className="bg-stone-50 text-sm uppercase tracking-[.12em] text-slate-600">
            <tr>
              <th className="px-6 py-5">Timestamp</th>
              <th className="px-6 py-5">User</th>
              <th className="px-6 py-5">Action</th>
              <th className="px-6 py-5">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee9e4]">
            {logs.map((log) => (
              <tr key={`${log.timestamp}-${log.user}-${log.target}-${log.action}`}>
                <td className="px-6 py-5 text-slate-600">{log.timestamp}</td>
                <td className="px-6 py-5 text-xl font-semibold">{log.user}</td>
                <td className="px-6 py-5"><span className={`rounded-full px-3 py-1 ${log.action === 'approved' ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-700'}`}>{log.action}</span></td>
                <td className="px-6 py-5 text-xl text-slate-700">{log.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AdminSettingsView() {
  return (
    <div className="max-w-4xl space-y-6">
      <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <h2 className="mb-5 text-2xl font-bold">General settings</h2>
        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block font-medium">System name</span>
            <input defaultValue="EduPortal" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
          </label>
          <label className="block">
            <span className="mb-2 block font-medium">Academic year</span>
            <input defaultValue="2026-2027" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
          </label>
          <label className="block">
            <span className="mb-2 block font-medium">Admin email</span>
            <input defaultValue="admin@edu.portal" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
          </label>
          <label className="block">
            <span className="mb-2 block font-medium">Timezone</span>
            <select defaultValue="UTC+8 (Manila)" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]">
              <option>UTC+8 (Manila)</option>
              <option>UTC+0</option>
            </select>
          </label>
        </div>
      </section>
      <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <h2 className="mb-5 text-2xl font-bold">Request limits</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            ['Max TOR per student/week', '2'],
            ['Max facility hours/day', '4'],
            ['Max supply items/request', '10'],
            ['Max leave days/month', '5'],
          ].map(([label, value]) => (
            <label key={label}>
              <span className="mb-2 block font-medium">{label}</span>
              <input defaultValue={value} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
            </label>
          ))}
        </div>
      </section>
      <button className="inline-flex h-12 items-center gap-2 rounded-md bg-[#9d2d35] px-6 font-semibold text-white"><Save size={18} />Save settings</button>
    </div>
  )
}

function StatusBreakdownPanel({ counts, title = 'Status breakdown', total }: { counts: Record<Status, number>; title?: string; total: number }) {
  const rows: { label: Status; color: string }[] = [
    { label: 'Pending', color: 'bg-[#eba900]' },
    { label: 'Approved', color: 'bg-[#3a9276]' },
    { label: 'Rejected', color: 'bg-[#b94247]' },
  ]
  return (
    <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <h2 className="mb-6 text-2xl font-bold">{title}</h2>
      <div className="space-y-5">
        {rows.map((row) => {
          const value = counts[row.label]
          const percent = total ? (value / total) * 100 : 0
          return (
            <div key={row.label}>
              <div className="mb-2 flex justify-between text-lg">
                <span>{row.label}</span>
                <span className="font-semibold">{value} ({percent.toFixed(1)}%)</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RequestDocumentView({ onSubmit, user }: { onSubmit: (request: PortalRequest) => void; user: User }) {
  const [kind, setKind] = useState<RequestKind>('COE Request')
  const [studentId, setStudentId] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [semester, setSemester] = useState('')
  const [schoolYear, setSchoolYear] = useState('2026-2027')
  const [program, setProgram] = useState('Bachelor of Science in Entrepreneurship')
  const [purpose, setPurpose] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const registrarDocuments: { kind: RequestKind; label: string; description: string }[] = [
    { kind: 'Certificate of Registration', label: 'Certificate of Registration', description: 'Official registration record for the current term.' },
    { kind: 'COE Request', label: 'Certificate of Enrollment', description: 'Proof of current enrollment for scholarships, visas, and requirements.' },
    { kind: 'Certificate of Grades', label: 'Certificate of Grades', description: 'Certified grade record for a term or school year.' },
    { kind: 'Certificate of Credit Units', label: 'Certificate of Credit Units', description: 'Certification of credited academic units.' },
    { kind: 'TOR Request', label: 'Transcript of Records', description: 'Official academic record for transfer or employment.' },
    { kind: 'Exit Clearance', label: 'Exit Clearance', description: 'Required for graduation, transfer, or leave of absence.' },
  ]

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!purpose.trim()) return
    setSubmitError('')

    const request: PortalRequest = {
      id: `DR-2026-${Date.now().toString().slice(-3)}`,
      title: getDocumentTitle(kind),
      kind,
      ownerId: user.id,
      owner: user.name,
      office: 'Registrar',
      status: 'Pending',
      date: new Date().toISOString().slice(0, 10),
      time: '09:00',
      remarks: purpose.trim(),
      studentId: studentId.trim(),
      yearLevel: yearLevel.trim(),
      semester: semester.trim(),
      schoolYear: schoolYear.trim(),
      program,
      purpose: purpose.trim(),
    }

    try {
      setSubmitting(true)
      if (kind === 'Exit Clearance') {
        const result = await submitExitClearanceRequest(request)
        onSubmit({
          ...request,
          id: result.reference_number,
          status: result.status,
          remarks: `${request.remarks}\nTracking #: ${result.tracking_number}`,
        })
      } else {
        onSubmit(request)
      }
      setPurpose('')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to submit request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_485px]">
      <PageIntro title="Registrar request form" description="Request certificates, enrollment records, grades, TOR, and other Registrar documents." icon={FileText} tone="bg-red-100 text-[#9d2d35]" />
      <section className="rounded-lg border border-[#e7e1db] bg-white p-7 xl:col-start-1">
        <p className="mb-4 font-medium">Request for</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {registrarDocuments.map(({ description, kind: value, label }) => (
            <button key={value} type="button" onClick={() => setKind(value)} className={`rounded-lg border p-5 text-left ${kind === value ? 'border-[#bd4448] bg-red-50/40 ring-1 ring-[#bd4448]' : 'border-[#e7e1db] hover:border-[#bd4448]'}`}>
              <span className="mb-8 flex h-12 w-12 items-center justify-center rounded-md bg-[#b73b47] text-white">
                <FileText size={21} />
              </span>
              <span className="block text-xl font-bold">{label}</span>
              <span className="mt-2 block text-slate-600">{description}</span>
            </button>
          ))}
        </div>
      </section>
      <aside className="space-y-5 xl:col-start-2 xl:row-start-2">
        <InfoCard title="Processing time" lines={['TOR: 3-5 working days', 'COE: 1-2 working days', 'Exit Clearance: 5-7 working days']} />
        <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <div className="flex gap-4">
            <span className="flex h-12 w-3 rounded-full bg-[#f4b400]" />
            <div>
              <h3 className="text-xl font-bold text-[#5a3408]">Before submitting</h3>
              <p className="mt-2 text-[#79572d]">Make sure you have no outstanding fees and your account is in good standing. Requests with unsettled balances will be flagged.</p>
            </div>
          </div>
        </div>
      </aside>
      <section className="rounded-lg border border-[#e7e1db] bg-white p-7 xl:col-start-1">
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <span className="mb-2 block font-medium">Student ID #</span>
            <input value={studentId} onChange={(event) => setStudentId(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Year Level</span>
            <input value={yearLevel} onChange={(event) => setYearLevel(event.target.value)} placeholder="e.g. 3rd Year" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Semester</span>
            <input value={semester} onChange={(event) => setSemester(event.target.value)} placeholder="e.g. 1st Semester" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
          </label>
          <label>
            <span className="mb-2 block font-medium">School Year</span>
            <input value={schoolYear} onChange={(event) => setSchoolYear(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
          </label>
        </div>
        <label className="mt-5 block">
          <span className="mb-2 block font-medium">Program</span>
          <select value={program} onChange={(event) => setProgram(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]">
            {['Bachelor of Early Childhood Education', 'Bachelor of Technical-Vocational Teacher Education', 'major in Heating, Ventilating, Airconditioning, and Refrigeration Technology', 'major in Computer Programming', 'Bachelor of Science in Entrepreneurship'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="mt-5 block">
          <span className="mb-2 block font-medium">Purpose / reason</span>
          <textarea value={purpose} onChange={(event) => setPurpose(event.target.value.slice(0, 500))} rows={6} placeholder="e.g. For scholarship renewal..." className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 text-lg outline-none focus:border-[#9d2d35] focus:ring-4 focus:ring-red-100" />
        </label>
        <p className="mt-2 text-slate-500">{purpose.length} / 500 characters</p>
        {submitError && <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>}
        <div className="mt-6 flex justify-end">
          <button disabled={submitting} className="rounded-md bg-[#9d2d35] px-7 py-3 text-lg font-semibold text-white hover:bg-[#7a111b] disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? 'Submitting...' : 'Submit request'}
          </button>
        </div>
      </section>
    </form>
  )
}

function ReserveFacilityView({ existingRequests, onSubmit, user }: { existingRequests: PortalRequest[]; onSubmit: (request: PortalRequest) => void; user: User }) {
  const [facility, setFacility] = useState(facilities[0][0])
  const [date, setDate] = useState('2026-06-03')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('11:00')
  const [attendees, setAttendees] = useState(10)
  const [purpose, setPurpose] = useState('')
  const [error, setError] = useState('')
  const upcoming = existingRequests.filter((request) => request.facility === facility && request.status !== 'Rejected')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!purpose.trim()) return
    if (hasFacilityConflict(existingRequests, date, `${start}-${end}`, facility)) {
      setError(`${facility} already has a booking for that schedule.`)
      return
    }
    onSubmit({
      id: `FR-2026-${Date.now().toString().slice(-3)}`,
      title: facility,
      kind: 'Facility Reservation',
      ownerId: user.id,
      owner: user.name,
      office: 'Admin Office',
      status: 'Pending',
      date,
      time: `${start}-${end}`,
      remarks: purpose.trim(),
      facility,
      attendees,
      purpose: purpose.trim(),
    })
    setPurpose('')
    setError('')
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_485px]">
      <PageIntro title="Reserve a facility" description="Book rooms, laboratories, audio-visual rooms, and other school facilities. The Admin Office reviews and approves reservations." icon={Building2} tone="bg-emerald-100 text-emerald-900" />
      <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <label className="block">
          <span className="mb-2 block font-medium">Facility</span>
          <select value={facility} onChange={(event) => setFacility(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35] focus:ring-4 focus:ring-red-100">
            {facilities.map(([name, type]) => <option key={name} value={name}>{name} - {type}</option>)}
          </select>
        </label>
        <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-900">{facilities.find(([name]) => name === facility)?.[1]}</span>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <label>
            <span className="mb-2 block font-medium">Date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Start time</span>
            <input type="time" value={start} onChange={(event) => setStart(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
          </label>
          <label>
            <span className="mb-2 block font-medium">End time</span>
            <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
          </label>
        </div>
        <label className="mt-5 block">
          <span className="mb-2 block font-medium">Expected attendees</span>
          <input type="number" min={1} value={attendees} onChange={(event) => setAttendees(Number(event.target.value))} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
        </label>
        <label className="mt-5 block">
          <span className="mb-2 block font-medium">Purpose / activity</span>
          <textarea value={purpose} onChange={(event) => setPurpose(event.target.value.slice(0, 500))} rows={6} placeholder="e.g. Thesis defense rehearsal, org meeting, workshop..." className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 text-lg outline-none focus:border-[#9d2d35]" />
        </label>
        <p className="mt-2 text-slate-500">{purpose.length} / 500 characters</p>
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3 border-t border-[#e7e1db] pt-4">
          <button type="button" onClick={() => setPurpose('')} className="rounded-md border border-[#d9d3cc] px-7 py-3 text-lg font-medium">Reset</button>
          <button className="rounded-md bg-[#9d2d35] px-7 py-3 text-lg font-semibold text-white hover:bg-[#7a111b]">Submit reservation</button>
        </div>
      </section>
      <aside className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold">Upcoming bookings</h3>
            <p className="text-slate-500">{facility}</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-100 text-emerald-900"><CalendarClock size={21} /></span>
        </div>
        <div className="space-y-3">
          {upcoming.map((booking) => (
            <div key={booking.id} className="rounded-md border border-[#e7e1db] p-4">
              <p className="font-semibold">{booking.date}</p>
              <p className="text-slate-500">{booking.time} - {booking.owner}</p>
            </div>
          ))}
          {upcoming.length === 0 && <p className="py-10 text-center text-slate-500">No upcoming bookings.</p>}
        </div>
      </aside>
    </form>
  )
}

function RoomAvailabilityView({ requests }: { requests: PortalRequest[] }) {
  const [selectedDay, setSelectedDay] = useState(3)
  const bookedDays = [10, 15, 18]
  const selectedDate = `2026-06-${String(selectedDay).padStart(2, '0')}`
  const bookings = requests.filter((request) => request.kind === 'Facility Reservation' && request.date === selectedDate && request.status !== 'Rejected')

  return (
    <div className="space-y-6">
      <PageIntro title="Room & Facility Availability" description="View which rooms and facilities are available or booked. Click a date to see the full schedule." icon={CalendarClock} tone="bg-emerald-100 text-emerald-900" />
      <section className="grid gap-6 xl:grid-cols-[480px_1fr]">
        <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <div className="mb-7 flex items-center justify-between">
            <button className="rounded-md p-2 hover:bg-stone-100" aria-label="Previous month"><ChevronDown className="rotate-90" size={20} /></button>
            <div className="text-center">
              <h2 className="text-2xl font-bold">June 2026</h2>
              <p className="mt-2 font-medium text-[#7a111b]">Today</p>
            </div>
            <button className="rounded-md p-2 hover:bg-stone-100" aria-label="Next month"><ChevronDown className="-rotate-90" size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-3 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <p key={day} className="text-sm font-bold uppercase text-slate-400">{day}</p>)}
            <span />
            {Array.from({ length: 30 }, (_, index) => index + 1).map((day) => (
              <button key={day} onClick={() => setSelectedDay(day)} className={`relative h-14 rounded-md text-lg ${selectedDay === day ? 'bg-[#b73b47] font-bold text-white' : day === 12 ? 'bg-stone-100' : 'hover:bg-stone-100'}`}>
                {day}
                {bookedDays.includes(day) && <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#d66161]" />}
              </button>
            ))}
          </div>
          <div className="mt-8 flex gap-6 border-t border-[#e7e1db] pt-5 text-slate-600">
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#d66161]" />Has bookings</span>
            <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border border-emerald-500 bg-emerald-100" />Today</span>
          </div>
        </div>
        <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedDay === 3 ? "Today's schedule" : `June ${selectedDay} schedule`}</h2>
              <p className="text-slate-500">{selectedDate}</p>
            </div>
            <div className="flex gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-emerald-300 bg-emerald-100" />Available</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-amber-300 bg-amber-100" />Booked</span>
            </div>
          </div>
          <div className="max-h-[560px] space-y-3 overflow-auto pr-2">
            {facilities.map(([name, type]) => {
              const booking = bookings.find((request) => request.facility === name)
              return (
                <div key={name} className="flex items-center gap-4 rounded-lg border border-[#e7e1db] p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-100 text-slate-600"><Building2 size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-bold">{name}</p>
                    <p className="text-slate-500">{type}{booking ? ` - ${booking.time}` : ''}</p>
                  </div>
                  <span className={`rounded-full px-4 py-2 text-sm font-semibold ${booking ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{booking ? 'Booked' : 'Available'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

function MyRequestsView({ onView, requests }: { onView: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status | 'All'>('All')
  const [category, setCategory] = useState<'All' | 'Documents' | 'Facilities'>('All')
  const filtered = requests.filter((request) => {
    const bySearch = `${request.id} ${request.title} ${request.remarks} ${request.kind}`.toLowerCase().includes(query.toLowerCase())
    const byStatus = status === 'All' || request.status === status
    const byCategory = category === 'All' || (category === 'Documents' ? documentKinds.includes(request.kind) : request.kind === 'Facility Reservation')
    return bySearch && byStatus && byCategory
  })

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-bold">My requests</h2>
            <p className="mt-2 text-xl text-slate-600">Track the status of your document requests and facility reservations.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {(['All', 'Pending', 'Approved', 'Rejected', 'Completed'] as const).map((item) => (
                <button key={item} onClick={() => setStatus(item)} className={`rounded-full border px-5 py-2 ${status === item ? 'border-red-300 bg-red-50 text-[#7a111b]' : 'border-[#e7e1db] hover:bg-stone-50'}`}>{item}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, type, purpose..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#9d2d35] sm:w-[380px]" />
            </label>
            <div className="flex rounded-full border border-[#e7e1db] bg-stone-50 p-1">
              {(['All', 'Documents', 'Facilities'] as const).map((item) => (
                <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-5 py-2 font-medium ${category === item ? 'bg-[#9d2d35] text-white' : 'text-slate-700'}`}>{item}</button>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-lg border border-[#e7e1db] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-stone-50 text-sm uppercase tracking-[.12em] text-slate-600">
              <tr>
                <th className="px-7 py-5">Request ID</th>
                <th className="px-7 py-5">Type / Facility</th>
                <th className="px-7 py-5">Details</th>
                <th className="px-7 py-5">Submitted</th>
                <th className="px-7 py-5">Status</th>
                <th className="px-7 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee9e4]">
              {filtered.map((request) => (
                <tr key={request.id}>
                  <td className="px-7 py-5 font-mono">{request.id}</td>
                  <td className="px-7 py-5">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-md ${documentKinds.includes(request.kind) ? 'bg-red-100 text-[#9d2d35]' : 'bg-emerald-100 text-emerald-900'}`}>
                        {documentKinds.includes(request.kind) ? <FileText size={19} /> : <Building2 size={19} />}
                      </span>
                      <span className="text-xl font-semibold">{request.kind === 'Facility Reservation' ? request.facility : request.title}</span>
                    </div>
                  </td>
                  <td className="px-7 py-5 text-xl text-slate-600">{request.kind === 'Facility Reservation' ? `${request.date} - ${request.time}` : request.remarks}</td>
                  <td className="px-7 py-5 text-slate-600">{formatDate(request.date)}</td>
                  <td className="px-7 py-5"><StatusPill status={request.status} /></td>
                  <td className="px-7 py-5 text-right">
                    <div className="flex justify-end gap-4">
                      {request.kind === 'Facility Reservation' && (
                        <button type="button" onClick={() => printFacilityBookingForm(request)} className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                          <Printer size={16} />
                          Print
                        </button>
                      )}
                      <button type="button" onClick={() => onView(request)} className="font-semibold text-[#7a111b]">View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function MessagesView({ currentUser, messages, onSend, requests }: { currentUser: User; messages: Message[]; onSend: (requestId: string, body: string) => void; requests: PortalRequest[] }) {
  const conversations = requests.filter((request) => {
    const hasMessages = messages.some((message) => message.requestId === request.id)
    if (currentUser.role === 'student') return request.ownerId === currentUser.id && documentKinds.includes(request.kind)
    if (currentUser.role === 'registrar') return request.office === 'Registrar' || hasMessages
    return hasMessages
  })
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? '')
  const [body, setBody] = useState('')
  const selected = conversations.find((request) => request.id === selectedId) ?? conversations[0]
  const thread = selected ? messages.filter((message) => message.requestId === selected.id) : []

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    onSend(selected.id, body)
    setBody('')
  }

  return (
    <section className="grid min-h-[730px] overflow-hidden rounded-lg border border-[#e7e1db] bg-white lg:grid-cols-[510px_1fr]">
      <div className="border-b border-[#e7e1db] lg:border-b-0 lg:border-r">
        <div className="p-7">
          <h2 className="text-3xl font-bold">Messages</h2>
          <p className="mt-2 text-slate-600">Conversations with the Registrar</p>
        </div>
        <div>
          {conversations.map((request) => {
            const last = messages.filter((message) => message.requestId === request.id).at(-1)
            return (
              <button key={request.id} onClick={() => setSelectedId(request.id)} className={`w-full border-t border-[#eee9e4] p-7 text-left hover:bg-stone-50 ${selected?.id === request.id ? 'border-l-4 border-l-[#b73b47] bg-red-50/55' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-bold">{request.title} - {request.id}</p>
                  <StatusPill status={request.status} />
                </div>
                <p className="mt-2 truncate text-slate-600">Registrar: {last?.body ?? 'No message yet.'}</p>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex min-h-[730px] flex-col">
        {selected ? (
          <>
            <div className="flex items-center gap-4 border-b border-[#e7e1db] p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-[#9d2d35]"><MessageSquare size={22} /></span>
              <div>
                <h2 className="text-2xl font-bold">{selected.title} - #{selected.id}</h2>
                <p className="text-slate-500">{selected.remarks}</p>
              </div>
              <StatusPill status={selected.status} />
            </div>
            <div className="flex-1 space-y-5 overflow-auto p-7">
              {thread.map((message) => {
                const mine = message.senderId === currentUser.id
                return (
                  <div key={message.id} className={mine ? 'flex justify-end' : ''}>
                    <div className={`max-w-[760px] rounded-lg border border-[#e7e1db] px-6 py-4 ${mine ? 'bg-[#9d2d35] text-white' : 'bg-stone-50'}`}>
                      <p className="mb-2 font-semibold">{message.senderName} <span className={mine ? 'ml-2 text-sm font-normal text-white/70' : 'ml-2 text-sm font-normal text-slate-500'}>{message.sentAt}</span></p>
                      <p className="text-xl leading-8">{message.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <form onSubmit={submit} className="flex gap-3 border-t border-[#e7e1db] p-7">
              <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Type a message..." className="h-14 min-w-0 flex-1 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#9d2d35]" />
              <button className="flex h-14 w-14 items-center justify-center rounded-md bg-[#dba6aa] text-white hover:bg-[#9d2d35]" aria-label="Send message"><Send size={23} /></button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-500">No conversations available.</div>
        )}
      </div>
    </section>
  )
}

function NotificationsView({ notifications, onMarkAllRead, onToggleRead }: { notifications: typeof notificationItems; onMarkAllRead: () => void; onToggleRead: (id: string) => void }) {
  const [filter, setFilter] = useState('All')
  const filtered = notifications.filter((item) => {
    if (filter === 'Unread') return !item.read
    if (filter === 'Approvals') return item.kind === 'approval'
    if (filter === 'Rejections') return item.kind === 'rejection'
    if (filter === 'Announcements') return item.kind === 'announcement'
    if (filter === 'Info') return item.kind === 'info'
    return true
  })

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold">Notifications</h2>
            <p className="mt-2 text-xl text-slate-600">Approval updates, request status changes, and campus announcements.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {['All', 'Unread', 'Approvals', 'Rejections', 'Announcements', 'Info'].map((item) => (
                <button key={item} onClick={() => setFilter(item)} className={`rounded-full border px-5 py-2 ${filter === item ? 'border-red-300 bg-red-50 text-[#7a111b]' : 'border-[#e7e1db]'}`}>{item}</button>
              ))}
            </div>
          </div>
          <button onClick={onMarkAllRead} className="rounded-md border border-[#e7e1db] px-5 py-3 font-medium hover:bg-stone-50">Mark all as read</button>
        </div>
      </section>
      <section className="overflow-hidden rounded-lg border border-[#e7e1db] bg-white">
        {filtered.map((item) => (
          <div key={item.title} className="flex gap-5 border-b border-[#eee9e4] p-7 last:border-b-0">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md ${item.tone}`}>
              <item.icon size={23} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex gap-4">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <span className="ml-auto text-slate-500">{item.date}</span>
              </div>
              <p className="mt-2 text-slate-600">{item.body}</p>
              <button onClick={() => onToggleRead(item.id)} className="mt-3 font-medium text-[#7a111b]">{item.read ? 'Mark as unread' : 'Mark as read'}</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="p-10 text-center text-slate-500">No notifications match this filter.</p>}
      </section>
    </div>
  )
}

function ProfileView() {
  const { changePassword, updateProfile, user } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState('+63 917 234 5511')
  const [address, setAddress] = useState('12 Mabini St., Quezon City')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [message, setMessage] = useState('')
  const [profileDraft, setProfileDraft] = useState({ name: user?.name ?? '', phone: '+63 917 234 5511', address: '12 Mabini St., Quezon City', avatarUrl: user?.avatarUrl ?? '' })
  const [editingProfile, setEditingProfile] = useState(false)
  const [securityModal, setSecurityModal] = useState<'password' | 'twoFactor' | 'activity' | null>(null)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => readStored(`eduportal-2fa-${user?.id ?? 'guest'}`, false))

  useEffect(() => {
    if (user) localStorage.setItem(`eduportal-2fa-${user.id}`, JSON.stringify(twoFactorEnabled))
  }, [twoFactorEnabled, user])

  if (!user) return null

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingProfile) return
    updateProfile({ name, department: user.department, avatarUrl })
    setProfileDraft({ name, phone, address, avatarUrl })
    setMessage('Profile saved.')
    setEditingProfile(false)
  }

  const changeAvatar = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarUrl(String(reader.result))
      setMessage('')
    }
    reader.readAsDataURL(file)
  }

  const cancelProfile = () => {
    setName(profileDraft.name)
    setPhone(profileDraft.phone)
    setAddress(profileDraft.address)
    setAvatarUrl(profileDraft.avatarUrl)
    setMessage('')
    setEditingProfile(false)
  }

  return (
    <form onSubmit={submitProfile} className="space-y-6">
      <section className="rounded-lg bg-[linear-gradient(100deg,#9d2d35,#9d2d35_58%,#ad4b22)] p-8 text-white">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center gap-3">
              <Avatar user={{ ...user, name, avatarUrl }} size="xl" />
              {editingProfile && (
                <div className="flex flex-wrap justify-center gap-2">
                  <label className="cursor-pointer rounded-md border border-white/30 bg-white/12 px-3 py-2 text-sm font-semibold hover:bg-white/18">
                    Change photo
                    <input type="file" accept="image/*" onChange={(event) => changeAvatar(event.target.files?.[0])} className="sr-only" />
                  </label>
                  {avatarUrl && (
                    <button type="button" onClick={() => setAvatarUrl('')} className="rounded-md border border-white/30 bg-white/12 px-3 py-2 text-sm font-semibold hover:bg-white/18">
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold uppercase tracking-[.08em] text-white/75">{roleMeta[user.role].label} Profile</p>
              <h2 className="text-4xl font-bold">{name}</h2>
              <p className="mt-2 text-xl text-white/85">{user.department}</p>
            </div>
          </div>
          {editingProfile ? (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={cancelProfile} className="inline-flex h-14 items-center rounded-md border border-white/30 bg-white/12 px-7 text-lg font-semibold hover:bg-white/18">
                Cancel
              </button>
              <button className="inline-flex h-14 items-center gap-3 rounded-md bg-[#f4b400] px-7 text-lg font-semibold text-[#220506] hover:bg-[#ffcc33]">
                <Save size={19} />
                Save changes
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => { setEditingProfile(true); setMessage('') }} className="inline-flex h-14 items-center gap-3 rounded-md border border-white/30 bg-white/12 px-7 text-lg font-semibold hover:bg-white/18">
              <User size={20} />
              Edit profile
            </button>
          )}
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1fr_485px]">
        <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <h3 className="mb-6 text-xl font-bold">Personal information</h3>
          <div className="grid gap-5 md:grid-cols-2">
            <ProfileField label="Full name" icon={User} value={name} onChange={setName} disabled={!editingProfile} />
            <ProfileField label="Email address" icon={Mail} value={user.email} disabled />
            <ProfileField label="Phone number" icon={Smartphone} value={phone} onChange={setPhone} disabled={!editingProfile} />
            <ProfileField label="Address" icon={Home} value={address} onChange={setAddress} disabled={!editingProfile} />
          </div>
          {message && <p className="mt-4 text-emerald-700">{message}</p>}
        </div>
        <aside className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <h3 className="mb-6 text-xl font-bold">Academic info</h3>
          {[
            ['Student ID', '2022-00451'],
            ['Program', 'BS Computer Science'],
            ['Year Level', '3rd Year'],
          ].map(([label, value]) => (
            <div key={label} className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[.14em] text-slate-500">{label}</p>
              <p className="mt-2 text-xl">{value}</p>
            </div>
          ))}
          <div className="border-t border-[#e7e1db] pt-6">
            <p className="text-sm font-semibold uppercase tracking-[.14em] text-slate-500">Account Status</p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-900"><ShieldCheck size={16} />Active</span>
          </div>
        </aside>
      </section>
      <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <h3 className="mb-5 text-xl font-bold">Security</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <button type="button" onClick={() => setSecurityModal('password')} className="inline-flex items-center justify-center gap-3 rounded-md border border-[#d9d3cc] px-5 py-4 text-lg font-medium hover:bg-stone-50">
            <Lock size={18} />
            Change password
          </button>
          <button type="button" onClick={() => setSecurityModal('twoFactor')} className="inline-flex items-center justify-center gap-3 rounded-md border border-[#d9d3cc] px-5 py-4 text-lg font-medium hover:bg-stone-50">
            <Smartphone size={18} />
            {twoFactorEnabled ? '2FA enabled' : 'Two-factor auth'}
          </button>
          <button type="button" onClick={() => setSecurityModal('activity')} className="inline-flex items-center justify-center gap-3 rounded-md border border-[#d9d3cc] px-5 py-4 text-lg font-medium hover:bg-stone-50">
            <Clock size={18} />
            Sign-in activity
          </button>
        </div>
      </section>
      {securityModal === 'password' && <ChangePasswordModal changePassword={changePassword} onClose={() => setSecurityModal(null)} />}
      {securityModal === 'twoFactor' && <TwoFactorModal enabled={twoFactorEnabled} onClose={() => setSecurityModal(null)} onToggle={() => setTwoFactorEnabled((enabled) => !enabled)} />}
      {securityModal === 'activity' && <SignInActivityModal onClose={() => setSecurityModal(null)} />}
    </form>
  )
}

function ChangePasswordModal({ changePassword, onClose }: { changePassword: (currentPassword: string, nextPassword: string) => boolean; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (nextPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (nextPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (!changePassword(currentPassword, nextPassword)) {
      setError('Current password is incorrect.')
      return
    }
    onClose()
  }

  return (
    <DialogShell onClose={onClose} width="max-w-3xl">
      <form onSubmit={submit} className="p-8">
        <div className="mb-7 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-red-100 text-[#9d2d35]">
            <Lock size={25} />
          </span>
          <div>
            <h2 className="text-3xl font-bold">Change Password</h2>
            <p className="text-slate-500">Update your account password</p>
          </div>
        </div>
        <div className="space-y-5">
          <PasswordField label="Current password" show={showCurrent} setShow={setShowCurrent} value={currentPassword} onChange={setCurrentPassword} icon={Lock} />
          <PasswordField label="New password" show={showNext} setShow={setShowNext} value={nextPassword} onChange={setNextPassword} icon={Lock} />
          <PasswordField label="Confirm new password" show={showConfirm} setShow={setShowConfirm} value={confirmPassword} onChange={setConfirmPassword} icon={Lock} />
        </div>
        {error && <p className="mt-5 rounded-md bg-red-50 px-4 py-3 text-red-700">{error}</p>}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="h-14 rounded-md border border-[#d9d3cc] text-lg font-semibold hover:bg-stone-50">Cancel</button>
          <button className="inline-flex h-14 items-center justify-center gap-3 rounded-md bg-[#b73b47] text-lg font-semibold text-white hover:bg-[#9d2d35]">
            <CheckCircle2 size={20} />
            Update password
          </button>
        </div>
      </form>
    </DialogShell>
  )
}

function TwoFactorModal({ enabled, onClose, onToggle }: { enabled: boolean; onClose: () => void; onToggle: () => void }) {
  return (
    <DialogShell onClose={onClose} width="max-w-3xl">
      <div className="p-8">
        <div className="mb-7 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-amber-100 text-amber-800">
            <Smartphone size={25} />
          </span>
          <div>
            <h2 className="text-3xl font-bold">Two-Factor Authentication</h2>
            <p className="text-slate-500">{enabled ? 'Your account has an extra verification step enabled' : 'Add an extra layer of security'}</p>
          </div>
        </div>
        {enabled && <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">Two-factor authentication is currently enabled.</p>}
        <p className="rounded-lg border border-[#e7e1db] bg-stone-50 p-6 text-lg font-medium leading-8 text-slate-600">
          Two-factor authentication adds an extra layer of security to your account. When enabled, you'll need to enter a verification code from your authenticator app each time you sign in.
        </p>
        <div className="mt-6 space-y-3 text-lg font-medium text-slate-600">
          {['Scan a QR code with your authenticator app', 'Enter the 6-digit code to verify', 'Save your recovery codes'].map((item) => (
            <p key={item} className="flex items-center gap-3"><CheckCircle2 size={18} className="text-emerald-700" />{item}</p>
          ))}
        </div>
        <button onClick={onToggle} className={`mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-md text-lg font-semibold text-white ${enabled ? 'bg-[#b73b47] hover:bg-[#9d2d35]' : 'bg-[#f4b400] hover:bg-[#d89f00]'}`}>
          <Smartphone size={20} />
          {enabled ? 'Disable 2FA' : 'Set up 2FA'}
        </button>
        <div className="mt-6 border-t border-[#e7e1db] pt-6">
          <button onClick={onClose} className="h-14 w-full rounded-md border border-[#d9d3cc] text-lg font-semibold hover:bg-stone-50">Close</button>
        </div>
      </div>
    </DialogShell>
  )
}

function SignInActivityModal({ onClose }: { onClose: () => void }) {
  const sessions = [
    ['MacBook Pro 16"', 'Chrome 126 - macOS 14.5', 'Manila, Philippines', '112.206.45.12', '4h ago', '09:24 AM', true],
    ['iPhone 15 Pro', 'Safari - iOS 18.1', 'Manila, Philippines', '112.206.45.12', '6h ago', '07:15 AM', false],
    ['Windows Desktop', 'Edge 124 - Windows 11', 'Quezon City, Philippines', '49.145.98.33', '23h ago', '02:42 PM', false],
    ['MacBook Pro 16"', 'Chrome 125 - macOS 14.4', 'Manila, Philippines', '112.206.45.12', '2d ago', '11:08 AM', false],
  ] as const

  return (
    <DialogShell onClose={onClose} width="max-w-3xl">
      <div className="max-h-[760px] overflow-auto p-8">
        <div className="mb-6 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
            <Clock size={25} />
          </span>
          <div>
            <h2 className="text-3xl font-bold">Sign-in Activity</h2>
            <p className="text-slate-500">Recent login sessions on your account</p>
          </div>
        </div>
        <p className="mb-6 rounded-lg border border-[#e7e1db] bg-stone-50 p-5 text-lg font-medium leading-7 text-slate-600">
          If you see a session you don't recognize, change your password immediately and contact the admin office.
        </p>
        <div className="space-y-4">
          {sessions.map(([device, browser, location, ip, age, time, current]) => (
            <div key={`${device}-${time}`} className={`flex items-center gap-4 rounded-lg border p-5 ${current ? 'border-emerald-200 bg-emerald-50' : 'border-transparent bg-stone-50'}`}>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${current ? 'bg-emerald-700 text-white' : 'bg-stone-200 text-slate-600'}`}>
                <Smartphone size={23} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-bold">{device}</h3>
                  {current && <span className="rounded-full bg-emerald-700 px-3 py-1 text-sm font-bold text-white">Current</span>}
                </div>
                <p className="text-slate-600">{browser}</p>
                <p className="mt-2 text-sm text-slate-500">{location} - {ip}</p>
              </div>
              <div className="text-right text-slate-500">
                <p className="text-lg font-semibold">{age}</p>
                <p>{time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DialogShell>
  )
}

function PasswordField({ icon: Icon, label, onChange, setShow, show, value }: { icon: typeof Home; label: string; onChange: (value: string) => void; setShow: (show: boolean) => void; show: boolean; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block font-semibold text-slate-600">{label}</span>
      <span className="flex h-14 items-center rounded-md border border-[#d9d3cc] px-4 focus-within:border-[#9d2d35] focus-within:ring-4 focus-within:ring-red-100">
        <Icon className="mr-3 text-slate-500" size={20} />
        <input type={show ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
        <button type="button" onClick={() => setShow(!show)} className="rounded-md p-2 text-slate-500 hover:bg-stone-100" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </span>
    </label>
  )
}

function DialogShell({ children, onClose, width }: { children: ReactNode; onClose: () => void; width: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm" onMouseDown={onClose}>
      <div className={`w-full overflow-hidden rounded-lg bg-white shadow-2xl ${width}`} onMouseDown={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}


function RequestsWorkspace({ canApprove, onDecision, onView, requests }: { canApprove: boolean; onDecision: (request: PortalRequest, status: Status) => void; onView: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#e7e1db] bg-white">
      <div className="border-b border-[#e7e1db] p-7">
        <h2 className="text-2xl font-bold">Request Monitor</h2>
        <p className="text-slate-500">Role-filtered requests with approval actions.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <tbody className="divide-y divide-[#eee9e4]">
            {requests.map((request) => (
              <tr key={request.id}>
                <td className="px-7 py-5">
                  <p className="font-bold">{request.title}</p>
                  <p className="text-slate-500">{request.id} - {request.kind}</p>
                </td>
                <td className="px-7 py-5">{request.owner}</td>
                <td className="px-7 py-5">{request.office}</td>
                <td className="px-7 py-5"><StatusPill status={request.status} /></td>
                <td className="px-7 py-5">
                  <div className="flex gap-2">
                    <button onClick={() => onView(request)} className="rounded-md border border-[#d9d3cc] px-3 py-2">View</button>
                    {canApprove && request.status === 'Pending' && <button onClick={() => onDecision(request, 'Approved')} className="rounded-md bg-emerald-700 px-3 py-2 text-white">Approve</button>}
                    {canApprove && request.status === 'Pending' && <button onClick={() => onDecision(request, 'Rejected')} className="rounded-md bg-red-700 px-3 py-2 text-white">Reject</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PageIntro({ description, icon: Icon, title, tone }: { description: string; icon: typeof Home; title: string; tone: string }) {
  return (
    <section className="rounded-lg border border-[#e7e1db] bg-white p-7 xl:col-span-2">
      <div className="flex items-center justify-between gap-5">
        <div>
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="mt-3 text-xl leading-8 text-slate-600">{description}</p>
        </div>
        <span className={`hidden h-16 w-16 shrink-0 items-center justify-center rounded-md sm:flex ${tone}`}>
          <Icon size={28} />
        </span>
      </div>
    </section>
  )
}

function MetricCard({ icon: Icon, label, tone, value }: { icon: typeof Home; label: string; tone: string; value: number | string }) {
  return (
    <div className={`group rounded-2xl border border-white/10 ${tone} relative overflow-hidden bg-gradient-to-br p-8 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105`}>
      <div className="absolute -right-12 -top-12 opacity-5 transition-transform duration-300 group-hover:scale-110">
        <Icon size={150} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider opacity-70">{label}</p>
            <p className="mt-3 text-5xl font-black">{value}</p>
          </div>
          <span className={`flex h-16 w-16 items-center justify-center rounded-xl ${tone} shadow-lg`}>
            <Icon size={28} />
          </span>
        </div>
      </div>
    </div>
  )
}

function Avatar({ size = 'md', user }: { size?: 'sm' | 'md' | 'xl'; user: Pick<User, 'avatarUrl' | 'name'> }) {
  const sizes = {
    sm: 'h-11 w-11 text-sm',
    md: 'h-12 w-12 text-base',
    xl: 'h-20 w-20 border-4 border-white/25 text-2xl',
  }
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#7a111b] font-bold text-white ${sizes[size]}`}>
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(user.name)}
    </span>
  )
}

function ActionCard({ highlighted = false, icon: Icon, onClick, subtitle, title, tone }: { highlighted?: boolean; icon: typeof Home; onClick: () => void; subtitle: string; title: string; tone: string }) {
  return (
    <button onClick={onClick} className={`rounded-lg border bg-white p-7 text-left hover:border-[#bd4448] ${highlighted ? 'border-[#ff8c8c] ring-1 ring-[#ff8c8c]' : 'border-[#e7e1db]'}`}>
      <span className={`mb-12 flex h-14 w-14 items-center justify-center rounded-md ${tone}`}>
        <Icon size={25} />
      </span>
      <span className="block text-2xl font-bold">{title}</span>
      <span className="mt-2 block text-lg text-slate-600">{subtitle}</span>
    </button>
  )
}

function AnnouncementsPanel() {
  return (
    <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Announcements</h2>
          <p className="text-slate-500">Campus updates</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-amber-100 text-amber-800"><Megaphone size={22} /></span>
      </div>
      {[
        ['Final Exam Schedule Released', 'Check the academic calendar for the updated final examinations schedule.'],
        ['Reminder: Enrollment Period', 'Online enrollment for 1st Semester AY 2026-2027 opens on June 22.'],
      ].map(([title, body]) => (
        <div key={title} className="mb-4 rounded-md border border-[#e7e1db] p-5 last:mb-0">
          <h3 className="font-bold">{title}</h3>
          <p className="mt-2 text-slate-600">{body}</p>
        </div>
      ))}
    </div>
  )
}

function InfoCard({ lines, title }: { lines: string[]; title: string }) {
  return (
    <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <h3 className="mb-5 text-xl font-bold">{title}</h3>
      <div className="space-y-4">
        {lines.map((line) => <p key={line} className="flex items-center gap-3 text-slate-700"><Clock size={16} className="text-[#9d2d35]" />{line}</p>)}
      </div>
    </div>
  )
}

function NotificationsDropdown({ notifications, onMarkAllRead }: { notifications: typeof notificationItems; onMarkAllRead: () => void }) {
  const unreadCount = notifications.filter((item) => !item.read).length
  return (
    <div className="absolute right-24 top-16 z-50 max-h-[640px] w-[480px] overflow-hidden rounded-lg border border-[#e7e1db] bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#e7e1db] p-5">
        <div>
          <h3 className="text-xl font-bold">Notifications</h3>
          <p className="text-slate-500">{unreadCount} unread</p>
        </div>
        <button onClick={onMarkAllRead} className="font-medium text-[#7a111b]">Mark all read</button>
      </div>
      <div className="max-h-[560px] overflow-auto">
        {notifications.map((item) => (
          <div key={item.title} className="flex gap-4 border-b border-[#eee9e4] p-5 last:border-b-0">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${item.tone}`}><item.icon size={20} /></span>
            <div>
              <h4 className="font-bold">{item.title}</h4>
              <p className="line-clamp-2 text-slate-700">{item.body}</p>
              <p className="mt-2 text-sm text-slate-500">{item.age}</p>
            </div>
            {!item.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#b73b47]" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileDropdown({ onLogout, onProfile, user }: { onLogout: () => void; onProfile: () => void; user: User }) {
  return (
    <div className="absolute right-0 top-16 z-50 w-[300px] overflow-hidden rounded-lg border border-[#e7e1db] bg-white shadow-2xl">
      <div className="border-b border-[#e7e1db] p-5">
        <h3 className="text-xl font-bold">{user.name}</h3>
        <p className="text-slate-500">{user.email}</p>
      </div>
      <button onClick={onProfile} className="flex w-full items-center gap-4 border-b border-[#e7e1db] px-5 py-4 text-left text-lg hover:bg-stone-50">
        <User size={20} />
        My Profile
      </button>
      <button onClick={onLogout} className="flex w-full items-center gap-4 px-5 py-4 text-left text-lg text-[#7a111b] hover:bg-red-50">
        <LogOut size={20} />
        Sign out
      </button>
    </div>
  )
}

function ProfileField({ disabled = false, icon: Icon, label, onChange, value }: { disabled?: boolean; icon: typeof Home; label: string; onChange?: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block font-medium">{label}</span>
      <span className="flex h-14 items-center rounded-md border border-[#d9d3cc] bg-white px-4">
        <Icon className="mr-3 text-slate-500" size={20} />
        <input disabled={disabled} value={value} onChange={(event) => onChange?.(event.target.value)} className="min-w-0 flex-1 bg-transparent text-lg outline-none disabled:text-slate-700" />
      </span>
      {disabled && label === 'Email address' && <span className="mt-2 block text-slate-500">Contact admin to change your email.</span>}
    </label>
  )
}

function RequestDetailsModal({ onClose, request }: { onClose: () => void; request: PortalRequest }) {
  const isFacilityReservation = request.kind === 'Facility Reservation'
  const isDocumentRequest = documentKinds.includes(request.kind)

  return (
    <Modal title="Request Details" onClose={onClose} wide={isFacilityReservation || isDocumentRequest}>
      <div className="space-y-3">
        {[
          ['Request ID', request.id],
          ['Title', request.title],
          ['Type', request.kind],
          ['Requester', request.owner],
          ['Office', request.office],
          ['Schedule', `${request.date} at ${request.time}`],
          ['Facility', request.facility ?? 'Not applicable'],
          ['Attendees', isFacilityReservation ? String(getAttendeeCount(request)) : 'Not applicable'],
          ['Status', request.status],
          ['Updated By', request.updatedBy ?? 'No office action yet'],
          [isFacilityReservation ? 'Purpose' : 'Remarks', request.remarks],
          ['Facility Remarks', isFacilityReservation ? request.facilityRemarks ?? 'No facility remarks yet' : 'Not applicable'],
        ].map(([label, value]) => (
          <div key={label} className="grid grid-cols-[130px_1fr] gap-3 rounded-md bg-stone-50 px-4 py-3">
            <span className="font-medium text-slate-600">{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      {isFacilityReservation && (
        <div className="mt-6 border-t border-[#e7e1db] pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold">Printable booking form</h3>
              <p className="text-slate-500">Use this copy for facility reservation filing.</p>
            </div>
            <button type="button" onClick={() => printFacilityBookingForm(request)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#9d2d35] px-4 font-semibold text-white">
              <Printer size={17} />
              Print form
            </button>
          </div>
          <FacilityBookingPrintForm request={request} />
        </div>
      )}
      {isDocumentRequest && (
        <div className="mt-6 border-t border-[#e7e1db] pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold">Printable Registrar form</h3>
              <p className="text-slate-500">Use this copy for Registrar filing and release.</p>
            </div>
            <button type="button" onClick={() => printRegistrarRequestForm(request)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#9d2d35] px-4 font-semibold text-white">
              <Printer size={17} />
              Print form
            </button>
          </div>
          <RegistrarRequestPrintForm request={request} />
        </div>
      )}
    </Modal>
  )
}

function RegistrarRequestPrintForm({ request }: { request: PortalRequest }) {
  const programOptions = ['Bachelor of Early Childhood Education', 'Bachelor of Technical-Vocational Teacher Education', 'major in Heating, Ventilating, Airconditioning, and Refrigeration Technology', 'major in Computer Programming', 'Bachelor of Science in Entrepreneurship']
  const requestOptions: { kind: RequestKind; label: string }[] = [
    { kind: 'Certificate of Registration', label: 'Certificate of Registration' },
    { kind: 'COE Request', label: 'Certificate of Enrollment' },
    { kind: 'Certificate of Grades', label: 'Certificate of Grades' },
    { kind: 'Certificate of Credit Units', label: 'Certificate of Credit Units' },
  ]

  return (
    <div className="rounded-lg border border-[#d9d3cc] bg-white p-6 font-serif text-slate-950 shadow-sm">
      <div className="relative border-b-2 border-[#8b5a2b] pb-4 text-center">
        <div className="absolute right-0 top-0 text-right text-xs">
          <p className="font-semibold uppercase text-[#1e6f5c]">Reference Number</p>
          <p className="mt-1 font-mono text-sm font-bold tracking-wide text-[#1e3a3a]">{getRegistrarReferenceNumber(request)}</p>
        </div>
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#1e6f5c] text-sm font-bold text-[#1e6f5c]">CCD</div>
        <p className="text-2xl font-extrabold text-[#1e3a3a]">CITY COLLEGE OF DAVAO</p>
        <p className="text-sm text-[#2c5a6e]">Km. 10 Catalanun Pequeno, Davao City</p>
        <p className="mt-3 text-lg font-bold tracking-wide">OFFICE OF THE REGISTRAR</p>
      </div>

      <h3 className="my-6 text-center text-2xl font-extrabold underline underline-offset-8">REQUEST FORM</h3>

      <div className="space-y-4 text-[15px]">
        <PrintLine label="Date" value={formatDate(request.date)} />
        <PrintLine label="Name" value={request.owner} />
        <PrintLine label="Student ID #" value={request.studentId ?? ''} />
        <PrintLine label="Year Level" value={request.yearLevel ?? ''} />
        <PrintLine label="Semester" value={request.semester ?? ''} />
        <PrintLine label="School Year" value={request.schoolYear ?? ''} />

        <PrintCheckGroup title="Program" options={programOptions} selected={request.program ?? ''} />
        <PrintCheckGroup title="Request for" options={requestOptions.map((item) => item.label)} selected={getRegistrarRequestLabel(request.kind)} />

        <PrintLine label="Purpose/Reason" value={request.remarks} />
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <SignatureLine label="Requested by" value={request.owner} />
          <SignatureLine label="Received by" value={request.receivedBy ?? ''} />
          <SignatureLine label="Released by" value={request.releasedBy ?? ''} />
        </div>
      </div>
    </div>
  )
}

function PrintCheckGroup({ options, selected, title }: { options: string[]; selected: string; title: string }) {
  return (
    <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
      <p className="mb-3 font-semibold">{title}:</p>
      <div className="grid gap-2">
        {options.map((option) => (
          <span key={option} className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center border border-slate-600 text-xs">{selected === option ? 'x' : ''}</span>
            {option}
          </span>
        ))}
      </div>
    </div>
  )
}

function SignatureLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 font-semibold">{label}:</p>
      <p className="min-h-8 border-b border-slate-700 px-2">{value}</p>
    </div>
  )
}

function FacilityBookingPrintForm({ request }: { request: PortalRequest }) {
  const venueOptions = ['Library', 'AVR (EdTech Lab)', 'BOT Room', 'Covered Court', 'Open Field', 'Business Incubation Room', 'Social Hall', 'Classroom']
  const selectedVenue = getFacilityPrintVenue(request.facility)
  const purpose = request.purpose ?? request.remarks

  return (
    <div className="rounded-lg border border-[#d9d3cc] bg-white p-6 font-serif text-slate-950 shadow-sm">
      <div className="relative border-b-2 border-[#8b5a2b] pb-4 text-center">
        <div className="absolute right-0 top-0 text-right text-xs">
          <p className="font-semibold uppercase text-[#1e6f5c]">Reference Number</p>
          <p className="mt-1 font-mono text-sm font-bold tracking-wide text-[#1e3a3a]">{getFacilityReferenceNumber(request)}</p>
        </div>
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#1e6f5c] text-sm font-bold text-[#1e6f5c]">CCD</div>
        <p className="text-2xl font-extrabold text-[#1e3a3a]">CITY COLLEGE OF DAVAO</p>
        <p className="text-sm text-[#2c5a6e]">Km. 10 Catalanun Pequeno, Davao City</p>
      </div>

      <h3 className="my-6 text-center text-2xl font-extrabold underline underline-offset-8">School Facility Booking Form</h3>

      <div className="space-y-4 text-[15px]">
        <PrintLine label="Date" value={formatDate(request.date)} />
        <PrintLine label="Purpose/Objective" value={purpose} />
        <PrintLine label="Time" value={request.time.replace('-', ' - ')} />

        <div>
          <p className="mb-3 font-semibold">Venue (pls check one):</p>
          <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {venueOptions.map((venue) => (
                <span key={venue} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center border border-slate-600 text-xs">{selectedVenue === venue ? 'x' : ''}</span>
                  {venue}
                </span>
              ))}
              <span className="flex items-center gap-2 sm:col-span-2">
                <span className="flex h-4 w-4 items-center justify-center border border-slate-600 text-xs">{selectedVenue === 'Others' ? 'x' : ''}</span>
                Others (pls specify):
                <span className="min-w-48 flex-1 border-b border-slate-500 px-2">{selectedVenue === 'Others' ? request.facility : ''}</span>
              </span>
            </div>
          </div>
        </div>

        <PrintLine label="Remarks (by the Facility-in-charge)" value={request.facilityRemarks ?? ''} />
        <PrintLine label="Requested by" value={`${request.owner} / ${formatDate(request.date)}`} />
        <PrintLine label="Recommended by" value="" />
        <PrintLine label="Approved by" value={request.status === 'Approved' || request.status === 'Completed' ? request.updatedBy ?? 'Admin Office' : ''} />

        <div className="border-l-4 border-[#b68b40] bg-[#fef9e6] p-3 text-sm">
          Note: Booking should be made within 3-14 days before the printed usage. Bookings made early or too late is discouraged.
        </div>
      </div>
    </div>
  )
}

function PrintLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className="min-w-44 font-semibold">{label}:</span>
      <span className="min-h-7 flex-1 border-b border-slate-500 px-2">{value}</span>
    </div>
  )
}

function RegistrarReviewModal({ onClose, onSubmit, request }: { onClose: () => void; onSubmit: (requestId: string, status: Status, remarks: string) => void; request: PortalRequest }) {
  const [remarks, setRemarks] = useState(request.remarks)

  return (
    <Modal title="Review Document Request" onClose={onClose} wide>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-[#e7e1db] bg-stone-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[.14em] text-slate-500">{request.id}</p>
            <h3 className="mt-2 text-2xl font-bold">{getDocumentTitle(request.kind)} - {request.owner}</h3>
            <p className="mt-2 text-slate-600">{request.remarks}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Student', request.owner],
              ['Type', getDocumentTitle(request.kind)],
              ['Copies', String(getCopiesForRequest(request))],
              ['Submitted', formatShortDate(request.date)],
              ['Current Status', request.status],
              ['Updated By', request.updatedBy ?? 'No office action yet'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-[#e7e1db] p-4">
                <p className="text-sm font-semibold uppercase tracking-[.12em] text-slate-500">{label}</p>
                <p className="mt-2 font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <label className="block">
            <span className="mb-2 block font-medium">Registrar remarks</span>
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={5} className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 outline-none focus:border-[#9d2d35]" />
          </label>
        </div>
        <aside className="rounded-lg border border-[#e7e1db] bg-white p-5">
          <h3 className="mb-4 text-xl font-bold">Decision</h3>
          <div className="space-y-3">
            <button disabled={request.status === 'Approved'} onClick={() => onSubmit(request.id, 'Approved', remarks || 'Approved by Registrar.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <CheckCircle2 size={18} />
              Approve
            </button>
            <button disabled={request.status === 'Rejected'} onClick={() => onSubmit(request.id, 'Rejected', remarks || 'Rejected by Registrar.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#b73b47] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <XCircle size={18} />
              Reject
            </button>
            <button disabled={request.status !== 'Approved'} onClick={() => onSubmit(request.id, 'Completed', remarks || 'Request completed and released.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-[#d9d3cc] font-semibold disabled:cursor-not-allowed disabled:opacity-45">
              <BadgeCheck size={18} />
              Mark completed
            </button>
          </div>
          <p className="mt-5 rounded-md bg-stone-50 p-3 text-sm text-slate-600">Approved requests can be marked completed after the document is released.</p>
        </aside>
      </div>
    </Modal>
  )
}

function SupplyReviewModal({ onClose, onSubmit, request }: { onClose: () => void; onSubmit: (requestId: string, status: Status, remarks: string) => void; request: PortalRequest }) {
  const [remarks, setRemarks] = useState(request.remarks)
  const items = getSupplyItems(request)

  return (
    <Modal title="Review Supply Request" onClose={onClose} wide>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-[#e7e1db] bg-stone-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[.14em] text-slate-500">{request.id}</p>
            <h3 className="mt-2 text-2xl font-bold">{request.owner}</h3>
            <p className="mt-2 text-slate-600">{request.remarks}</p>
          </div>
          <div className="rounded-lg border border-[#e7e1db] p-5">
            <h3 className="mb-4 text-lg font-bold">Requested items</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.label} className="flex justify-between rounded-md bg-stone-50 px-4 py-3">
                  <span>{item.label}</span>
                  <span className="font-semibold">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Requester', request.owner],
              ['Type', request.kind],
              ['Submitted', formatShortDate(request.date)],
              ['Current Status', request.status],
              ['Updated By', request.updatedBy ?? 'No office action yet'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-[#e7e1db] p-4">
                <p className="text-sm font-semibold uppercase tracking-[.12em] text-slate-500">{label}</p>
                <p className="mt-2 font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <label className="block">
            <span className="mb-2 block font-medium">Supply Office remarks</span>
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={5} className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 outline-none focus:border-[#9d2d35]" />
          </label>
        </div>
        <aside className="rounded-lg border border-[#e7e1db] bg-white p-5">
          <h3 className="mb-4 text-xl font-bold">Decision</h3>
          <div className="space-y-3">
            <button disabled={request.status === 'Approved'} onClick={() => onSubmit(request.id, 'Approved', remarks || 'Approved by Supply Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <CheckCircle2 size={18} />
              Approve
            </button>
            <button disabled={request.status === 'Rejected'} onClick={() => onSubmit(request.id, 'Rejected', remarks || 'Rejected by Supply Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#b73b47] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <XCircle size={18} />
              Reject
            </button>
          </div>
          <p className="mt-5 rounded-md bg-stone-50 p-3 text-sm text-slate-600">Approved supply requests are reflected immediately in the reports and status breakdown.</p>
        </aside>
      </div>
    </Modal>
  )
}

function FacilityReviewModal({ onClose, onSubmit, request }: { onClose: () => void; onSubmit: (requestId: string, status: Status, remarks: string) => void; request: PortalRequest }) {
  const [remarks, setRemarks] = useState(request.facilityRemarks ?? '')

  return (
    <Modal title="Review Facility Reservation" onClose={onClose} wide>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-[#e7e1db] bg-stone-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[.14em] text-slate-500">{request.id}</p>
            <h3 className="mt-2 text-2xl font-bold">{request.facility}</h3>
            <p className="mt-2 text-slate-600">{request.remarks}</p>
          </div>
          <div className="rounded-lg border border-[#e7e1db] bg-white p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold">Printable booking form</h3>
                <p className="text-slate-500">Print the reservation sheet for filing or signatures.</p>
              </div>
              <button type="button" onClick={() => printFacilityBookingForm({ ...request, facilityRemarks: remarks })} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#9d2d35] px-4 font-semibold text-white">
                <Printer size={17} />
                Print form
              </button>
            </div>
            <FacilityBookingPrintForm request={{ ...request, facilityRemarks: remarks }} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Requester', request.owner],
              ['Facility type', getFacilityType(request.facility)],
              ['Schedule', `${formatShortDate(request.date)} - ${request.time.replace('-', ' - ')}`],
              ['Attendees', String(getAttendeeCount(request))],
              ['Current Status', request.status],
              ['Updated By', request.updatedBy ?? 'No office action yet'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-[#e7e1db] p-4">
                <p className="text-sm font-semibold uppercase tracking-[.12em] text-slate-500">{label}</p>
                <p className="mt-2 font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <label className="block">
            <span className="mb-2 block font-medium">Admin Office remarks</span>
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={5} className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 outline-none focus:border-[#9d2d35]" />
          </label>
        </div>
        <aside className="rounded-lg border border-[#e7e1db] bg-white p-5">
          <h3 className="mb-4 text-xl font-bold">Decision</h3>
          <div className="space-y-3">
            <button disabled={request.status === 'Approved'} onClick={() => onSubmit(request.id, 'Approved', remarks || 'Reservation approved by Admin Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <CheckCircle2 size={18} />
              Approve
            </button>
            <button disabled={request.status === 'Rejected'} onClick={() => onSubmit(request.id, 'Rejected', remarks || 'Reservation rejected by Admin Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#b73b47] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <XCircle size={18} />
              Reject
            </button>
          </div>
          <p className="mt-5 rounded-md bg-stone-50 p-3 text-sm text-slate-600">Approved reservations appear in room availability and Admin Office reports.</p>
        </aside>
      </div>
    </Modal>
  )
}

function LeaveReviewModal({ onClose, onSubmit, request }: { onClose: () => void; onSubmit: (requestId: string, status: Status, remarks: string) => void; request: PortalRequest }) {
  const [remarks, setRemarks] = useState(request.remarks)

  return (
    <Modal title="Review Leave Application" onClose={onClose} wide>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-[#e7e1db] bg-stone-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[.14em] text-slate-500">{request.id}</p>
            <h3 className="mt-2 text-2xl font-bold">{getLeaveTypeLabel(request.kind)} - {request.owner}</h3>
            <p className="mt-2 text-slate-600">{request.remarks}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Employee', request.owner],
              ['Leave type', getLeaveTypeLabel(request.kind)],
              ['Dates', getLeaveDateRange(request)],
              ['Reason', request.remarks],
              ['Current Status', request.status],
              ['Updated By', request.updatedBy ?? 'No office action yet'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-[#e7e1db] p-4">
                <p className="text-sm font-semibold uppercase tracking-[.12em] text-slate-500">{label}</p>
                <p className="mt-2 font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <label className="block">
            <span className="mb-2 block font-medium">HR remarks</span>
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={5} className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 outline-none focus:border-[#9d2d35]" />
          </label>
        </div>
        <aside className="rounded-lg border border-[#e7e1db] bg-white p-5">
          <h3 className="mb-4 text-xl font-bold">Decision</h3>
          <div className="space-y-3">
            <button disabled={request.status === 'Approved'} onClick={() => onSubmit(request.id, 'Approved', remarks || 'Leave application approved by HR Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <CheckCircle2 size={18} />
              Approve
            </button>
            <button disabled={request.status === 'Rejected'} onClick={() => onSubmit(request.id, 'Rejected', remarks || 'Leave application rejected by HR Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#b73b47] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <XCircle size={18} />
              Reject
            </button>
          </div>
          <p className="mt-5 rounded-md bg-stone-50 p-3 text-sm text-slate-600">Approved leave applications are reflected immediately in HR reports and status totals.</p>
        </aside>
      </div>
    </Modal>
  )
}

function DecisionModal({ onClose, onSubmit, request, status }: { onClose: () => void; onSubmit: (requestId: string, status: Status, remarks: string) => void; request: PortalRequest; status: Status }) {
  const [remarks, setRemarks] = useState(status === 'Approved' ? 'Approved for processing.' : status === 'Completed' ? 'Request completed.' : '')
  return (
    <Modal title={`${status} Request`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-md bg-stone-50 p-4">
          <p className="font-bold">{request.title}</p>
          <p className="text-slate-500">{request.id} - {request.kind}</p>
        </div>
        <label className="block">
          <span className="mb-2 block font-medium">Remarks</span>
          <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={4} className="w-full rounded-md border border-[#d9d3cc] px-3 py-2 outline-none focus:border-[#9d2d35]" />
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-[#d9d3cc] px-4 py-2 font-medium">Cancel</button>
          <button onClick={() => onSubmit(request.id, status, remarks.trim() || `${status} by office.`)} className="rounded-md bg-[#9d2d35] px-4 py-2 font-semibold text-white">Save Status</button>
        </div>
      </div>
    </Modal>
  )
}

function UsersModal({ onClose }: { onClose: () => void }) {
  const { accounts, addAccount, deleteAccount } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('employee')
  const [department, setDepartment] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !email.trim()) return
    addAccount({ name: name.trim(), email: email.trim().toLowerCase(), password: 'password123', role, department: department.trim() || roleMeta[role].label })
    setName('')
    setEmail('')
    setDepartment('')
  }

  return (
    <Modal title="Manage Users" onClose={onClose} wide>
      <form onSubmit={submit} className="mb-5 grid gap-3 rounded-lg border border-[#e7e1db] p-4 lg:grid-cols-5">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="h-11 rounded-md border border-[#d9d3cc] px-3 outline-none focus:border-[#9d2d35]" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="h-11 rounded-md border border-[#d9d3cc] px-3 outline-none focus:border-[#9d2d35]" />
        <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="h-11 rounded-md border border-[#d9d3cc] px-3 outline-none focus:border-[#9d2d35]">
          {Object.entries(roleMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
        <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Department" className="h-11 rounded-md border border-[#d9d3cc] px-3 outline-none focus:border-[#9d2d35]" />
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#9d2d35] px-4 font-semibold text-white">
          <Plus size={16} />
          Add User
        </button>
      </form>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-[#e7e1db]">
        <table className="w-full min-w-[760px] text-left">
          <tbody className="divide-y divide-[#eee9e4]">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="px-4 py-3 font-medium">{account.name}</td>
                <td className="px-4 py-3">{account.email}</td>
                <td className="px-4 py-3">{roleMeta[account.role].label}</td>
                <td className="px-4 py-3">{account.department}</td>
                <td className="px-4 py-3">
                  <button disabled={account.role === 'admin'} onClick={() => deleteAccount(account.id)} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-40">
                    <Trash2 size={14} />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

function Modal({ children, onClose, title, wide = false }: { children: ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
      <div className={`max-h-full w-full overflow-auto rounded-lg bg-white shadow-2xl ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>
        <div className="sticky top-0 flex items-center justify-between border-b border-[#e7e1db] bg-white px-5 py-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-stone-100" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    Pending: 'bg-amber-50 text-amber-800 ring-amber-300',
    Approved: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
    Rejected: 'bg-red-100 text-red-800 ring-red-300',
    Completed: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  }
  const Icon = status === 'Pending' ? Clock : status === 'Rejected' ? XCircle : status === 'Completed' ? BadgeCheck : CheckCircle2
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${styles[status]}`}><Icon size={15} />{status}</span>
}

const notificationItems = [
  { id: 'tor-approved', kind: 'approval', title: 'TOR Request Approved', body: 'Your TOR request (DR-2026-001) has been approved. Please pick it up at Registrar Window 3.', date: '5/15/2026, 6:11:00 PM', age: '18d ago', read: false, icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-900' },
  { id: 'facility-approved', kind: 'approval', title: 'Facility Reservation Approved', body: 'AVR 2 reservation on June 10 has been confirmed.', date: '5/26/2026, 5:00:00 PM', age: '7d ago', read: false, icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-900' },
  { id: 'coe-rejected', kind: 'rejection', title: 'COE Request Rejected', body: 'Your COE request was rejected. Reason: please re-submit with correct semester indicated.', date: '3/4/2026, 5:46:00 PM', age: '90d ago', read: true, icon: XCircle, tone: 'bg-red-100 text-red-800' },
  { id: 'exam-schedule', kind: 'announcement', title: 'Final Exam Schedule Released', body: 'Check the academic calendar for the updated final examinations schedule.', date: '5/20/2026, 3:30:00 PM', age: '13d ago', read: true, icon: Megaphone, tone: 'bg-amber-100 text-amber-800' },
  { id: 'enrollment-reminder', kind: 'info', title: 'Reminder: Enrollment Period', body: 'Online enrollment for 1st Semester AY 2026-2027 opens on June 22.', date: '5/29/2026, 11:00:00 PM', age: '3d ago', read: false, icon: Info, tone: 'bg-stone-100 text-stone-700' },
]

function getNavItems(role: Role) {
  const student = [
    { label: 'Overview', icon: Home },
    { label: 'Request Document', icon: FileText },
    { label: 'Reserve Facility', icon: Building2 },
    { label: 'Room Availability', icon: CalendarClock },
    { label: 'My Requests', icon: PackageCheck },
    { label: 'Messages', icon: MessageSquare },
    { label: 'Notifications', icon: Bell },
    { label: 'Profile', icon: User },
  ]
  if (role === 'student') return student
  if (role === 'admin') return [
    { label: 'Overview', icon: Home },
    { label: 'Users', icon: UsersRound },
    { label: 'All Requests', icon: Layers3 },
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
  return [{ label: 'Overview', icon: Home }, { label: 'My Requests', icon: PackageCheck }, { label: 'Messages', icon: MessageSquare }, { label: 'Notifications', icon: Bell }, { label: 'Profile', icon: User }]
}

function getVisibleRequests(user: User, list: PortalRequest[]) {
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

function getCounts(list: PortalRequest[]) {
  return {
    Pending: list.filter((item) => item.status === 'Pending').length,
    Approved: list.filter((item) => item.status === 'Approved').length,
    Rejected: list.filter((item) => item.status === 'Rejected').length,
    Completed: list.filter((item) => item.status === 'Completed').length,
  }
}

function getDocumentTitle(kind: RequestKind) {
  if (kind === 'TOR Request') return 'TOR'
  if (kind === 'COE Request') return 'COE'
  return 'Exit Clearance'
}

function hasFacilityConflict(requests: PortalRequest[], date: string, time: string, facility: string) {
  return requests.some((request) => request.kind === 'Facility Reservation' && request.facility === facility && request.date === date && request.time === time && request.status !== 'Rejected')
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function getCopiesForRequest(request: PortalRequest) {
  if (request.id === 'DR-2026-001') return 2
  if (request.id === 'DR-2026-004') return 3
  return 1
}

function getSupplyItems(request: PortalRequest) {
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

function getFacilityType(facility?: string) {
  return facilities.find(([name]) => name === facility)?.[1] ?? (facility?.includes('Conference') ? 'Conference Room' : 'Facility')
}

function getAttendeeCount(request: PortalRequest) {
  if (request.attendees) return request.attendees
  const attendees: Record<string, number> = {
    'FR-2026-101': 12,
    'FR-2026-102': 28,
    'FR-2026-103': 20,
    'FR-2026-104': 15,
  }
  return attendees[request.id] ?? 10
}

function getFacilityReferenceNumber(request: PortalRequest) {
  return `FACILITY-${request.date.replaceAll('-', '')}-${request.id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`
}

function getRegistrarReferenceNumber(request: PortalRequest) {
  return `REG-${request.date.replaceAll('-', '')}-${request.id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`
}

function getRegistrarRequestLabel(kind: RequestKind) {
  if (kind === 'Certificate of Registration') return 'Certificate of Registration'
  if (kind === 'COE Request') return 'Certificate of Enrollment'
  if (kind === 'Certificate of Grades') return 'Certificate of Grades'
  if (kind === 'Certificate of Credit Units') return 'Certificate of Credit Units'
  return getDocumentTitle(kind)
}

function getFacilityPrintVenue(facility?: string) {
  const value = facility ?? ''
  if (value.includes('Library')) return 'Library'
  if (value.includes('AVR')) return 'AVR (EdTech Lab)'
  if (value.includes('Auditorium')) return 'Social Hall'
  if (value.includes('Room')) return 'Classroom'
  return 'Others'
}

function printFacilityBookingForm(request: PortalRequest) {
  printHtmlDocument(getFacilityBookingPrintHtml(request))
}

function printRegistrarRequestForm(request: PortalRequest) {
  printHtmlDocument(getRegistrarRequestPrintHtml(request))
}

function printHtmlDocument(html: string) {
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

function getRegistrarRequestPrintHtml(request: PortalRequest) {
  const programOptions = ['Bachelor of Early Childhood Education', 'Bachelor of Technical-Vocational Teacher Education', 'major in Heating, Ventilating, Airconditioning, and Refrigeration Technology', 'major in Computer Programming', 'Bachelor of Science in Entrepreneurship']
  const requestOptions = ['Certificate of Registration', 'Certificate of Enrollment', 'Certificate of Grades', 'Certificate of Credit Units']
  const check = (selected: string, option: string) => `<span class="box">${selected === option ? 'x' : ''}</span>`

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(getRegistrarReferenceNumber(request))}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #e2e8f0; padding: 24px; font-family: "Segoe UI", "Times New Roman", serif; color: #0f172a; }
    .sheet { max-width: 1000px; margin: 0 auto; background: white; padding: 32px; box-shadow: 0 18px 35px rgba(15, 23, 42, .18); }
    .letterhead { position: relative; text-align: center; border-bottom: 2px solid #8b5a2b; padding-bottom: 16px; }
    .ref { position: absolute; right: 0; top: 0; text-align: right; font-size: 11px; color: #1e6f5c; font-weight: 700; text-transform: uppercase; }
    .ref strong { display: block; margin-top: 4px; color: #1e3a3a; font-family: monospace; font-size: 14px; letter-spacing: 1px; }
    .logo { display: inline-flex; align-items: center; justify-content: center; width: 58px; height: 58px; border: 2px solid #1e6f5c; border-radius: 999px; color: #1e6f5c; font-weight: 800; margin-bottom: 8px; }
    .college { font-size: 24px; font-weight: 800; color: #1e3a3a; }
    .address { font-size: 13px; color: #2c5a6e; margin-top: 4px; }
    .office { margin-top: 12px; font-size: 18px; font-weight: 800; letter-spacing: 1px; }
    h1 { margin: 26px 0 28px; text-align: center; font-size: 25px; text-decoration: underline; text-underline-offset: 7px; }
    .row { display: flex; gap: 12px; align-items: baseline; margin-bottom: 16px; font-size: 16px; }
    .label { min-width: 150px; font-weight: 700; }
    .line { flex: 1; min-height: 26px; border-bottom: 1px solid #64748b; padding: 0 8px 3px; }
    .group { border: 1px solid #cbd5e1; border-radius: 10px; background: #f8fafc; padding: 16px; margin: 16px 0; }
    .group-title { margin: 0 0 10px; font-weight: 800; color: #1e3a3a; }
    .item { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
    .box { display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center; border: 1px solid #334155; font-size: 12px; }
    .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 28px; }
    .sig-label { font-weight: 700; margin-bottom: 8px; }
    .sig-line { min-height: 32px; border-bottom: 1px solid #0f172a; padding: 0 8px 4px; }
    @media print { body { background: white; padding: 0; } .sheet { max-width: none; box-shadow: none; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="letterhead">
      <div class="ref">Reference Number<strong>${escapeHtml(getRegistrarReferenceNumber(request))}</strong></div>
      <div class="logo">CCD</div>
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
      ${programOptions.map((option) => `<div class="item">${check(request.program ?? '', option)} ${escapeHtml(option)}</div>`).join('')}
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

function getFacilityBookingPrintHtml(request: PortalRequest) {
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
    * { box-sizing: border-box; }
    body { margin: 0; background: #e2e8f0; padding: 24px; font-family: "Times New Roman", serif; color: #0f172a; }
    .sheet { max-width: 900px; margin: 0 auto; background: white; padding: 32px; box-shadow: 0 18px 35px rgba(15, 23, 42, .18); }
    .letterhead { position: relative; text-align: center; border-bottom: 2px solid #8b5a2b; padding-bottom: 16px; }
    .ref { position: absolute; right: 0; top: 0; text-align: right; font-size: 11px; color: #1e6f5c; font-weight: 700; text-transform: uppercase; }
    .ref strong { display: block; margin-top: 4px; color: #1e3a3a; font-family: monospace; font-size: 14px; letter-spacing: 1px; }
    .logo { display: inline-flex; align-items: center; justify-content: center; width: 58px; height: 58px; border: 2px solid #1e6f5c; border-radius: 999px; color: #1e6f5c; font-weight: 800; margin-bottom: 8px; }
    .college { font-size: 24px; font-weight: 800; color: #1e3a3a; }
    .address { font-size: 13px; color: #2c5a6e; margin-top: 4px; }
    h1 { margin: 28px 0 30px; text-align: center; font-size: 25px; text-decoration: underline; text-underline-offset: 7px; }
    .row { display: flex; gap: 12px; align-items: baseline; margin-bottom: 18px; font-size: 16px; }
    .label { min-width: 190px; font-weight: 700; }
    .line { flex: 1; min-height: 26px; border-bottom: 1px solid #64748b; padding: 0 8px 3px; }
    .venue { border: 1px solid #cbd5e1; background: #f8fafc; padding: 16px; margin: 8px 0 18px; }
    .venue-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 22px; }
    .item { display: flex; align-items: center; gap: 8px; }
    .box { display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center; border: 1px solid #334155; font-size: 12px; }
    .note { margin-top: 22px; padding: 12px; border-left: 4px solid #b68b40; background: #fef9e6; font-size: 13px; text-align: justify; }
    @media print { body { background: white; padding: 0; } .sheet { max-width: none; box-shadow: none; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="letterhead">
      <div class="ref">Reference Number<strong>${escapeHtml(getFacilityReferenceNumber(request))}</strong></div>
      <div class="logo">CCD</div>
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

function printRow(label: string, value: string) {
  return `<div class="row"><span class="label">${escapeHtml(label)}:</span><span class="line">${escapeHtml(value)}</span></div>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function getTopFacilities(requests: PortalRequest[]) {
  const totals = new Map<string, number>()
  requests.forEach((request) => {
    const facility = request.facility ?? request.title
    totals.set(facility, (totals.get(facility) ?? 0) + 1)
  })
  return [...totals.entries()]
    .map(([facility, count]) => ({ facility, count }))
    .sort((a, b) => b.count - a.count)
}

function isLeaveApplication(request: PortalRequest) {
  return leaveKinds.includes(request.kind) && request.id.startsWith('LV-')
}

function getLeaveTypeLabel(kind: RequestKind) {
  if (kind === 'Vacation Leave') return 'Vacation'
  if (kind === 'Sick Leave') return 'Sick'
  if (kind === 'Personal Leave') return 'Personal'
  if (kind === 'Official Leave') return 'Official'
  return 'Leave'
}

function getLeaveDateRange(request: PortalRequest) {
  const start = formatShortDate(request.date)
  const end = /^\d{4}-\d{2}-\d{2}$/.test(request.time) ? formatShortDate(request.time) : start
  return start === end ? start : `${start} - ${end}`
}

function getLeaveTypeRows(requests: PortalRequest[]) {
  const colors: Record<string, string> = {
    Vacation: 'bg-[#3a9276]',
    Sick: 'bg-[#b94247]',
    Personal: 'bg-[#eba900]',
    Official: 'bg-stone-400',
  }
  return leaveKinds.map((kind) => {
    const label = getLeaveTypeLabel(kind)
    return {
      label,
      count: requests.filter((request) => request.kind === kind).length,
      color: colors[label],
    }
  })
}

function isEmployeePortalRequest(request: PortalRequest) {
  return request.ownerId === 'emp-01' && (
    request.kind === 'Supply Request' ||
    request.kind === 'Inventory Request' ||
    request.kind === 'Facility Reservation' ||
    isLeaveApplication(request)
  )
}

function getEmployeeRequestType(request: PortalRequest) {
  if (request.kind === 'Facility Reservation') return 'Facility'
  if (leaveKinds.includes(request.kind)) return 'Leave'
  if (['Supply Request', 'Inventory Request'].includes(request.kind)) return 'Supply'
  return 'Request'
}

function getEmployeeTypeTone(request: PortalRequest) {
  const type = getEmployeeRequestType(request)
  if (type === 'Facility') return 'bg-red-100 text-[#7a111b]'
  if (type === 'Leave') return 'bg-emerald-100 text-emerald-900'
  if (type === 'Supply') return 'bg-amber-100 text-amber-900'
  return 'bg-stone-100 text-stone-700'
}

function getEmployeeRequestTitle(request: PortalRequest) {
  if (request.kind === 'Facility Reservation') return request.facility ?? request.title
  if (leaveKinds.includes(request.kind)) return request.kind
  if (['Supply Request', 'Inventory Request'].includes(request.kind)) return `${getSupplyItems(request).length} item(s)`
  return request.title
}

function getEmployeeRequestDetails(request: PortalRequest) {
  if (request.kind === 'Facility Reservation') return `${request.date} - ${request.time}`
  if (leaveKinds.includes(request.kind)) return `${request.date} -> ${request.time}: ${request.remarks}`
  return request.remarks
}

function getDateDuration(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime()
  const end = new Date(`${endDate}T00:00:00`).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1
  return Math.floor((end - start) / 86_400_000) + 1
}

function getSystemAdminRequests(requests: PortalRequest[]) {
  return requests.filter((request) =>
    documentKinds.includes(request.kind) ||
    request.kind === 'Facility Reservation' ||
    ['Supply Request', 'Inventory Request'].includes(request.kind) ||
    isLeaveApplication(request)
  )
}

function getAdminStats(requests: PortalRequest[], accounts: User[]) {
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

function getAdminRequestType(request: PortalRequest) {
  if (documentKinds.includes(request.kind)) return 'Document'
  if (request.kind === 'Facility Reservation') return 'Facility'
  if (['Supply Request', 'Inventory Request'].includes(request.kind)) return 'Supply'
  if (leaveKinds.includes(request.kind)) return 'Leave'
  return 'Request'
}

function getAdminTypeTone(request: PortalRequest) {
  const type = getAdminRequestType(request)
  if (type === 'Document') return 'bg-red-100 text-[#7a111b]'
  if (type === 'Facility') return 'bg-emerald-100 text-emerald-900'
  if (type === 'Supply') return 'bg-amber-100 text-amber-900'
  if (type === 'Leave') return 'bg-stone-100 text-stone-700'
  return 'bg-slate-100 text-slate-700'
}

function getAdminTypeRows(requests: PortalRequest[]) {
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

function getAdminActivityLogs(requests: PortalRequest[]) {
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

function getRequestActivityTimestamp(request: PortalRequest) {
  const displayTime = request.id === 'FR-2026-102' ? '4:15:00 PM' : request.id === 'DR-2026-002' ? '10:02:00 PM' : request.time.includes('-') ? '7:00:00 PM' : '5:00:00 PM'
  return `${formatDate(request.date)}, ${displayTime}`
}

export default function SchoolPortal() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
