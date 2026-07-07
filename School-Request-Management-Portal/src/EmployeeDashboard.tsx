import { Building2, CalendarClock, CheckCircle2, ChevronDown, Clock, Layers3, PackageCheck, Plus, Printer, Send, XCircle } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import ccdLogo from './assets/ccd-logo.png'
import { facilities, leaveKinds, type Announcement, type LeaveRequestKind, type PortalRequest, type User } from './portalData'
import { createLeaveReferenceNumber, formatDate, formatShortDate, getCivilServiceLeaveLabel, getCounts, getDateDuration, getEmployeeRequestDetails, getEmployeeRequestTitle, getEmployeeRequestType, getEmployeeTypeTone, getLeaveTypeLabel, hasFacilityConflict, isEmployeePortalRequest, isLeaveApplication, printFacilityBookingForm, printLeaveApplicationForm } from './portalHelpers'
import { AnnouncementsPanel, MetricCard, StatusPill } from './portalComponents'
import { RoomAvailabilityView } from './portalViews'

export function EmployeePortalView({ activeView, announcements, existingRequests, onSubmit, onView, onViewRequest, requests, user }: { activeView: string; announcements: Announcement[]; existingRequests: PortalRequest[]; onSubmit: (request: PortalRequest) => void; onView: (view: string) => void; onViewRequest: (request: PortalRequest) => void; requests: PortalRequest[]; user: User }) {
  const employeeRequests = requests.filter((request) => isEmployeePortalRequest(request))
  const counts = getCounts(employeeRequests)
  const total = employeeRequests.length

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={counts.Pending} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Approved" value={counts.Approved} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-800" />
        <MetricCard label="Disapproved" value={counts.Disapproved} icon={XCircle} tone="bg-red-100 text-red-800" />
        <MetricCard label="Total" value={total} icon={Layers3} tone="bg-stone-100 text-stone-700" />
      </section>

      {activeView === 'Overview' && <EmployeeOverview announcements={announcements} onView={onView} />}
      {activeView === 'File Leave' && <EmployeeFileLeaveView onSubmit={onSubmit} user={user} />}
      {activeView === 'Request Supplies' && <EmployeeSupplyRequestView onSubmit={onSubmit} user={user} />}
      {activeView === 'Reserve Facility' && <EmployeeReserveFacilityView existingRequests={existingRequests} onSubmit={onSubmit} user={user} />}
      {activeView === 'My Requests' && <EmployeeRequestsView onView={onViewRequest} requests={employeeRequests} />}
      {activeView === 'Room Availability' && <RoomAvailabilityView requests={existingRequests} />}
    </div>
  )
}

function EmployeeOverview({ announcements, onView }: { announcements: Announcement[]; onView: (view: string) => void }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <EmployeeOverviewCards onView={onView} />
      <AnnouncementsPanel announcements={announcements} />
    </div>
  )
}

function EmployeeOverviewCards({ onView }: { onView: (view: string) => void }) {
  const cards = [
    { title: 'File Leave', description: 'Submit leave using the Civil Service Form No. 6 types', icon: CalendarClock, tone: 'bg-emerald-100 text-emerald-900', view: 'File Leave' },
    { title: 'Request Supplies', description: 'Order office supplies and materials', icon: PackageCheck, tone: 'bg-amber-100 text-amber-900', view: 'Request Supplies', highlighted: true },
    { title: 'Reserve Facility', description: 'Book rooms, labs, or AVRs', icon: Building2, tone: 'bg-[#4cbb17]/15 text-[#228b22]', view: 'Reserve Facility' },
  ]

  return (
    <section className="grid gap-5 md:grid-cols-3">
      {cards.map(({ description, highlighted, icon: Icon, title, tone, view }) => (
        <button key={title} onClick={() => onView(view)} className={`group rounded-lg border bg-white p-7 text-left transition hover:border-[#228b22] ${highlighted ? 'border-[#4cbb17] ring-1 ring-[#4cbb17]/30' : 'border-[#e7e1db]'}`}>
          <div className="mb-14 flex items-start justify-between">
            <span className={`flex h-14 w-14 items-center justify-center rounded-md ${tone}`}><Icon size={23} /></span>
            <ChevronDown className="-rotate-90 text-slate-400 group-hover:text-[#228b22]" size={20} />
          </div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-2 text-lg text-slate-600">{description}</p>
        </button>
      ))}
    </section>
  )
}

function EmployeeFileLeaveView({ onSubmit, user }: { onSubmit: (request: PortalRequest) => void; user: User }) {
  const [kind, setKind] = useState<LeaveRequestKind>('Vacation Leave')
  const [officeDepartment, setOfficeDepartment] = useState(user.department || 'CITY COLLEGE OF DAVAO')
  const [filedDate, setFiledDate] = useState('2026-06-03')
  const [startDate, setStartDate] = useState('2026-06-03')
  const [endDate, setEndDate] = useState('2026-06-03')
  const [position, setPosition] = useState('')
  const [salary, setSalary] = useState('')
  const [communication, setCommunication] = useState('Not Requested')
  const [leaveDetail, setLeaveDetail] = useState('')
  const [customLeaveType, setCustomLeaveType] = useState('')
  const [leaveDuration, setLeaveDuration] = useState<'Full Day' | 'Half Day'>('Full Day')
  const [leaveTime, setLeaveTime] = useState('Morning (AM)')
  const [reason, setReason] = useState('')
  const duration = leaveDuration === 'Half Day' ? 0.5 : getDateDuration(startDate, endDate)
  const customLeaveTypeValue = kind === 'Other Leave' ? customLeaveType.trim() : ''
  const title = getLeaveTypeLabel(kind, customLeaveTypeValue)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reason.trim() || (kind === 'Other Leave' && !customLeaveTypeValue)) return
    const referenceNumber = createLeaveReferenceNumber()
    onSubmit({
      id: referenceNumber,
      referenceNumber,
      title,
      kind,
      ownerId: user.id,
      owner: user.name,
      office: 'HR Office',
      status: 'Pending',
      date: startDate,
      time: endDate,
      remarks: reason.trim(),
      studentId: user.id,
      filedDate,
      officeDepartment: officeDepartment.trim(),
      position: position.trim(),
      salary: salary.trim(),
      workingDays: duration,
      inclusiveDates: `${formatDate(startDate)} - ${formatDate(endDate)}`,
      communication,
      leaveDetail: leaveDetail.trim(),
      customLeaveType: customLeaveTypeValue || undefined,
      leaveDuration,
      leaveTime: leaveDuration === 'Half Day' ? leaveTime : undefined,
    })
    setReason('')
    setLeaveDetail('')
    setCustomLeaveType('')
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-lg border border-[#d9d3cc] bg-white p-4 shadow-sm sm:p-6">
        <div className="overflow-x-auto">
          <div className="mx-auto min-w-[760px] max-w-[980px] border border-black bg-white font-serif text-sm text-black">
            <div className="relative min-h-[132px] border-b border-black p-4 text-center">
              <div className="absolute left-4 top-4 text-left text-xs font-bold leading-tight">
                <p>Civil Service Form No. 6</p>
                <p>Revised 2020</p>
              </div>
              <img src={ccdLogo} alt="City College of Davao logo" className="absolute left-[25%] top-4 h-14 w-14 object-contain" />
              <p className="font-bold">Republic of the Philippines</p>
              <p className="font-bold">CITY GOVERNMENT OF DAVAO</p>
              <p className="font-bold">DAVAO CITY</p>
              <h2 className="mt-4 text-2xl font-extrabold underline underline-offset-4">APPLICATION FOR LEAVE</h2>
              <div className="absolute right-4 top-4 w-56 border-2 border-black p-2 text-left text-xs">
                <p className="text-center text-[11px] font-extrabold">CITY COLLEGE OF DAVAO</p>
                <p className="text-center text-lg font-extrabold tracking-[.2em]">RECEIVED</p>
                <p className="mt-2 border-b border-black">Date:</p>
                <p className="mt-1 border-b border-black">Time:</p>
                <p className="mt-1 border-b border-black">By:</p>
                <p className="mt-2 font-mono text-[11px]">Employee ID: {user.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-[24%_34%_16%_14%_12%] border-b border-black">
              <FormCell label="1. Office/Department">
                <input value={officeDepartment} onChange={(event) => setOfficeDepartment(event.target.value)} className="official-input" />
              </FormCell>
              <FormCell label="2. Name (Last, First, Middle)">
                <input value={user.name} readOnly className="official-input bg-stone-50" />
              </FormCell>
              <FormCell label="3. Date of Filing">
                <input type="date" value={filedDate} onChange={(event) => setFiledDate(event.target.value)} className="official-input" />
              </FormCell>
              <FormCell label="4. Position">
                <input value={position} onChange={(event) => setPosition(event.target.value)} className="official-input" />
              </FormCell>
              <FormCell label="5. Salary" last>
                <input value={salary} onChange={(event) => setSalary(event.target.value)} className="official-input" />
              </FormCell>
            </div>

            <p className="border-b border-black py-2 text-center font-extrabold">6. DETAILS OF APPLICATION</p>
            <div className="grid grid-cols-2">
              <div className="border-r border-black p-4">
                <p className="mb-3 font-extrabold">6.A TYPE OF LEAVE TO BE AVAILED OF</p>
                <div className="space-y-2">
                  {leaveKinds.map((item) => (
                    <label key={item} className="flex items-start gap-2">
                      <input type="radio" checked={kind === item} onChange={() => setKind(item)} className="mt-1 h-4 w-4 accent-[#228b22]" />
                      <span>{getCivilServiceLeaveLabel(item) || getLeaveTypeLabel(item)}</span>
                    </label>
                  ))}
                </div>
                {kind === 'Other Leave' && (
                  <label className="mt-3 block">
                    <span className="text-xs font-bold uppercase">Specify</span>
                    <input required value={customLeaveType} onChange={(event) => setCustomLeaveType(event.target.value)} className="official-input mt-1" />
                  </label>
                )}
              </div>
              <div className="p-4">
                <p className="mb-3 font-extrabold">6.B DETAILS OF LEAVE</p>
                <p className="italic">In case of Vacation/Special Privilege Leave, Sick Leave, Study Leave, or other purpose:</p>
                <textarea value={leaveDetail} onChange={(event) => setLeaveDetail(event.target.value)} rows={6} placeholder="Location, illness, study leave detail, or other purpose" className="mt-3 w-full border border-black px-3 py-2 font-sans text-sm outline-none focus:ring-1 focus:ring-[#228b22]" />
                <label className="mt-4 block">
                  <span className="mb-1 block font-bold">Reason / Purpose</span>
                  <textarea required value={reason} onChange={(event) => setReason(event.target.value.slice(0, 500))} rows={5} className="w-full border border-black px-3 py-2 font-sans text-sm outline-none focus:ring-1 focus:ring-[#228b22]" />
                </label>
                <p className="mt-1 text-right font-sans text-xs text-slate-500">{reason.length} / 500</p>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-black">
              <div className="space-y-3 border-r border-black p-4">
                <p className="font-extrabold">6.C NUMBER OF WORKING DAYS APPLIED FOR</p>
                <div className="grid grid-cols-3 gap-3 font-sans">
                  <label>
                    <span className="mb-1 block text-xs font-semibold">Start date</span>
                    <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="official-input" />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold">End date</span>
                    <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="official-input" />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold">Working days</span>
                    <input value={`${duration} day(s)`} readOnly className="official-input bg-stone-50" />
                  </label>
                </div>
                <p className="font-extrabold">INCLUSIVE DATES</p>
                <p className="border-b border-black py-1 text-center font-semibold">{formatDate(startDate)} - {formatDate(endDate)}</p>
                <div className="grid grid-cols-2 gap-3 font-sans">
                  <label>
                    <span className="mb-1 block text-xs font-semibold">Leave duration</span>
                    <select value={leaveDuration} onChange={(event) => setLeaveDuration(event.target.value as 'Full Day' | 'Half Day')} className="official-input">
                      <option>Full Day</option>
                      <option>Half Day</option>
                    </select>
                  </label>
                  {leaveDuration === 'Half Day' && (
                    <label>
                      <span className="mb-1 block text-xs font-semibold">Half-day time</span>
                      <select value={leaveTime} onChange={(event) => setLeaveTime(event.target.value)} className="official-input">
                        <option>Morning (AM)</option>
                        <option>Afternoon (PM)</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <p className="font-extrabold">6.D COMMUTATION</p>
                <label className="flex items-center gap-2"><input type="radio" checked={communication === 'Requested'} onChange={() => setCommunication('Requested')} className="h-4 w-4 accent-[#228b22]" /> Requested</label>
                <label className="flex items-center gap-2"><input type="radio" checked={communication === 'Not Requested'} onChange={() => setCommunication('Not Requested')} className="h-4 w-4 accent-[#228b22]" /> Not Requested</label>
                <div className="pt-10 text-center">
                  <p className="border-b border-black font-semibold">{user.name}</p>
                  <p className="mt-1 text-xs">Signature of Applicant</p>
                </div>
              </div>
            </div>

            <p className="border-y border-black py-2 text-center font-extrabold">7. DETAILS OF ACTION ON APPLICATION</p>
            <div className="grid grid-cols-2">
              <div className="border-r border-black p-4">
                <p className="font-extrabold">7.A CERTIFICATION OF LEAVE CREDITS</p>
                <table className="mt-3 w-full border-collapse text-center text-xs">
                  <thead>
                    <tr>
                      <th className="border border-black p-2" />
                      <th className="border border-black p-2">Vacation Leave</th>
                      <th className="border border-black p-2">Sick Leave</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Total Earned', 'Less this application', 'Balance'].map((row) => (
                      <tr key={row}>
                        <td className="border border-black p-2 text-left font-bold">{row}</td>
                        <td className="border border-black p-2">&nbsp;</td>
                        <td className="border border-black p-2">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4">
                <p className="font-extrabold">7.B RECOMMENDATION</p>
                <label className="mt-2 flex items-center gap-2"><input disabled type="checkbox" /> For approval</label>
                <label className="mt-2 flex items-center gap-2"><input disabled type="checkbox" /> For disapproval due to</label>
                <p className="mt-5 border-b border-black">&nbsp;</p>
              </div>
              <div className="border-r border-t border-black p-4">
                <p className="font-extrabold">7.C APPROVED FOR:</p>
                <p className="mt-3 border-b border-black">days with pay</p>
                <p className="mt-3 border-b border-black">days without pay</p>
                <p className="mt-3 border-b border-black">others (Specify)</p>
              </div>
              <div className="border-t border-black p-4">
                <p className="font-extrabold">7.D DISAPPROVED DUE TO:</p>
                <p className="mt-5 border-b border-black">&nbsp;</p>
              </div>
            </div>
          </div>
        </div>
        <button className="mt-6 inline-flex h-14 items-center gap-3 rounded-md bg-[#228b22] px-7 font-sans text-lg font-semibold text-white hover:bg-[#228b22]">
          <Send size={19} />
          Submit leave application
        </button>
      </div>
    </form>
  )
}

function FormCell({ children, label, last = false }: { children: ReactNode; label: string; last?: boolean }) {
  return (
    <label className={`block p-3 ${last ? '' : 'border-r border-black'}`}>
      <span className="mb-2 block text-xs font-extrabold uppercase">{label}</span>
      {children}
    </label>
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
        <button type="button" className="inline-flex items-center gap-2 font-medium text-[#228b22]"><Plus size={16} />Add item</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_120px]">
        <input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Item name" className="h-14 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="h-14 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        <select value={unit} onChange={(event) => setUnit(event.target.value)} className="h-14 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
          {['pcs', 'reams', 'boxes', 'sets'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <label className="mt-5 block">
        <span className="mb-2 block font-medium">Purpose</span>
        <textarea value={purpose} onChange={(event) => setPurpose(event.target.value.slice(0, 500))} rows={5} placeholder="Why are these supplies needed?" className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 text-lg outline-none focus:border-[#228b22]" />
      </label>
      <button className="mt-6 inline-flex h-14 items-center gap-3 rounded-md bg-[#228b22] px-7 text-lg font-semibold text-white hover:bg-[#228b22]">
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
        <select value={facility} onChange={(event) => setFacility(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
          {facilities.map(([name, type]) => <option key={name} value={name}>{name} - {type}</option>)}
        </select>
      </label>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <label>
          <span className="mb-2 block font-medium">Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">Start</span>
          <input type="time" value={start} onChange={(event) => setStart(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">End</span>
          <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
      </div>
      <label className="mt-5 block">
        <span className="mb-2 block font-medium">Attendees</span>
        <input type="number" min={1} value={attendees} onChange={(event) => setAttendees(Number(event.target.value))} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
      </label>
      <label className="mt-5 block">
        <span className="mb-2 block font-medium">Purpose</span>
        <textarea value={purpose} onChange={(event) => setPurpose(event.target.value.slice(0, 500))} rows={5} placeholder="Describe the activity..." className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 text-lg outline-none focus:border-[#228b22]" />
      </label>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-red-700">{error}</p>}
      <button className="mt-6 inline-flex h-14 items-center gap-3 rounded-md bg-[#228b22] px-7 text-lg font-semibold text-white hover:bg-[#228b22]">
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
                    {isLeaveApplication(request) && (
                      <button type="button" onClick={() => printLeaveApplicationForm(request)} className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
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
  )
}


export default EmployeePortalView
