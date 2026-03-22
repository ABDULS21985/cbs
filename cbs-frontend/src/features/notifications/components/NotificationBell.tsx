import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationBell() {
  const { unreadCount, countIncreased } = useNotifications();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Pulse animation when count increases
  useEffect(() => {
    if (countIncreased && unreadCount > 0) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [countIncreased, unreadCount]);

  return (
    <div className="relative z-[70]" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="gloss-pill relative rounded-xl p-2 transition-colors hover:text-foreground"
      >
        <Bell className={cn('w-4 h-4', pulse && 'animate-bounce')} />
        {unreadCount > 0 && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 transition-transform',
            pulse && 'animate-pulse scale-110',
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && <NotificationDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}
