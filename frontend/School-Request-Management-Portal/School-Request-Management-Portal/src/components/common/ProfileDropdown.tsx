import { User, LogOut } from 'lucide-react';
import { User as UserType } from '../../types';
import { Avatar } from './Avatar';

export function ProfileDropdown({ onLogout, onProfile, user }: { onLogout: () => void; onProfile: () => void; user: UserType }) {
  return (
    <div className="absolute right-0 top-16 z-50 w-[300px] overflow-hidden rounded-lg border border-[#e7e1db] bg-white shadow-2xl">
      <div className="border-b border-[#e7e1db] p-5">
        <h3 className="text-xl font-bold">{user.name}</h3>
        <p className="text-slate-500">{user.email}</p>
      </div>
      <button onClick={onProfile} className="flex w-full items-center gap-4 border-b border-[#e7e1db] px-5 py-4 text-left text-lg hover:bg-stone-50">
        <User size={20} />
        My Profile
      </button>
      <button onClick={onLogout} className="flex w-full items-center gap-4 px-5 py-4 text-left text-lg text-[#228b22] hover:bg-[#4cbb17]/10">
        <LogOut size={20} />
        Sign out
      </button>
    </div>
  );
}