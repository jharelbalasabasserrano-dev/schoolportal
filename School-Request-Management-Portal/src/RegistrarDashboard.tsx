import { useState, type ComponentType } from 'react'
import { BadgeCheck, CheckCircle2, Clock, FileText, Search, ShieldCheck, XCircle } from 'lucide-react'
import { documentKinds, registrarStatuses, type PortalRequest, type RegistrarPortalRequest, type RegistrarStatus, type RequestKind } from './portalData'

type IconComponent = ComponentType<{ size?: number; className?: string }>

export default function RegistrarDashboard({ activeView, onReview, requests }: { activeView: string; onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  const initialType = activeView === 'TOR Requests' ? 'TOR Request' : activeView === 'COE Requests' ? 'COE Request' : activeView === 'Exit Clearance' ? 'Exit Clearance' : 'All'
  const [typeFilter, setTypeFilter] = useState<RequestKind | 'All'>(initialType)
  const [statusFilter, setStatusFilter] = useState<RegistrarStatus | 'All'>('All')
  const [query, setQuery] = useState('')

  const academicRequests = requests.filter((request): request is RegistrarPortalRequest => documentKinds.includes(request.kind as RegistrarPortalRequest['kind']))
  const filtered = academicRequests.filter((request) => {
    const byType = typeFilter === 'All' || request.kind === typeFilter
    const byStatus = statusFilter === 'All' || request.status === statusFilter
    const byQuery = `${request.id} ${request.owner} ${request.title} ${request.remarks}`.toLowerCase().includes(query.toLowerCase())
    return byType && byStatus && byQuery
  })
  const pageTitle = typeFilter === 'All' ? 'All document requests' : `${getDocumentTitle(typeFilter)} requests`
  const pageDescription = typeFilter === 'All' ? 'Approve or reject Registrar document and student record requests.' : `Approve or reject ${getDocumentTitle(typeFilter)} applications.`

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={academicRequests.filter((request) => request.status === 'Pending').length} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="TOR" value={academicRequests.filter((request) => request.kind === 'TOR Request').length} icon={FileText} tone="bg-[#4cbb17]/15 text-[#228b22]" />
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
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, name, purpose..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#228b22] xl:w-[390px]" />
          </label>
        </div>

        <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex flex-wrap rounded-full border border-[#e7e1db] bg-stone-50 p-1">
            {[
              ['All', 'All types'],
              ['TOR Request', 'TOR'],
              ['COE Request', 'COE'],
              ['Exit Clearance', 'Exit Clearance'],
              ['Change of Subject due to Conflict of Schedule', 'Change of Student'],
              ['Adding/Dropping of Subjects', 'Adding/Dropping'],
              ['Other Registrar Request', 'Other'],
            ].map(([value, label]) => (
              <button key={value} onClick={() => setTypeFilter(value as RequestKind | 'All')} className={`rounded-full px-5 py-2 font-semibold ${typeFilter === value ? 'bg-[#228b22] text-white' : 'text-slate-700'}`}>{label}</button>
            ))}
          </div>
          <div className="flex flex-wrap">
            {(['All', ...registrarStatuses] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-full border px-5 py-2 ${statusFilter === status ? 'border-[#4cbb17] bg-[#4cbb17]/10 text-[#228b22]' : 'border-[#e7e1db] hover:bg-stone-50'}`}>{status}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="border-b-2 border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 text-xs font-bold uppercase tracking-widest text-slate-700">
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
                    <button onClick={() => onReview(request)} className="font-semibold text-[#228b22]">Review</button>
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

function StatusPill({ status }: { status: RegistrarStatus }) {
  const styles: Record<RegistrarStatus, string> = {
    Pending: 'bg-amber-50 text-amber-800 ring-amber-300',
    'On Process': 'bg-blue-100 text-blue-800 ring-blue-300',
    'Ready for Pick Up': 'bg-emerald-100 text-emerald-900 ring-emerald-300',
    Disapproved: 'bg-red-100 text-red-800 ring-red-300',
  }
  const Icon = status === 'Pending' || status === 'On Process' ? Clock : status === 'Disapproved' ? XCircle : status === 'Ready for Pick Up' ? BadgeCheck : CheckCircle2
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ring-1 ${styles[status]}`}>
      <Icon size={15} />
      {status}
    </span>
  )
}

function getDocumentTitle(kind: RequestKind) {
  if (kind === 'TOR Request') return 'TOR'
  if (kind === 'COE Request') return 'COE'
  if (kind === 'Certificate of Registration') return 'Certificate of Registration'
  if (kind === 'Certificate of Grades') return 'Certificate of Grades'
  if (kind === 'Certificate of Credit Units') return 'Certificate of Credit Units'
  if (kind === 'Change of Subject due to Conflict of Schedule') return 'Change of Student due to Conflict of Schedule'
  if (kind === 'Adding/Dropping of Subjects') return 'Adding/Dropping of Subjects'
  if (kind === 'Other Registrar Request') return 'Other'
  return 'Exit Clearance'
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function getCopiesForRequest(request: PortalRequest) {
  if (request.id === 'DR-2026-001') return 2
  if (request.id === 'DR-2026-004') return 3
  return 1
}
