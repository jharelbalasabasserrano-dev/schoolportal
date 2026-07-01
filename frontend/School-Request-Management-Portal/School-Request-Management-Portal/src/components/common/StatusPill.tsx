import { Clock, XCircle, CheckCircle2, BadgeCheck } from 'lucide-react';
import { Status } from '../../types';

export function StatusPill({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    Pending: 'bg-amber-50 text-amber-800 ring-amber-300',
    Approved: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
    Rejected: 'bg-red-100 text-red-800 ring-red-300',
    Completed: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  };
  const Icon = status === 'Pending' ? Clock : status === 'Rejected' ? XCircle : status === 'Completed' ? BadgeCheck : CheckCircle2;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${styles[status]}`}><Icon size={15} />{status}</span>;
}