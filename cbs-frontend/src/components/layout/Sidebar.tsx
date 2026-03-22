import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { navigationItems, type NavItem } from './navigation';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function isRoleAllowed(item: NavItem, userRoles: string[]) {
  if (!item.roles || item.roles.length === 0 || item.roles.includes('*')) {
    return true;
  }
  return item.roles.some((role) => userRoles.includes(role) || userRoles.includes('CBS_ADMIN'));
}

function filterItem(item: NavItem, userRoles: string[]): NavItem | null {
  const children = item.children
    ?.map((child) => filterItem(child, userRoles))
    .filter((child): child is NavItem => child !== null);
  const directAccess = isRoleAllowed(item, userRoles);

  if (!directAccess && (!children || children.length === 0)) {
    return null;
  }

  return {
    ...item,
    children,
  };
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const userRoles = user?.roles ?? [];
  const filteredSections = useMemo(
    () => navigationItems
      .map((section) => ({
        ...section,
        items: section.items
          .map((item) => filterItem(item, userRoles))
          .filter((item): item is NavItem => item !== null),
      }))
      .filter((section) => section.items.length > 0),
    [userRoles],
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navigationItems.forEach((section) =>
      section.items.forEach((item) => {
        if (item.children && location.pathname.startsWith(item.path)) {
          initial[item.path] = true;
        }
      }),
    );
    return initial;
  });

  const toggleExpand = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <aside className="app-sidebar-surface">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-8 top-0 h-40 w-40 rounded-full bg-sky-400/16 blur-3xl" />
        <div className="absolute bottom-10 left-8 h-32 w-32 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <div className="relative flex h-14 flex-shrink-0 items-center border-b border-white/10 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="app-sidebar-brand-mark">
            BB
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block text-base font-semibold tracking-tight text-slate-50">DigiCore</span>
              <span className="block text-[10px] uppercase tracking-[0.3em] text-slate-400">Core Banking</span>
            </div>
          )}
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-2 py-3">
        {filteredSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarItem
                  key={item.path}
                  item={item}
                  collapsed={collapsed}
                  isActive={isActive}
                  expanded={!!expanded[item.path]}
                  onToggleExpand={() => toggleExpand(item.path)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative flex-shrink-0 border-t border-white/10 p-2">
        <ThemeToggle collapsed={collapsed} />
        {!collapsed && (
          <div className="px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-600">v1.0.0</div>
        )}
      </div>

      <button
        onClick={onToggle}
        className="relative hidden h-9 flex-shrink-0 items-center justify-center border-t border-white/10 text-slate-500 transition-colors hover:text-white lg:flex"
        title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}

function SidebarItem({
  item,
  collapsed,
  isActive,
  expanded,
  onToggleExpand,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: (path: string) => boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const Icon = item.icon;
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const active = isActive(item.path);
  const targetPath = hasChildren ? item.children?.[0]?.path ?? item.path : item.path;

  if (collapsed) {
    return (
        <NavLink
          to={targetPath}
          title={item.label}
          className={cn(
            'app-sidebar-item h-10 w-full justify-center px-0',
            active ? 'app-sidebar-item-active' : 'app-sidebar-item-idle',
        )}
      >
        {Icon && <Icon className="h-5 w-5" />}
      </NavLink>
    );
  }

  return (
    <div>
      {hasChildren ? (
        <button
          onClick={onToggleExpand}
          className={cn(
            'app-sidebar-item w-full',
            active ? 'app-sidebar-item-active' : 'app-sidebar-item-idle',
          )}
        >
          {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      ) : (
        <NavLink
          to={item.path}
          className={cn(
            'app-sidebar-item',
            active ? 'app-sidebar-item-active' : 'app-sidebar-item-idle',
          )}
        >
          {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
          <span>{item.label}</span>
        </NavLink>
      )}

      {hasChildren && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="mt-1 ml-5 space-y-0.5 border-l border-white/10 pl-4">
            {item.children!.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                end={child.path === item.path}
                className={({ isActive: childActive }) => cn(
                  'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                  childActive ? 'bg-white/7 text-white' : 'text-slate-500 hover:text-slate-300',
                )}
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
