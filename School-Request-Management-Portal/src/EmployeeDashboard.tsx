import { Building2, CalendarClock, CheckCircle2, ChevronDown, Clock, Layers3, PackageCheck, Plus, Printer, Send, XCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { facilities, leaveKinds, type PortalRequest, type RequestKind, type User } from './portalData'
import { formatDate, formatShortDate, getCounts, getDateDuration, getEmployeeRequestDetails, getEmployeeRequestTitle, getEmployeeRequestType, getEmployeeTypeTone, getLeaveTypeIcon, getLeaveTypeLabel, hasFacilityConflict, isLeaveApplication, printFacilityBookingForm, printLeaveApplicationForm } from './portalHelpers'
import { MetricCard, StatusPill } from './portalComponents'
import { RoomAvailabilityView } from './portalViews'

export function EmployeePortalView({ activeView, existingRequests, onSubmit, onView, onViewRequest, requests, user }: { activeView: string; existingRequests: PortalRequest[]; onSubmit: (request: PortalRequest) => void; onView: (view: string) => void; onViewRequest: (request: PortalRequest) => void; requests: PortalRequest[]; user: User }) {
  const employeeRequests = requests.filter((request) => request.ownerId === user.id && (
    request.kind === 'Supply Request' ||
    request.kind === 'Inventory Request' ||
    request.kind === 'Facility Reservation' ||
    isLeaveApplication(request)
  ))
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
    { title: 'File Leave', description: 'Submit leave using the Civil Service Form No. 6 types', icon: CalendarClock, tone: 'bg-emerald-100 text-emerald-900', view: 'File Leave' },
    { title: 'Request Supplies', description: 'Order office supplies and materials', icon: PackageCheck, tone: 'bg-amber-100 text-amber-900', view: 'Request Supplies', highlighted: true },
    { title: 'Reserve Facility', description: 'Book rooms, labs, or AVRs', icon: Building2, tone: 'bg-[#4cbb17]/15 text-[#228b22]', view: 'Reserve Facility' },
  ]

  return (
    <section className="grid gap-5 xl:grid-cols-3">
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
  const [kind, setKind] = useState<RequestKind>('Vacation Leave')
  const [filingDate, setFilingDate] = useState(new Date().toISOString().slice(0, 10))
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [position, setPosition] = useState('')
  const [salary, setSalary] = useState('')
  const [communication, setCommunication] = useState('Not Requested')
  const [leaveDetail, setLeaveDetail] = useState('')
  const [reason, setReason] = useState('')
  const duration = getDateDuration(startDate, endDate)
  const LeaveIcon = getLeaveTypeIcon(kind)

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
      date: filingDate,
      time: endDate,
      remarks: reason.trim(),
      position: position.trim(),
      salary: salary.trim(),
      workingDays: duration,
      inclusiveDates: `${formatDate(startDate)} - ${formatDate(endDate)}`,
      communication,
      leaveDetail: leaveDetail.trim(),
      filingDate,
      leaveStartDate: startDate,
      leaveEndDate: endDate,
    })
    setReason('')
    setLeaveDetail('')
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <label>
          <span className="mb-2 block font-medium">Leave type</span>
          <span className="flex h-14 items-center rounded-md border border-[#d9d3cc] bg-white px-4 focus-within:border-[#228b22]">
            <LeaveIcon size={20} className="mr-3 shrink-0 text-[#228b22]" />
            <select value={kind} onChange={(event) => setKind(event.target.value as RequestKind)} className="min-w-0 flex-1 bg-transparent text-lg outline-none">
              {leaveKinds.map((item) => <option key={item} value={item}>{getLeaveTypeLabel(item)}</option>)}
            </select>
          </span>
        </label>
        <div className="rounded-md border border-[#e7e1db] bg-stone-50 px-5 py-4">
          <p className="text-sm font-semibold uppercase tracking-[.12em] text-slate-500">Duration</p>
          <p className="mt-1 text-3xl font-bold text-[#228b22]">{duration} day(s)</p>
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label>
          <span className="mb-2 block font-medium">Date of filing</span>
          <input type="date" value={filingDate} onChange={(event) => setFilingDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">Position</span>
          <input value={position} onChange={(event) => setPosition(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">Salary</span>
          <input value={salary} onChange={(event) => setSalary(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">Start date</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <label>
          <span className="mb-2 block font-medium">End date</span>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label>
          <span className="mb-2 block font-medium">Communication</span>
          <select value={communication} onChange={(event) => setCommunication(event.target.value)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
            <option>Not Requested</option>
            <option>Requested</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block font-medium">Leave details</span>
          <input value={leaveDetail} onChange={(event) => setLeaveDetail(event.target.value)} placeholder={kind === 'Other Leave' ? 'Specify leave type or purpose' : 'Location, illness, study leave detail, or other purpose'} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
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
