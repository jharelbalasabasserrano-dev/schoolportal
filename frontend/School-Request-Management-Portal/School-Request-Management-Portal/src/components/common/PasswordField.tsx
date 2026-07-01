import { Eye, EyeOff, LucideIcon } from 'lucide-react';

export function PasswordField({ icon: Icon, label, onChange, setShow, show, value }: { icon: LucideIcon; label: string; onChange: (value: string) => void; setShow: (show: boolean) => void; show: boolean; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block font-semibold text-slate-600">{label}</span>
      <span className="flex h-14 items-center rounded-md border border-[#d9d3cc] px-4 focus-within:border-[#228b22] focus-within:ring-4 focus-within:ring-[#4cbb17]/20">
        <Icon className="mr-3 text-slate-500" size={20} />
        <input type={show ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
        <button type="button" onClick={() => setShow(!show)} className="rounded-md p-2 text-slate-500 hover:bg-stone-100" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </span>
    </label>
  );
}