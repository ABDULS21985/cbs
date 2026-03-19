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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <div className={cn('hidden lg:flex', collapsed ? 'w-16' : 'w-[260px]', 'transition-all duration-300')}>
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
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar onToggleSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 overflow-y-auto">
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
