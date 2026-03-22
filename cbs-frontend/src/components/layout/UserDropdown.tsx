import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

export function UserDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    logout();
    window.location.href = '/login';
  };

  const handleProfile = () => {
    setOpen(false);
    navigate('/profile');
  };

  const handleSettings = () => {
    setOpen(false);
    navigate('/profile?tab=security');
  };

  if (!isAuthenticated || !user) return null;

  const displayName = user.fullName || user.username || 'User';
  const primaryRole = user.roles[0]?.replace(/_/g, ' ') || 'Staff';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative z-[70]" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="gloss-pill flex items-center gap-2 rounded-2xl py-1.5 pl-3 pr-2 transition-colors hover:text-foreground"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-500 text-[10px] font-bold text-slate-950 shadow-[0_8px_20px_rgba(56,189,248,0.25)]">
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium leading-none">{displayName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{primaryRole}</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="gloss-panel absolute right-0 z-[80] mt-2 w-56 rounded-2xl py-1 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
          {/* User info header */}
          <div className="mb-1 border-b border-white/10 px-3 py-2">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {user.roles.slice(0, 3).map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary"
                >
                  <Shield className="w-2.5 h-2.5" />
                  {role.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleProfile}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-white/6"
          >
            <User className="w-4 h-4" /> My Profile
          </button>
          <button
            onClick={handleSettings}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-white/6"
          >
            <Settings className="w-4 h-4" /> Security Settings
          </button>
          <div className="my-1 border-t border-white/10" />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
