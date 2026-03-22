import { Search, Menu } from 'lucide-react';
import { UserDropdown } from './UserDropdown';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <header className="app-topbar">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="gloss-pill rounded-xl p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search trigger */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="gloss-pill hidden w-72 items-center gap-2 rounded-2xl px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto rounded-lg border border-white/10 bg-black/20 px-1.5 py-0.5 font-mono text-xs text-slate-300">⌘K</kbd>
        </button>
      </div>

      {/* Right */}
      <div className="relative z-50 flex items-center gap-1">
        <NotificationBell />
        <div className="ml-1 border-l border-white/10 pl-2">
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
