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
  Home,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PackageCheck,
  Paperclip,
  Plus,
  Printer,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Save,
  Trash2,
  User as UserIcon,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import ccdLogo from './assets/ccd-logo.png'
import davaoCitySeal from './assets/davao-city-seal.png'
import AdminOfficeDashboard from './AdminOfficeDashboard'
import EmployeeDashboard from './EmployeeDashboard'
import HrDashboard from './HrDashboard'
import RegistrarDashboard from './RegistrarDashboard'
import SupplyDashboard from './SupplyDashboard'
import SystemAdminDashboard from './SystemAdminDashboard'
import { documentKinds, facilities, initialCategories, initialInventory, initialMessages, initialRequests, initialStockMovements, initialSuppliers, leaveKinds, messageAttachmentCache, roleMeta, storageKeys, type Message, type MessageAttachment, type PortalRequest, type RequestKind, type Role, type Status, type StockMovement, type SupplierInfo, type SupplyCategory, type SupplyItem, type User } from './portalData'
import { canPrintAttachment, formatDate, formatFileSize, formatProgramWithMajor, formatShortDate, getAttendeeCount, getCivilServiceLeaveLabel, getCivilServiceLeaveTypes, getCopiesForRequest, getCounts, getDateDuration, getDocumentTitle, getExitClearanceDocumentOptions, getExitClearanceOffices, getExitClearanceReferenceNumber, getFacilityPrintVenue, getFacilityReferenceNumber, getFacilityType, getLeaveDateRange, getLeaveReferenceNumber, getLeaveTypeLabel, getLeaveTypeRows, getMessageAttachmentData, getNavItems, getRegistrarReferenceNumber, getRegistrarRequestLabel, getSupplyItems, getTopFacilities, getVisibleRequests, hasFacilityConflict, isLeaveApplication, notificationItems, printDocumentRequestForm, printFacilityBookingForm, printLeaveApplicationForm, printMessageAttachment, stripAttachmentDataForStorage } from './portalHelpers'
import { readStored, useAuth } from './portalAuth'
import { hasBootstrapRows, loadBootstrapData, syncBootstrapData } from './portalApi'
import { ActionCard, AnnouncementsPanel, Avatar, InfoCard, MetricCard, NotificationsDropdown, PageIntro, ProfileDropdown, ProfileField, StatusPill } from './portalComponents'
import StatusBreakdownPanel from './StatusBreakdownPanel'

type ActiveModal =
  | { type: 'viewRequest'; request: PortalRequest }
  | { type: 'decision'; request: PortalRequest; status: Status }
  | { type: 'users' }
  | null

export function Dashboard() {
  const { accounts, user, logout } = useAuth()
  const [requestList, setRequestList] = useState<PortalRequest[]>(initialRequests)
  const [messageList, setMessageList] = useState<Message[]>(initialMessages)
  const [inventory, setInventory] = useState<SupplyItem[]>(initialInventory)
  const [categories, setCategories] = useState<SupplyCategory[]>(initialCategories)
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>(initialSuppliers)
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(initialStockMovements)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState('Overview')
  const [modal, setModal] = useState<ActiveModal>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationRead, setNotificationRead] = useState<Record<string, boolean>>(() => readStored(storageKeys.notifications, {}))
  const [databaseReady, setDatabaseReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadBootstrapData()
      .then((data) => {
        if (cancelled) return
        if (hasBootstrapRows(data)) {
          setRequestList(data.requests)
          setMessageList(data.messages)
          setInventory(data.inventory)
          setCategories(data.categories)
          setSuppliers(data.suppliers)
          setStockMovements(data.stockMovements)
        }
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        if (!cancelled) setDatabaseReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!databaseReady) return

    const timeoutId = window.setTimeout(() => {
      syncBootstrapData({
        accounts,
        requests: requestList,
        messages: messageList.map(stripAttachmentDataForStorage),
        inventory,
        categories,
        suppliers,
        stockMovements,
      }).catch((error) => {
        console.error(error)
      })
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [accounts, categories, databaseReady, inventory, messageList, requestList, stockMovements, suppliers])

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
      if (isLeaveApplication(request)) return { ...request, status, hrRemarks: remarks, updatedBy: user.name }
      return { ...request, status, remarks, updatedBy: user.name }
    }))
    setModal(null)
  }

  const sendMessage = (requestId: string, body: string, attachment?: MessageAttachment) => {
    if (!body.trim() && !attachment) return
    const messageId = `MSG-${Date.now()}`
    if (attachment) messageAttachmentCache.set(messageId, attachment)
    setMessageList((current) => [...current, {
      id: messageId,
      requestId,
      senderId: user.id,
      senderName: user.name,
      body: body.trim(),
      sentAt: new Date().toLocaleString(),
      attachment: attachment ? { ...attachment, dataUrl: '' } : undefined,
    }])
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#121212]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-[345px] transform bg-[#228b22] text-white transition lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[86px] items-center justify-between border-b border-white/10 px-8">
          <button onClick={() => setActiveView('Overview')} className="flex items-center gap-4 text-left">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden">
              <img src={ccdLogo} alt="City College of Davao logo" className="h-full w-full object-contain" />
            </span>
            <span>
              <span className="block text-2xl font-bold">CCDPortal</span>
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
              {unreadCount > 0 && <span className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#228b22] text-xs font-bold text-white">{unreadCount}</span>}
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
            <RegistrarDashboard key={activeView} activeView={activeView} onReview={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} />
          )}
          {user.role === 'supply' && ['Overview', 'Supply Requests', 'Inventory', 'Categories', 'Stock Movements', 'Suppliers', 'Reports'].includes(activeView) && (
            <SupplyDashboard activeView={activeView} categories={categories} currentUserName={user.name} inventory={inventory} onInventoryChange={setInventory} suppliers={suppliers} onSuppliersChange={setSuppliers} stockMovements={stockMovements} onStockMovementAdd={setStockMovements} onReview={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} />
          )}
          {user.role === 'adminOffice' && ['Overview', 'Facility Reservations', 'Reports'].includes(activeView) && (
            <AdminOfficeDashboard activeView={activeView} onReview={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} />
          )}
          {user.role === 'hr' && ['Overview', 'Leave Applications', 'Reports'].includes(activeView) && (
            <HrDashboard activeView={activeView} onReview={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} />
          )}
          {user.role === 'employee' && ['Overview', 'File Leave', 'Request Supplies', 'Reserve Facility', 'My Requests', 'Room Availability'].includes(activeView) && (
            <EmployeeDashboard activeView={activeView} existingRequests={requestList} onSubmit={addRequest} onView={setActiveView} onViewRequest={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} user={user} />
          )}
          {user.role === 'admin' && ['Overview', 'Users', 'All Requests', 'Reports', 'Activity Logs', 'Settings'].includes(activeView) && (
            <SystemAdminDashboard activeView={activeView} onViewRequest={(request) => setModal({ type: 'viewRequest', request })} requests={visibleRequests} />
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
      <section className="rounded-lg bg-[linear-gradient(100deg,#228b22,#228b22_56%,#4cbb17)] p-7 text-white shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="mb-2 font-semibold uppercase tracking-[.08em] text-white/75">Wednesday, June 3</p>
            <h2 className="text-4xl font-bold">Hi, {user.name.split(' ')[0]}</h2>
            <p className="mt-2 text-xl font-medium text-white/85">{user.department} - Student ID 2022-00451</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onView('Request Document')} className="inline-flex h-14 items-center gap-3 rounded-md bg-[#4cbb17] px-7 text-lg font-semibold text-black hover:bg-[#4cbb17]">
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
        <ActionCard title="Request a document" subtitle="TOR, COE, or Exit Clearance" icon={FileText} tone="bg-[#228b22] text-white" onClick={() => onView('Request Document')} />
        <ActionCard title="Reserve a facility" subtitle="Rooms, labs, AVRs" icon={Building2} tone="bg-[#2f8d73] text-white" onClick={() => onView('Reserve Facility')} highlighted />
        <ActionCard title="Track my requests" subtitle="View status and remarks" icon={PackageCheck} tone="bg-[#4cbb17] text-black" onClick={() => onView('My Requests')} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_470px]">
        <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Recent requests</h2>
              <p className="text-slate-500">Latest document submissions</p>
            </div>
            <button onClick={() => onView('My Requests')} className="font-medium text-[#228b22]">View all</button>
          </div>
          <div className="divide-y divide-[#eee9e4]">
            {requests.slice(0, 4).map((request) => (
              <div key={request.id} className="flex items-center gap-4 py-4">
                <span className={`flex h-12 w-12 items-center justify-center rounded-md ${documentKinds.includes(request.kind) ? 'bg-red-50 text-[#228b22]' : 'bg-emerald-50 text-emerald-800'}`}>
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

export function AdminOfficeView({ activeView, onReview, requests }: { activeView: string; onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
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
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, name, facility..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#228b22] xl:w-[390px]" />
            </label>
          </div>
          <div className="mb-6 flex flex-wrap">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-full border px-5 py-2 ${statusFilter === status ? 'border-[#4cbb17] bg-[#4cbb17]/10 text-[#228b22]' : 'border-[#e7e1db] hover:bg-stone-50'}`}>{status}</button>
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
                <button onClick={() => onReview(request)} className="font-semibold text-[#228b22]">Review</button>
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

export function HrOfficeView({ activeView, onReview, requests }: { activeView: string; onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
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
              <p className="mt-2 text-xl text-slate-600">Approve Civil Service Form No. 6 leave applications.</p>
            </div>
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, name, reason..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#228b22] xl:w-[390px]" />
            </label>
          </div>
          <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex flex-wrap rounded-lg border border-[#e7e1db] bg-stone-50 p-1">
              {[
                ['All', 'All types'],
                ...leaveKinds.map((kind) => [kind, getLeaveTypeLabel(kind)]),
              ].map(([value, label]) => (
                <button key={value} onClick={() => setTypeFilter(value as RequestKind | 'All')} className={`rounded-md px-4 py-2 text-sm font-semibold ${typeFilter === value ? 'bg-[#228b22] text-white' : 'text-slate-700'}`}>{label}</button>
              ))}
            </div>
            <div className="flex flex-wrap">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-full border px-5 py-2 ${statusFilter === status ? 'border-[#4cbb17] bg-[#4cbb17]/10 text-[#228b22]' : 'border-[#e7e1db] hover:bg-stone-50'}`}>{status}</button>
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
                <button onClick={() => onReview(request)} className="font-semibold text-[#228b22]">Review</button>
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

function RequestDocumentView({ onSubmit, user }: { onSubmit: (request: PortalRequest) => void; user: User }) {
  const [kind, setKind] = useState<RequestKind>('COE Request')
  const [studentId, setStudentId] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [semester, setSemester] = useState('')
  const [schoolYear, setSchoolYear] = useState('2026-2027')
  const [program, setProgram] = useState('Bachelor of Science in Entrepreneurship')
  const [major, setMajor] = useState('major in Heating, Ventilating, Airconditioning, and Refrigeration Technology')
  const [transferReason, setTransferReason] = useState('')
  const [exitRequestedDocs, setExitRequestedDocs] = useState<string[]>(['Transcript of Records (TOR)'])
  const [purpose, setPurpose] = useState('')
  const registrarDocuments: { kind: RequestKind; label: string; description: string }[] = [
    { kind: 'Certificate of Registration', label: 'Certificate of Registration', description: 'Official registration record for the current term.' },
    { kind: 'COE Request', label: 'Certificate of Enrollment', description: 'Proof of current enrollment for scholarships, visas, and requirements.' },
    { kind: 'Certificate of Grades', label: 'Certificate of Grades', description: 'Certified grade record for a term or school year.' },
    { kind: 'Certificate of Credit Units', label: 'Certificate of Credit Units', description: 'Certification of credited academic units.' },
    { kind: 'TOR Request', label: 'Transcript of Records', description: 'Official academic record for transfer or employment.' },
    { kind: 'Change of Subject due to Conflict of Schedule', label: 'Change of Student due to Conflict of Schedule', description: 'Request a student schedule change due to a conflict.' },
    { kind: 'Adding/Dropping of Subjects', label: 'Adding/Dropping of Subjects', description: 'Request to add or drop enrolled subjects.' },
    { kind: 'Other Registrar Request', label: 'Other', description: 'Submit another Registrar-related request.' },
    { kind: 'Exit Clearance', label: 'Exit Clearance', description: 'Required for graduation, transfer, or leave of absence.' },
  ]
  const exitDocumentOptions = ['Transcript of Records (TOR)', 'Special Order (S.O)', 'CAV', 'Honorable Dismissal', 'Diploma', 'Good Moral Character', 'Authentication']

  const toggleExitDocument = (documentName: string) => {
    setExitRequestedDocs((current) => current.includes(documentName) ? current.filter((item) => item !== documentName) : [...current, documentName])
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!purpose.trim()) return
    onSubmit({
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
      major: program === 'Bachelor of Technical-Vocational Teacher Education' ? major : '',
      transferReason: kind === 'Exit Clearance' ? transferReason.trim() : '',
      requestedDocs: kind === 'Exit Clearance' ? exitRequestedDocs : [getRegistrarRequestLabel(kind)],
    })
    setPurpose('')
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_485px]">
      <PageIntro title="Registrar request form" description="Request certificates, enrollment records, grades, TOR, and other Registrar documents." icon={FileText} tone="bg-[#4cbb17]/15 text-[#228b22]" />
      <section className="rounded-lg border border-[#e7e1db] bg-white p-7 xl:col-start-1">
        <p className="mb-4 font-medium">Request for</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {registrarDocuments.map(({ description, kind: value, label }) => (
            <button key={value} type="button" onClick={() => setKind(value)} className={`rounded-lg border p-5 text-left ${kind === value ? 'border-[#bd4448] bg-red-50/40 ring-1 ring-[#bd4448]' : 'border-[#e7e1db] hover:border-[#bd4448]'}`}>
              <span className="mb-8 flex h-12 w-12 items-center justify-center rounded-md bg-[#228b22] text-white">
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
            <span className="flex h-12 w-3 rounded-full bg-[#4cbb17]" />
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
            <input value={studentId} onChange={(event) => setStudentId(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Year Level</span>
            <input value={yearLevel} onChange={(event) => setYearLevel(event.target.value)} placeholder="e.g. 3rd Year" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Semester</span>
            <input value={semester} onChange={(event) => setSemester(event.target.value)} placeholder="e.g. 1st Semester" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
          <label>
            <span className="mb-2 block font-medium">School Year</span>
            <input value={schoolYear} onChange={(event) => setSchoolYear(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
        </div>
        <label className="mt-5 block">
          <span className="mb-2 block font-medium">Program</span>
          <select value={program} onChange={(event) => setProgram(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
            {['Bachelor of Early Childhood Education', 'Bachelor of Technical-Vocational Teacher Education', 'Bachelor of Science in Entrepreneurship'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        {program === 'Bachelor of Technical-Vocational Teacher Education' && (
          <label className="mt-5 block">
            <span className="mb-2 block font-medium">Major</span>
            <select value={major} onChange={(event) => setMajor(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
              {['major in Heating, Ventilating, Airconditioning, and Refrigeration Technology', 'major in Computer Programming'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        )}
        {kind === 'Exit Clearance' && (
          <div className="mt-5 rounded-lg border border-[#e7e1db] bg-stone-50 p-5">
            <label className="block">
              <span className="mb-2 block font-medium">Reason for transfer</span>
              <input value={transferReason} onChange={(event) => setTransferReason(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] bg-white px-4 text-lg outline-none focus:border-[#228b22]" />
            </label>
            <p className="mb-3 mt-5 font-medium">Request for</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {exitDocumentOptions.map((documentName) => (
                <label key={documentName} className="flex items-center gap-3 rounded-md border border-[#e7e1db] bg-white p-3">
                  <input type="checkbox" checked={exitRequestedDocs.includes(documentName)} onChange={() => toggleExitDocument(documentName)} />
                  <span>{documentName}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <label className="mt-5 block">
          <span className="mb-2 block font-medium">Purpose / reason</span>
          <textarea value={purpose} onChange={(event) => setPurpose(event.target.value.slice(0, 500))} rows={6} placeholder="e.g. For scholarship renewal..." className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 text-lg outline-none focus:border-[#228b22] focus:ring-4 focus:ring-[#4cbb17]/20" />
        </label>
        <p className="mt-2 text-slate-500">{purpose.length} / 500 characters</p>
        <div className="mt-6 flex justify-end">
          <button className="rounded-md bg-[#228b22] px-7 py-3 text-lg font-semibold text-white hover:bg-[#228b22]">Submit request</button>
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
          <select value={facility} onChange={(event) => setFacility(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22] focus:ring-4 focus:ring-[#4cbb17]/20">
            {facilities.map(([name, type]) => <option key={name} value={name}>{name} - {type}</option>)}
          </select>
        </label>
        <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-900">{facilities.find(([name]) => name === facility)?.[1]}</span>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <label>
            <span className="mb-2 block font-medium">Date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
          <label>
            <span className="mb-2 block font-medium">Start time</span>
            <input type="time" value={start} onChange={(event) => setStart(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
          <label>
            <span className="mb-2 block font-medium">End time</span>
            <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
        </div>
        <label className="mt-5 block">
          <span className="mb-2 block font-medium">Expected attendees</span>
          <input type="number" min={1} value={attendees} onChange={(event) => setAttendees(Number(event.target.value))} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <label className="mt-5 block">
          <span className="mb-2 block font-medium">Purpose / activity</span>
          <textarea value={purpose} onChange={(event) => setPurpose(event.target.value.slice(0, 500))} rows={6} placeholder="e.g. Thesis defense rehearsal, org meeting, workshop..." className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <p className="mt-2 text-slate-500">{purpose.length} / 500 characters</p>
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3 border-t border-[#e7e1db] pt-4">
          <button type="button" onClick={() => setPurpose('')} className="rounded-md border border-[#d9d3cc] px-7 py-3 text-lg font-medium">Reset</button>
          <button className="rounded-md bg-[#228b22] px-7 py-3 text-lg font-semibold text-white hover:bg-[#228b22]">Submit reservation</button>
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

export function RoomAvailabilityView({ requests }: { requests: PortalRequest[] }) {
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
              <p className="mt-2 font-medium text-[#228b22]">Today</p>
            </div>
            <button className="rounded-md p-2 hover:bg-stone-100" aria-label="Next month"><ChevronDown className="-rotate-90" size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-3 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <p key={day} className="text-sm font-bold uppercase text-slate-400">{day}</p>)}
            <span />
            {Array.from({ length: 30 }, (_, index) => index + 1).map((day) => (
              <button key={day} onClick={() => setSelectedDay(day)} className={`relative h-14 rounded-md text-lg ${selectedDay === day ? 'bg-[#228b22] font-bold text-white' : day === 12 ? 'bg-stone-100' : 'hover:bg-stone-100'}`}>
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
                <button key={item} onClick={() => setStatus(item)} className={`rounded-full border px-5 py-2 ${status === item ? 'border-[#4cbb17] bg-[#4cbb17]/10 text-[#228b22]' : 'border-[#e7e1db] hover:bg-stone-50'}`}>{item}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, type, purpose..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#228b22] sm:w-[380px]" />
            </label>
            <div className="flex rounded-full border border-[#e7e1db] bg-stone-50 p-1">
              {(['All', 'Documents', 'Facilities'] as const).map((item) => (
                <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-5 py-2 font-medium ${category === item ? 'bg-[#228b22] text-white' : 'text-slate-700'}`}>{item}</button>
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
                      <span className={`flex h-10 w-10 items-center justify-center rounded-md ${documentKinds.includes(request.kind) ? 'bg-[#4cbb17]/15 text-[#228b22]' : 'bg-emerald-100 text-emerald-900'}`}>
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
                      {documentKinds.includes(request.kind) && (
                        <button type="button" onClick={() => printDocumentRequestForm(request)} className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                          <Printer size={16} />
                          Print
                        </button>
                      )}
                      <button type="button" onClick={() => onView(request)} className="font-semibold text-[#228b22]">View</button>
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

function MessagesView({ currentUser, messages, onSend, requests }: { currentUser: User; messages: Message[]; onSend: (requestId: string, body: string, attachment?: MessageAttachment) => void; requests: PortalRequest[] }) {
  const conversations = requests.filter((request) => {
    const hasMessages = messages.some((message) => message.requestId === request.id)
    if (currentUser.role === 'student') return request.ownerId === currentUser.id && documentKinds.includes(request.kind)
    if (currentUser.role === 'registrar') return request.office === 'Registrar' || hasMessages
    return hasMessages
  })
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? '')
  const [body, setBody] = useState('')
  const [attachment, setAttachment] = useState<MessageAttachment | undefined>()
  const selected = conversations.find((request) => request.id === selectedId) ?? conversations[0]
  const thread = selected ? messages.filter((message) => message.requestId === selected.id) : []

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    onSend(selected.id, body, attachment)
    setBody('')
    setAttachment(undefined)
  }

  const uploadAttachment = (file?: File) => {
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      window.alert('Please upload a file smaller than 50 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      setAttachment({
        dataUrl: reader.result,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
      })
    }
    reader.readAsDataURL(file)
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
              <button key={request.id} onClick={() => setSelectedId(request.id)} className={`w-full border-t border-[#eee9e4] p-7 text-left hover:bg-stone-50 ${selected?.id === request.id ? 'border-l-4 border-l-[#228b22] bg-red-50/55' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-bold">{request.title} - {request.id}</p>
                  <StatusPill status={request.status} />
                </div>
                <p className="mt-2 truncate text-slate-600">Registrar: {last?.body || last?.attachment?.name || 'No message yet.'}</p>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex min-h-[730px] flex-col">
        {selected ? (
          <>
            <div className="flex items-center gap-4 border-b border-[#e7e1db] p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4cbb17]/15 text-[#228b22]"><MessageSquare size={22} /></span>
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
                    <div className={`max-w-[760px] rounded-lg border border-[#e7e1db] px-6 py-4 ${mine ? 'bg-[#228b22] text-white' : 'bg-stone-50'}`}>
                      <p className="mb-2 font-semibold">{message.senderName} <span className={mine ? 'ml-2 text-sm font-normal text-white/70' : 'ml-2 text-sm font-normal text-slate-500'}>{message.sentAt}</span></p>
                      {message.body && <p className="text-xl leading-8">{message.body}</p>}
                      {message.attachment && (
                        <div className={`mt-4 rounded-md border p-4 ${mine ? 'border-white/25 bg-white/10' : 'border-[#e7e1db] bg-white'}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <span className={`flex h-11 w-11 items-center justify-center rounded-md ${mine ? 'bg-white/15' : 'bg-[#4cbb17]/15 text-[#228b22]'}`}>
                              <FileText size={20} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{message.attachment.name}</p>
                              <p className={mine ? 'text-sm text-white/70' : 'text-sm text-slate-500'}>{formatFileSize(message.attachment.size)}</p>
                            </div>
                            <div className="flex gap-2">
                              {getMessageAttachmentData(message) ? (
                                <a href={getMessageAttachmentData(message)!.dataUrl} download={message.attachment.name} target="_blank" rel="noreferrer" className={`rounded-md px-4 py-2 font-semibold ${mine ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'}`}>Open</a>
                              ) : (
                                <span className={`rounded-md px-4 py-2 text-sm font-semibold ${mine ? 'bg-white/10 text-white/75' : 'bg-stone-100 text-slate-500'}`}>File unavailable after refresh</span>
                              )}
                              {canPrintAttachment(getMessageAttachmentData(message)) && (
                                <button type="button" onClick={() => printMessageAttachment(getMessageAttachmentData(message)!)} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 font-semibold ${mine ? 'bg-white text-[#228b22]' : 'bg-[#228b22] text-white'}`}>
                                  <Printer size={16} />
                                  Print
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-[#e7e1db] p-7">
              {attachment && (
                <div className="mb-3 flex items-center gap-3 rounded-md border border-[#e7e1db] bg-stone-50 px-4 py-3">
                  <FileText size={18} className="text-[#228b22]" />
                  <span className="min-w-0 flex-1 truncate font-medium">{attachment.name}</span>
                  <span className="text-sm text-slate-500">{formatFileSize(attachment.size)}</span>
                  <button type="button" onClick={() => setAttachment(undefined)} className="rounded-md p-1 text-slate-500 hover:bg-stone-200" aria-label="Remove attachment">
                    <X size={18} />
                  </button>
                </div>
              )}
              <form onSubmit={submit} className="flex gap-3">
                <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-md border border-[#d9d3cc] text-[#228b22] hover:bg-[#4cbb17]/10" aria-label="Attach file">
                  <Paperclip size={22} />
                  <input type="file" className="hidden" onChange={(event) => { uploadAttachment(event.target.files?.[0]); event.currentTarget.value = '' }} />
                </label>
                <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Type a message..." className="h-14 min-w-0 flex-1 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
                <button className="flex h-14 w-14 items-center justify-center rounded-md bg-[#4cbb17] text-white hover:bg-[#228b22]" aria-label="Send message"><Send size={23} /></button>
              </form>
            </div>
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
                <button key={item} onClick={() => setFilter(item)} className={`rounded-full border px-5 py-2 ${filter === item ? 'border-[#4cbb17] bg-[#4cbb17]/10 text-[#228b22]' : 'border-[#e7e1db]'}`}>{item}</button>
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
              <button onClick={() => onToggleRead(item.id)} className="mt-3 font-medium text-[#228b22]">{item.read ? 'Mark as unread' : 'Mark as read'}</button>
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
      <section className="rounded-lg bg-[linear-gradient(100deg,#228b22,#228b22_58%,#4cbb17)] p-8 text-white">
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
              <button className="inline-flex h-14 items-center gap-3 rounded-md bg-[#4cbb17] px-7 text-lg font-semibold text-black hover:bg-[#4cbb17]">
                <Save size={19} />
                Save changes
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => { setEditingProfile(true); setMessage('') }} className="inline-flex h-14 items-center gap-3 rounded-md border border-white/30 bg-white/12 px-7 text-lg font-semibold hover:bg-white/18">
              <UserIcon size={20} />
              Edit profile
            </button>
          )}
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1fr_485px]">
        <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <h3 className="mb-6 text-xl font-bold">Personal information</h3>
          <div className="grid gap-5 md:grid-cols-2">
            <ProfileField label="Full name" icon={UserIcon} value={name} onChange={setName} disabled={!editingProfile} />
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
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-[#4cbb17]/15 text-[#228b22]">
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
          <button className="inline-flex h-14 items-center justify-center gap-3 rounded-md bg-[#228b22] text-lg font-semibold text-white hover:bg-[#228b22]">
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
        <button onClick={onToggle} className={`mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-md text-lg font-semibold text-white ${enabled ? 'bg-[#228b22] hover:bg-[#228b22]' : 'bg-[#4cbb17] hover:bg-[#228b22]'}`}>
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
      <span className="flex h-14 items-center rounded-md border border-[#d9d3cc] px-4 focus-within:border-[#228b22] focus-within:ring-4 focus-within:ring-[#4cbb17]/20">
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
            <button type="button" onClick={() => printFacilityBookingForm(request)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#228b22] px-4 font-semibold text-white">
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
            <button type="button" onClick={() => printDocumentRequestForm(request)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#228b22] px-4 font-semibold text-white">
              <Printer size={17} />
              Print form
            </button>
          </div>
          {request.kind === 'Exit Clearance' ? <ExitClearancePrintForm request={request} /> : <RegistrarRequestPrintForm request={request} />}
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
    { kind: 'TOR Request', label: 'Transcript of Records (TOR)' },
    { kind: 'Change of Subject due to Conflict of Schedule', label: 'Change of Student due to Conflict of Schedule' },
    { kind: 'Adding/Dropping of Subjects', label: 'Adding/Dropping of Subjects' },
    { kind: 'Other Registrar Request', label: 'Other' },
  ]

  return (
    <div className="rounded-lg border border-[#d9d3cc] bg-white p-6 font-serif text-slate-950 shadow-sm">
      <PrintPreviewHeader referenceNumber={getRegistrarReferenceNumber(request)}>
        <p className="text-2xl font-extrabold text-[#1e3a3a]">CITY COLLEGE OF DAVAO</p>
        <p className="text-sm text-[#2c5a6e]">Km. 10 Catalanun Pequeno, Davao City</p>
        <p className="mt-3 text-lg font-bold tracking-wide">OFFICE OF THE REGISTRAR</p>
      </PrintPreviewHeader>

      <h3 className="my-6 text-center text-2xl font-extrabold underline underline-offset-8">REQUEST FORM</h3>

      <div className="space-y-4 text-[15px]">
        <PrintLine label="Date" value={formatDate(request.date)} />
        <PrintLine label="Name" value={request.owner} />
        <PrintLine label="Student ID #" value={request.studentId ?? ''} />
        <PrintLine label="Year Level" value={request.yearLevel ?? ''} />
        <PrintLine label="Semester" value={request.semester ?? ''} />
        <PrintLine label="School Year" value={request.schoolYear ?? ''} />

        <PrintCheckGroup title="Program" options={programOptions} selected={[request.program ?? '', request.major ?? '']} />
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

function ExitClearancePrintForm({ request }: { request: PortalRequest }) {
  return (
    <div className="rounded-lg border border-[#d9d3cc] bg-white p-6 font-serif text-slate-950 shadow-sm">
      <PrintPreviewHeader referenceNumber={getExitClearanceReferenceNumber(request)}>
        <p className="text-sm font-semibold tracking-wide">Republic of the Philippines</p>
        <p className="text-2xl font-extrabold text-[#1e3a3a]">City College of Davao</p>
        <p className="text-sm text-[#2c5a6e]">Km. 10 Catalanun Pequeno, Davao City</p>
      </PrintPreviewHeader>
      <h3 className="my-6 text-center text-2xl font-extrabold underline underline-offset-8">Exit Clearance and Request Form</h3>
      <div className="space-y-4 text-[15px]">
        <PrintLine label="Name of Student" value={request.owner} />
        <PrintLine label="ID Number" value={request.studentId ?? ''} />
        <PrintLine label="Program" value={formatProgramWithMajor(request)} />
        <PrintLine label="Year Level" value={request.yearLevel ?? ''} />
        <PrintLine label="Academic Year Last Attended" value={request.schoolYear ?? ''} />
        <PrintLine label="Semester" value={request.semester ?? ''} />
        <OfficeClearanceTable />
        <PrintLine label="Reason for transfer" value={request.transferReason ?? ''} />
        <PrintCheckGroup title="Request for" options={getExitClearanceDocumentOptions()} selected={request.requestedDocs ?? []} />
        <PrintLine label="Purpose" value={request.remarks} />
        <div className="border-l-4 border-[#b68b40] bg-[#fef9e6] p-3 text-xs leading-5">
          In compliance with Republic Act No. 10173, also known as the Data Privacy Act of 2012, City College of Davao is committed to protect the privacy and personal information of its employees, stakeholders, and students.
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <SignatureLine label="Name and Signature of Student" value={request.owner} />
          <SignatureLine label="Date" value={formatDate(request.date)} />
        </div>
        <div className="mt-8 border-t-2 border-dashed border-[#2c5a6e] pt-5">
          <h4 className="mb-4 text-center text-xl font-extrabold">CLAIM SLIP</h4>
          <PrintLine label="Date" value={formatDate(request.date)} />
          <PrintLine label="Name of Student" value={request.owner} />
          <PrintLine label="Claim requested document/s on" value={request.claimReleaseDate ?? ''} />
          <div className="grid gap-6 md:grid-cols-2">
            <SignatureLine label="Received by" value={request.receivedBy ?? ''} />
            <SignatureLine label="Released by" value={request.releasedBy ?? ''} />
          </div>
        </div>
      </div>
    </div>
  )
}

function LeaveApplicationPrintForm({ request }: { request: PortalRequest }) {
  return (
    <div className="rounded-lg border border-[#d9d3cc] bg-white p-4 font-serif text-sm text-slate-950 shadow-sm">
      <LeaveApplicationHeader request={request} />
      <h3 className="my-3 text-center text-xl font-extrabold underline underline-offset-4">APPLICATION FOR LEAVE</h3>
      <div className="border-y border-slate-300 py-2 font-semibold">1. OFFICE/DEPARTMENT: CITY COLLEGE OF DAVAO</div>
      <div className="space-y-2 pt-3 text-xs">
        <PrintLine label="2. Name" value={request.owner} />
        <PrintLine label="3. Date of Filing" value={formatDate(request.date)} />
        <PrintLine label="4. Position" value={request.position ?? ''} />
        <PrintLine label="5. Salary" value={request.salary ?? ''} />
        <div className="rounded-md border border-slate-300 bg-slate-50 p-3">
          <p className="mb-2 font-bold">6. Details of Application</p>
          <CompactPrintCheckGroup title="6.A Type of leave to be availed of" options={getCivilServiceLeaveTypes()} selected={getCivilServiceLeaveLabel(request.kind)} />
          <PrintLine label="6.B Details of leave" value={request.leaveDetail ?? ''} />
          <PrintLine label="6.C Working days applied for" value={String(request.workingDays ?? getDateDuration(request.date, request.time))} />
          <PrintLine label="Inclusive dates" value={request.inclusiveDates ?? getLeaveDateRange(request)} />
          <PrintCheckGroup title="6.D Communication" options={['Not Requested', 'Requested']} selected={request.communication ?? 'Not Requested'} />
          <SignatureLine label="Signature of Applicant" value={request.owner} />
        </div>
        <LeaveActionSection request={request} />
      </div>
    </div>
  )
}

function LeaveApplicationHeader({ request }: { request: PortalRequest }) {
  return (
    <PrintPreviewHeader logo={davaoCitySeal} logoAlt="Davao City seal" referenceNumber={getLeaveReferenceNumber(request)}>
      <p className="font-bold">Civil Service Form No. 6</p>
      <p className="text-xs">Revised 2020</p>
      <p className="mt-3 text-sm font-semibold tracking-wide">Republic of the Philippines</p>
      <p className="text-xl font-extrabold">CITY GOVERNMENT OF DAVAO</p>
      <p className="font-semibold">DAVAO CITY</p>
    </PrintPreviewHeader>
  )
}

function PrintPreviewHeader({ children, logo = ccdLogo, logoAlt = 'City College of Davao seal', referenceNumber }: { children: ReactNode; logo?: string; logoAlt?: string; referenceNumber: string }) {
  return (
    <div className="relative border-b-2 border-[#8b5a2b] pb-4 pr-36 text-center">
      <div className="absolute right-0 top-0 text-right text-xs">
        <p className="font-semibold uppercase text-[#1e6f5c]">Reference Number</p>
        <p className="mt-1 font-mono text-sm font-bold tracking-wide text-[#1e3a3a]">{referenceNumber}</p>
      </div>
      <img src={logo} alt={logoAlt} style={{ left: 'calc(50% - 16rem)' }} className="absolute top-0 h-20 w-20 rounded-full object-contain" />
      {children}
    </div>
  )
}

function LeaveActionSection({ request }: { request: PortalRequest }) {
  return (
    <div className="rounded-md border border-slate-300 bg-slate-50 p-3">
      <p className="mb-2 font-bold">7. Details of Action on Application</p>
      <p className="font-semibold">7.A Certification of Leave Credits</p>
      <table className="my-2 w-full border-collapse text-center text-xs">
        <thead>
          <tr><th className="border border-slate-400 p-2" /><th className="border border-slate-400 p-2">Vacation Leave</th><th className="border border-slate-400 p-2">Sick Leave</th></tr>
        </thead>
        <tbody>
          {['Total Earned', 'Less this application', 'Balance'].map((label) => (
            <tr key={label}><td className="border border-slate-400 p-2 font-semibold">{label}</td><td className="border border-slate-400 p-2" /><td className="border border-slate-400 p-2" /></tr>
          ))}
        </tbody>
      </table>
      <CompactPrintCheckGroup title="7.B Recommendation" options={['For approval', 'For disapproval']} selected={request.status === 'Rejected' ? 'For disapproval' : request.status === 'Pending' ? '' : 'For approval'} />
      <PrintLine label="HR remarks" value={request.hrRemarks ?? request.updatedBy ?? ''} />
      <PrintLine label="7.C Approved for" value={request.status === 'Approved' ? `${request.workingDays ?? getDateDuration(request.date, request.time)} day(s) with pay` : ''} />
      <PrintLine label="7.D Disapproved due to" value={request.status === 'Rejected' ? request.hrRemarks ?? request.remarks : ''} />
      <div className="mt-3 text-center">
        <p className="font-bold">Wenefredo E. Cagape, EdD, PhD</p>
        <p>College President</p>
        <div className="mx-auto mt-5 w-2/3 border-b border-slate-700" />
        <p className="mt-2 font-semibold">Authorized Official</p>
      </div>
    </div>
  )
}

function CompactPrintCheckGroup({ options, selected, title }: { options: string[]; selected: string | string[]; title: string }) {
  const selectedValues = Array.isArray(selected) ? selected : [selected]
  return (
    <div>
      <p className="mb-2 font-semibold">{title}:</p>
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {options.map((option) => (
          <span key={option} className="flex items-start gap-1.5 leading-tight">
            <span className="mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center border border-slate-600 text-[9px]">{selectedValues.includes(option) ? 'x' : ''}</span>
            {option}
          </span>
        ))}
      </div>
    </div>
  )
}

function OfficeClearanceTable() {
  return (
    <div className="overflow-hidden rounded-md border border-slate-400">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="border border-slate-400 px-3 py-2 text-left">Office</th>
            <th className="border border-slate-400 px-3 py-2 text-left">Signature</th>
            <th className="border border-slate-400 px-3 py-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {getExitClearanceOffices().map((office) => (
            <tr key={office}>
              <td className="border border-slate-400 px-3 py-2">{office}</td>
              <td className="border border-slate-400 px-3 py-2" />
              <td className="border border-slate-400 px-3 py-2" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PrintCheckGroup({ options, selected, title }: { options: string[]; selected: string | string[]; title: string }) {
  const selectedValues = Array.isArray(selected) ? selected : [selected]
  return (
    <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
      <p className="mb-3 font-semibold">{title}:</p>
      <div className="grid gap-2">
        {options.map((option) => (
          <span key={option} className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center border border-slate-600 text-xs">{selectedValues.includes(option) ? 'x' : ''}</span>
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
      <PrintPreviewHeader referenceNumber={getFacilityReferenceNumber(request)}>
        <p className="text-2xl font-extrabold text-[#1e3a3a]">CITY COLLEGE OF DAVAO</p>
        <p className="text-sm text-[#2c5a6e]">Km. 10 Catalanun Pequeno, Davao City</p>
      </PrintPreviewHeader>

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
          <div className="rounded-lg border border-[#e7e1db] bg-white p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold">Printable Registrar form</h3>
                <p className="text-slate-500">Print the request form for receiving or release.</p>
              </div>
              <button type="button" onClick={() => printDocumentRequestForm(request)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#228b22] px-4 font-semibold text-white">
                <Printer size={17} />
                Print form
              </button>
            </div>
            {request.kind === 'Exit Clearance' ? <ExitClearancePrintForm request={request} /> : <RegistrarRequestPrintForm request={request} />}
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
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={5} className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 outline-none focus:border-[#228b22]" />
          </label>
        </div>
        <aside className="rounded-lg border border-[#e7e1db] bg-white p-5">
          <h3 className="mb-4 text-xl font-bold">Decision</h3>
          <div className="space-y-3">
            <button disabled={request.status === 'Approved'} onClick={() => onSubmit(request.id, 'Approved', remarks || 'Approved by Registrar.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <CheckCircle2 size={18} />
              Approve
            </button>
            <button disabled={request.status === 'Rejected'} onClick={() => onSubmit(request.id, 'Rejected', remarks || 'Rejected by Registrar.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#228b22] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
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
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={5} className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 outline-none focus:border-[#228b22]" />
          </label>
        </div>
        <aside className="rounded-lg border border-[#e7e1db] bg-white p-5">
          <h3 className="mb-4 text-xl font-bold">Decision</h3>
          <div className="space-y-3">
            <button disabled={request.status === 'Approved'} onClick={() => onSubmit(request.id, 'Approved', remarks || 'Approved by Supply Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <CheckCircle2 size={18} />
              Approve
            </button>
            <button disabled={request.status === 'Rejected'} onClick={() => onSubmit(request.id, 'Rejected', remarks || 'Rejected by Supply Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#228b22] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
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
              <button type="button" onClick={() => printFacilityBookingForm({ ...request, facilityRemarks: remarks })} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#228b22] px-4 font-semibold text-white">
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
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={5} className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 outline-none focus:border-[#228b22]" />
          </label>
        </div>
        <aside className="rounded-lg border border-[#e7e1db] bg-white p-5">
          <h3 className="mb-4 text-xl font-bold">Decision</h3>
          <div className="space-y-3">
            <button disabled={request.status === 'Approved'} onClick={() => onSubmit(request.id, 'Approved', remarks || 'Reservation approved by Admin Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <CheckCircle2 size={18} />
              Approve
            </button>
            <button disabled={request.status === 'Rejected'} onClick={() => onSubmit(request.id, 'Rejected', remarks || 'Reservation rejected by Admin Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#228b22] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
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
          <div className="rounded-lg border border-[#e7e1db] bg-white p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold">Printable leave application</h3>
                <p className="text-slate-500">Civil Service Form No. 6 format.</p>
              </div>
              <button type="button" onClick={() => printLeaveApplicationForm({ ...request, hrRemarks: remarks })} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#228b22] px-4 font-semibold text-white">
                <Printer size={17} />
                Print form
              </button>
            </div>
            <LeaveApplicationPrintForm request={{ ...request, hrRemarks: remarks }} />
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
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={5} className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 outline-none focus:border-[#228b22]" />
          </label>
        </div>
        <aside className="rounded-lg border border-[#e7e1db] bg-white p-5">
          <h3 className="mb-4 text-xl font-bold">Decision</h3>
          <div className="space-y-3">
            <button disabled={request.status === 'Approved'} onClick={() => onSubmit(request.id, 'Approved', remarks || 'Leave application approved by HR Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
              <CheckCircle2 size={18} />
              Approve
            </button>
            <button disabled={request.status === 'Rejected'} onClick={() => onSubmit(request.id, 'Rejected', remarks || 'Leave application rejected by HR Office.')} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#228b22] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
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
          <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={4} className="w-full rounded-md border border-[#d9d3cc] px-3 py-2 outline-none focus:border-[#228b22]" />
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-[#d9d3cc] px-4 py-2 font-medium">Cancel</button>
          <button onClick={() => onSubmit(request.id, status, remarks.trim() || `${status} by office.`)} className="rounded-md bg-[#228b22] px-4 py-2 font-semibold text-white">Save Status</button>
        </div>
      </div>
    </Modal>
  )
}

function UsersModal({ onClose }: { onClose: () => void }) {
  const { accounts, addAccount, deleteAccount } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('employee')
  const [department, setDepartment] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !email.trim() || password.length < 8) return
    addAccount({ name: name.trim(), email: email.trim().toLowerCase(), password, role, department: department.trim() || roleMeta[role].label })
    setName('')
    setEmail('')
    setPassword('')
    setDepartment('')
  }

  return (
    <Modal title="Manage Users" onClose={onClose} wide>
      <form onSubmit={submit} className="mb-5 grid gap-3 rounded-lg border border-[#e7e1db] p-4 lg:grid-cols-6">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="h-11 rounded-md border border-[#d9d3cc] px-3 outline-none focus:border-[#228b22]" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="h-11 rounded-md border border-[#d9d3cc] px-3 outline-none focus:border-[#228b22]" />
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required placeholder="Initial password" className="h-11 rounded-md border border-[#d9d3cc] px-3 outline-none focus:border-[#228b22]" />
        <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="h-11 rounded-md border border-[#d9d3cc] px-3 outline-none focus:border-[#228b22]">
          {Object.entries(roleMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
        <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Department" className="h-11 rounded-md border border-[#d9d3cc] px-3 outline-none focus:border-[#228b22]" />
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#228b22] px-4 font-semibold text-white">
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

export function Modal({ children, onClose, title, wide = false }: { children: ReactNode; onClose: () => void; title: string; wide?: boolean }) {
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

