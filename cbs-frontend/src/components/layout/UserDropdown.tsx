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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-md hover:bg-muted transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium leading-none">{displayName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{primaryRole}</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-lg border bg-popover shadow-lg z-50 py-1">
          {/* User info header */}
          <div className="px-3 py-2 border-b mb-1">
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
            className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <User className="w-4 h-4" /> My Profile
          </button>
          <button
            onClick={handleSettings}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <Settings className="w-4 h-4" /> Security Settings
          </button>
          <div className="border-t my-1" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
