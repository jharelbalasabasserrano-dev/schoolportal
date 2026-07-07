import { Building2, CalendarClock, CheckCircle2, ChevronDown, Clock, Layers3, PackageCheck, Plus, Printer, Send, XCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { facilities, leaveKinds, type Announcement, type LeaveRequestKind, type PortalRequest, type User } from './portalData'
import { createLeaveReferenceNumber, formatDate, formatShortDate, getCounts, getDateDuration, getEmployeeRequestDetails, getEmployeeRequestTitle, getEmployeeRequestType, getEmployeeTypeTone, getLeaveTypeIcon, getLeaveTypeLabel, hasFacilityConflict, isEmployeePortalRequest, isLeaveApplication, printFacilityBookingForm, printLeaveApplicationForm } from './portalHelpers'
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
    <form onSubmit={submit} className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <div className="mb-6 rounded-lg border border-[#e7e1db] bg-stone-50 p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-[.14em] text-slate-500">Application for Leave</p>
          <h2 className="mt-1 text-2xl font-bold">Civil Service Form No. 6</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <span className="mb-2 block font-medium">1. Office/Department</span>
            <input value={officeDepartment} onChange={(event) => setOfficeDepartment(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] bg-white px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
          <label>
            <span className="mb-2 block font-medium">2. Name</span>
            <input value={user.name} readOnly className="h-14 w-full rounded-md border border-[#d9d3cc] bg-white px-4 text-lg text-slate-700 outline-none" />
          </label>
          <label>
            <span className="mb-2 block font-medium">3. Date of Filing</span>
            <input type="date" value={filedDate} onChange={(event) => setFiledDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] bg-white px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
          <div className="rounded-md border border-[#e7e1db] bg-white px-4 py-3">
            <p className="text-sm font-semibold uppercase tracking-[.12em] text-slate-500">Signature of Applicant</p>
            <p className="mt-2 text-lg font-semibold">{user.name}</p>
          </div>
        </div>
      </div>
      <div className="leave-type-nav rounded-lg border border-[#e7e1db] bg-stone-50 p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.14em] text-slate-500">6.A Type of Leave to be Availed Of</p>
            <p className="mt-1 text-sm text-slate-600">Choose the leave category for this application.</p>
          </div>
          <div className="rounded-lg border border-[#e7e1db] bg-white px-4 py-2 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Selected</p>
            <p className="mt-1 font-bold text-[#228b22]">{title}</p>
          </div>
        </div>
        <div className="leave-type-scroll flex gap-3 overflow-x-auto pb-2">
          {leaveKinds.map((item) => {
            const selected = kind === item
            const Icon = getLeaveTypeIcon(item)
            return (
              <button key={item} type="button" onClick={() => setKind(item)} className={`leave-type-tab min-w-[210px] rounded-lg border p-4 text-left ${selected ? 'is-active border-[#228b22] bg-[#228b22] text-white' : 'border-[#e7e1db] bg-white text-slate-700 hover:border-[#4cbb17]'}`}>
                <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-md ${selected ? 'bg-white/18 text-white' : 'bg-stone-100 text-[#228b22]'}`}><Icon size={20} /></span>
                <span className="block text-sm font-bold leading-snug">{getLeaveTypeLabel(item)}</span>
                <span className={`mt-3 block text-xs leading-5 ${selected ? 'text-white/75' : 'text-slate-500'}`}>Civil Service Form No. 6</span>
              </button>
            )
          })}
        </div>
      </div>
      {kind === 'Other Leave' && (
        <label className="mt-5 block">
          <span className="mb-2 block font-medium">Specify leave type</span>
          <input required value={customLeaveType} onChange={(event) => setCustomLeaveType(event.target.value)} placeholder="Enter custom leave type" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
      )}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label>
          <span className="mb-2 block font-medium">4. Position</span>
          <input value={position} onChange={(event) => setPosition(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">5. Salary</span>
          <input value={salary} onChange={(event) => setSalary(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">Inclusive dates - Start</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">Leave Duration</span>
          <select value={leaveDuration} onChange={(event) => setLeaveDuration(event.target.value as 'Full Day' | 'Half Day')} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
            <option>Full Day</option>
            <option>Half Day</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block font-medium">Inclusive dates - End</span>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        {leaveDuration === 'Half Day' && (
          <label>
            <span className="mb-2 block font-medium">Time</span>
            <select value={leaveTime} onChange={(event) => setLeaveTime(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
              <option>Morning (AM)</option>
              <option>Afternoon (PM)</option>
            </select>
          </label>
        )}
      </div>
      <p className="mt-4 text-slate-600">6.C Number of working days applied for: <span className="font-semibold">{duration} day(s)</span></p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label>
          <span className="mb-2 block font-medium">6.D Communication</span>
          <select value={communication} onChange={(event) => setCommunication(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
            <option>Not Requested</option>
            <option>Requested</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block font-medium">6.B Details of Leave</span>
          <input value={leaveDetail} onChange={(event) => setLeaveDetail(event.target.value)} placeholder="Location, illness, study leave detail, or other purpose" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
      </div>
      <label className="mt-5 block">
        <span className="mb-2 block font-medium">Reason</span>
        <textarea value={reason} onChange={(event) => setReason(event.target.value.slice(0, 500))} rows={5} placeholder="Describe the reason for your leave..." className="w-full rounded-md border border-[#d9d3cc] px-4 py-3 text-lg outline-none focus:border-[#228b22]" />
      </label>
      <p className="mt-2 text-slate-500">{reason.length} / 500</p>
      <button className="mt-6 inline-flex h-14 items-center gap-3 rounded-md bg-[#228b22] px-7 text-lg font-semibold text-white hover:bg-[#228b22]">
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
