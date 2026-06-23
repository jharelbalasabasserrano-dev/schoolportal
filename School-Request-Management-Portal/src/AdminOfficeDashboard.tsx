import { useState, type ComponentType } from 'react'
import { BadgeCheck, Building2, CheckCircle2, Clock, Search, XCircle } from 'lucide-react'
import type { PortalRequest, Status } from './portalData'

type IconComponent = ComponentType<{ size?: number; className?: string }>

export default function AdminOfficeDashboard({ activeView, onReview, requests }: { activeView: string; onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
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

function MetricCard({ icon: Icon, label, tone, value }: { icon: IconComponent; label: string; tone: string; value: number | string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg border border-black/5 ${tone} bg-white p-5 shadow-sm transition-shadow hover:shadow-md`}>
      <div className="absolute -right-8 -top-8 opacity-5">
        <Icon size={118} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.12em] opacity-70">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white/60 ring-1 ring-black/5">
            <Icon size={21} />
          </span>
        </div>
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
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ring-1 ${styles[status]}`}>
      <Icon size={15} />
      {status}
    </span>
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

function getCounts(list: PortalRequest[]) {
  return {
    Pending: list.filter((item) => item.status === 'Pending').length,
    Approved: list.filter((item) => item.status === 'Approved').length,
    Rejected: list.filter((item) => item.status === 'Rejected').length,
    Completed: list.filter((item) => item.status === 'Completed').length,
  }
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function getFacilityType(facility?: string) {
  return facility?.includes('Conference') ? 'Conference Room' : facility?.includes('Lab') ? 'Laboratory' : facility?.includes('AVR') ? 'Audio-Visual Room' : facility?.includes('Auditorium') ? 'Auditorium' : 'Classroom'
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

function getTopFacilities(requests: PortalRequest[]) {
  const counts = requests.reduce<Record<string, number>>((items, request) => {
    const facility = request.facility ?? 'Unassigned facility'
    items[facility] = (items[facility] ?? 0) + 1
    return items
  }, {})
  return Object.entries(counts)
    .map(([facility, count]) => ({ facility, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}
