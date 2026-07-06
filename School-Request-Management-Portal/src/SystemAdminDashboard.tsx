import { CheckCircle2, FileText, Plus, Save, Search, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { facilityStatuses, hrLeaveStatuses, registrarStatuses, roleMeta, supplyStatuses, type PortalRequest, type Role, type User } from './portalData'
import { formatShortDate, getAdminActivityLogs, getAdminRequestType, getAdminStats, getAdminTypeRows, getAdminTypeTone, getCounts, getSystemAdminRequests } from './portalHelpers'
import { useAuth } from './portalAuth'
import { Avatar, StatusPill } from './portalComponents'
import { Modal } from './portalViews'
import StatusBreakdownPanel from './StatusBreakdownPanel'

type AdminStatusFilter = 'All' | PortalRequest['status']

const adminStatusFilters: readonly AdminStatusFilter[] = ['All', ...new Set([...registrarStatuses, ...hrLeaveStatuses, ...supplyStatuses, ...facilityStatuses])]

export function SystemAdminView({ activeView, onViewRequest, requests }: { activeView: string; onViewRequest: (request: PortalRequest) => void; requests: PortalRequest[] }) {
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
        <button onClick={openCreate} className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#228b22] px-6 font-semibold text-white">
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
                  <button onClick={() => openEdit(account)} className="mr-4 font-semibold text-[#228b22]">View</button>
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
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Juan Dela Cruz" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <label className="block">
          <span className="mb-2 block font-medium">Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="e.g. juan@student.edu" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <span className="mb-2 block font-medium">Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
              {Object.entries(roleMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block font-medium">Department</span>
            <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. College of Science" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
        </div>
        <p className="rounded-md border border-[#e7e1db] bg-stone-50 p-4 text-slate-600">Default password will be <span className="font-bold">password123</span>.</p>
        <div className="flex justify-end gap-3 border-t border-[#e7e1db] pt-5">
          <button type="button" onClick={onClose} className="h-12 rounded-md border border-[#d9d3cc] px-6 font-semibold">Cancel</button>
          <button className="h-12 rounded-md bg-[#228b22] px-6 font-semibold text-white">{account ? 'Save user' : 'Create user'}</button>
        </div>
      </form>
    </Modal>
  )
}

function AdminAllRequestsView({ onViewRequest, requests }: { onViewRequest: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'All' | 'Document' | 'Facility' | 'Supply' | 'Leave'>('All')
  const [status, setStatus] = useState<AdminStatusFilter>('All')
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
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID or name..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#228b22]" />
        </label>
        <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-14 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
          {(['All', 'Document', 'Facility', 'Supply', 'Leave'] as const).map((item) => <option key={item} value={item}>{item === 'All' ? 'All types' : item}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as AdminStatusFilter)} className="h-14 rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
          {adminStatusFilters.map((item) => <option key={item} value={item}>{item === 'All' ? 'All status' : item}</option>)}
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
                <td className="px-6 py-5 text-right"><button onClick={() => onViewRequest(request)} className="font-semibold text-[#228b22]">View</button></td>
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
              ['Disapproved', stats.disapproved],
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
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter logs..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#228b22]" />
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
            <input defaultValue="CCDPortal" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
          <label className="block">
            <span className="mb-2 block font-medium">Academic year</span>
            <input defaultValue="2026-2027" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
          <label className="block">
            <span className="mb-2 block font-medium">Admin email</span>
            <input defaultValue="admin@edu.portal" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
          </label>
          <label className="block">
            <span className="mb-2 block font-medium">Timezone</span>
            <select defaultValue="UTC+8 (Manila)" className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]">
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
              <input defaultValue={value} className="h-14 w-full rounded-md border border-[#d9d3cc] px-4 text-lg outline-none focus:border-[#228b22]" />
            </label>
          ))}
        </div>
      </section>
      <button className="inline-flex h-12 items-center gap-2 rounded-md bg-[#228b22] px-6 font-semibold text-white"><Save size={18} />Save settings</button>
    </div>
  )
}

export default SystemAdminView
