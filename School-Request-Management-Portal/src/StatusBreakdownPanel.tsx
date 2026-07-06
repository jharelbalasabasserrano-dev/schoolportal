import type { Status } from './portalData'

export default function StatusBreakdownPanel({ counts, rows = defaultRows, title = 'Status breakdown', total }: { counts: Record<Status, number>; rows?: { color: string; label: string; status: Status }[]; title?: string; total: number }) {
  return (
    <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
      <h2 className="mb-6 text-2xl font-bold">{title}</h2>
      <div className="space-y-5">
        {rows.map((row) => {
          const value = counts[row.status]
          const percent = total ? (value / total) * 100 : 0
          return (
            <div key={row.status}>
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

const defaultRows: { color: string; label: string; status: Status }[] = [
    { label: 'Pending', color: 'bg-[#eba900]' },
    { label: 'Approved', color: 'bg-[#3a9276]' },
    { label: 'Rejected', color: 'bg-[#b94247]' },
  ].map((row) => ({ ...row, status: row.label as Status }))
