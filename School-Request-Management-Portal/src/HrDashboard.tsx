import { useState, type ComponentType } from 'react'
import { BadgeCheck, CalendarClock, CheckCircle2, Clock, Search, XCircle } from 'lucide-react'
import type { PortalRequest, RequestKind, Status } from './portalData'

type IconComponent = ComponentType<{ size?: number; className?: string }>

const leaveKinds: RequestKind[] = ['Vacation Leave', 'Mandatory/Forced Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Special Privilege Leave', 'Solo Parent Leave', 'Study Leave', '10-Day VAWC Leave', 'Rehabilitation Privilege', 'Special Leave Benefits for Women', 'Special Emergency (Calamity) Leave', 'Adoption Leave', 'Other Leave']
const legacyLeaveKinds: RequestKind[] = ['Personal Leave', 'Official Leave']
const allLeaveKinds: RequestKind[] = [...leaveKinds, ...legacyLeaveKinds]

export default function HrDashboard({ activeView, onReview, requests }: { activeView: string; onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
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
          <div className="mb-6 space-y-4">
            <div className="leave-type-nav rounded-lg border border-[#e7e1db] bg-stone-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[.14em] text-slate-500">Leave type</p>
                  <p className="mt-1 text-sm text-slate-600">Filter applications by Civil Service leave category.</p>
                </div>
                <span className="hidden rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-600 shadow-sm sm:inline-flex">
                  {filtered.length} shown
                </span>
              </div>
              <div className="leave-type-scroll flex gap-3 overflow-x-auto pb-2">
                {[
                  ['All', 'All types'],
                  ...leaveKinds.map((kind) => [kind, getLeaveTypeLabel(kind)]),
                ].map(([value, label]) => {
                  const active = typeFilter === value
                  const count = value === 'All' ? leaveApplications.length : leaveApplications.filter((request) => request.kind === value).length
                  return (
                    <button key={value} onClick={() => setTypeFilter(value as RequestKind | 'All')} className={`leave-type-tab min-w-[170px] rounded-lg border px-4 py-3 text-left ${active ? 'is-active border-[#228b22] bg-[#228b22] text-white' : 'border-[#e7e1db] bg-white text-slate-700 hover:border-[#4cbb17]'}`}>
                      <span className="block truncate text-sm font-bold">{label}</span>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? 'bg-white/20 text-white' : 'bg-[#4cbb17]/12 text-[#228b22]'}`}>{count} {count === 1 ? 'request' : 'requests'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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

function isLeaveApplication(request: PortalRequest) {
  return allLeaveKinds.includes(request.kind)
}

function getLeaveTypeLabel(kind: RequestKind) {
  return kind
}

function getLeaveDateRange(request: PortalRequest) {
  if (request.inclusiveDates) return request.inclusiveDates
  if (request.date && request.time && /^\d{4}-\d{2}-\d{2}$/.test(request.time)) return `${formatShortDate(request.date)} - ${formatShortDate(request.time)}`
  return formatShortDate(request.date)
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function getLeaveTypeRows(requests: PortalRequest[]) {
  const colors = ['bg-[#b94247]', 'bg-[#eba900]', 'bg-[#3a9276]', 'bg-stone-400', 'bg-blue-400']
  return allLeaveKinds
    .map((kind, index) => ({
      label: getLeaveTypeLabel(kind),
      count: requests.filter((request) => request.kind === kind).length,
      color: colors[index % colors.length],
    }))
    .filter((row) => row.count > 0)
}