import { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UserDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-md hover:bg-muted transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium leading-none">Admin User</p>
          <p className="text-xs text-muted-foreground mt-0.5">CBS Officer</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-lg border bg-popover shadow-lg z-50 py-1">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
            <User className="w-4 h-4" /> Profile
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
            <Settings className="w-4 h-4" /> Settings
          </button>
          <div className="border-t my-1" />
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
