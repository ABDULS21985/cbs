import { Bell, Search, Menu } from 'lucide-react';
import { UserDropdown } from './UserDropdown';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b bg-card flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search trigger */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border bg-muted/50 text-muted-foreground hover:bg-muted transition-colors w-72"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs bg-background/80 px-1.5 py-0.5 rounded font-mono border">⌘K</kbd>
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-md hover:bg-muted transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>
        <div className="ml-1 pl-2 border-l">
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
