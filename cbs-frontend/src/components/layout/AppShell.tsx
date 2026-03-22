import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';
import { RouteContentLoader } from './RouteContentLoader';
import { useSidebarState } from '@/hooks/useSidebarState';
import { cn } from '@/lib/utils';

export function AppShell() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebarState();

  return (
    <div className="relative flex h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-28 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute right-[-8rem] top-16 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-cyan-500/6 blur-3xl" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="modal-scrim fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <div className={cn('relative z-20 hidden lg:flex', collapsed ? 'w-16' : 'w-[260px]', 'transition-all duration-300')}>
        <Sidebar collapsed={collapsed} onToggle={toggle} />
      </div>

      {/* Sidebar — mobile */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onToggleSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="relative flex-1 overflow-y-auto">
          <Breadcrumbs />
          <Suspense fallback={<RouteContentLoader className="page-container" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
