import { BadgeCheck, CheckCircle2, Clock, LogOut, Megaphone, User as UserIcon, XCircle, type LucideIcon } from 'lucide-react'
import { getInitials, type NotificationItem } from './portalHelpers'
import { initialAnnouncements, roleMeta, type Announcement, type Status, type User } from './portalData'

type IconComponent = LucideIcon

export function PageIntro({ description, icon: Icon, title, tone }: { description: string; icon: IconComponent; title: string; tone: string }) {
  return (
    <section className="rounded-lg border border-[#e7e1db] bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
      <div className="flex items-center justify-between gap-5">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">{description}</p>
        </div>
        <span className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-md sm:flex ${tone}`}>
          <Icon size={22} />
        </span>
      </div>
    </section>
  )
}

export function MetricCard({ icon: Icon, label, tone, value }: { icon: IconComponent; label: string; tone: string; value: number | string }) {
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

export function Avatar({ size = 'md', user }: { size?: 'sm' | 'md' | 'xl'; user: Pick<User, 'avatarUrl' | 'name'> }) {
  const sizes = {
    sm: 'h-11 w-11 text-sm',
    md: 'h-12 w-12 text-base',
    xl: 'h-20 w-20 border-4 border-white/25 text-2xl',
  }
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#228b22] font-bold text-white ${sizes[size]}`}>
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(user.name)}
    </span>
  )
}

export function ActionCard({ highlighted = false, icon: Icon, onClick, subtitle, title, tone }: { highlighted?: boolean; icon: IconComponent; onClick: () => void; subtitle: string; title: string; tone: string }) {
  return (
    <button onClick={onClick} className={`rounded-lg border bg-white p-5 text-left shadow-sm transition hover:border-[#228b22] hover:shadow-md ${highlighted ? 'border-[#4cbb17] ring-1 ring-[#4cbb17]/40' : 'border-[#e7e1db]'}`}>
      <span className={`mb-8 flex h-11 w-11 items-center justify-center rounded-md ${tone}`}>
        <Icon size={21} />
      </span>
      <span className="block text-xl font-bold">{title}</span>
      <span className="mt-2 block leading-6 text-slate-600">{subtitle}</span>
    </button>
  )
}

export function AnnouncementsPanel({ announcements = initialAnnouncements }: { announcements?: Announcement[] }) {
  const latest = [...announcements].slice(0, 4)
  return (
    <div className="rounded-lg border border-[#e7e1db] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Announcements</h2>
          <p className="text-slate-500">Campus updates</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 text-amber-800"><Megaphone size={20} /></span>
      </div>
      {latest.map((announcement) => (
        <div key={announcement.id} className="mb-3 rounded-md border border-[#e7e1db] p-4 last:mb-0">
          <h3 className="font-bold">{announcement.title}</h3>
          <p className="mt-2 text-slate-600">{announcement.body}</p>
          <p className="mt-3 text-sm text-slate-500">
            Posted by {roleMeta[announcement.authorRole].label} - {announcement.authorName}
          </p>
        </div>
      ))}
      {latest.length === 0 && <p className="rounded-md border border-[#e7e1db] p-4 text-slate-500">No announcements yet.</p>}
    </div>
  )
}

export function InfoCard({ lines, title }: { lines: string[]; title: string }) {
  return (
    <div className="rounded-lg border border-[#e7e1db] bg-white p-5 shadow-sm sm:p-6">
      <h3 className="mb-5 text-xl font-bold">{title}</h3>
      <div className="space-y-4">
        {lines.map((line) => <p key={line} className="flex items-center gap-3 text-slate-700"><Clock size={16} className="text-[#228b22]" />{line}</p>)}
      </div>
    </div>
  )
}

export function NotificationsDropdown({ notifications, onMarkAllRead }: { notifications: NotificationItem[]; onMarkAllRead: () => void }) {
  const unreadCount = notifications.filter((item) => !item.read).length
  return (
    <div className="fixed inset-x-3 top-[76px] z-50 max-h-[calc(100vh-92px)] overflow-hidden rounded-lg border border-[#e7e1db] bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-16 sm:w-[420px]">
      <div className="flex items-center justify-between border-b border-[#e7e1db] p-4">
        <div>
          <h3 className="text-lg font-bold">Notifications</h3>
          <p className="text-slate-500">{unreadCount} unread</p>
        </div>
        <button onClick={onMarkAllRead} className="font-medium text-[#228b22]">Mark all read</button>
      </div>
      <div className="max-h-[calc(100vh-160px)] overflow-auto sm:max-h-[520px]">
        {notifications.map((item) => (
          <div key={item.id} className="flex gap-3 border-b border-[#eee9e4] p-4 last:border-b-0">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${item.tone}`}><item.icon size={20} /></span>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold">{item.title}</h4>
              <p className="line-clamp-2 text-slate-700">{item.body}</p>
              <p className="mt-2 text-sm text-slate-500">{item.age}</p>
            </div>
            {!item.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#228b22]" />}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfileDropdown({ onLogout, onProfile, user }: { onLogout: () => void; onProfile: () => void; user: User }) {
  return (
    <div className="fixed right-3 top-[76px] z-50 w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-lg border border-[#e7e1db] bg-white shadow-2xl sm:absolute sm:right-0 sm:top-16">
      <div className="border-b border-[#e7e1db] p-5">
        <h3 className="text-xl font-bold">{user.name}</h3>
        <p className="text-slate-500">{user.email}</p>
      </div>
      <button onClick={onProfile} className="flex w-full items-center gap-4 border-b border-[#e7e1db] px-5 py-4 text-left text-lg hover:bg-stone-50">
        <UserIcon size={20} />
        My Profile
      </button>
      <button onClick={onLogout} className="flex w-full items-center gap-4 px-5 py-4 text-left text-lg text-[#228b22] hover:bg-[#4cbb17]/10">
        <LogOut size={20} />
        Sign out
      </button>
    </div>
  )
}

export function ProfileField({ disabled = false, icon: Icon, label, onChange, value }: { disabled?: boolean; icon: IconComponent; label: string; onChange?: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block font-medium">{label}</span>
      <span className="flex h-12 items-center rounded-md border border-[#d9d3cc] bg-white px-4 focus-within:border-[#228b22]">
        <Icon className="mr-3 text-slate-500" size={20} />
        <input disabled={disabled} value={value} onChange={(event) => onChange?.(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none disabled:text-slate-700" />
      </span>
      {disabled && label === 'Email address' && <span className="mt-2 block text-slate-500">Contact admin to change your email.</span>}
    </label>
  )
}

export function StatusPill({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    Pending: 'bg-amber-50 text-amber-800 ring-amber-300',
    Approved: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
    Rejected: 'bg-red-100 text-red-800 ring-red-300',
    Completed: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  }
  const Icon = status === 'Pending' ? Clock : status === 'Rejected' ? XCircle : status === 'Completed' ? BadgeCheck : CheckCircle2
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${styles[status]}`}><Icon size={15} />{status}</span>
}
