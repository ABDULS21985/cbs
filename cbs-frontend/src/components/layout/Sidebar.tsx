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
    <aside className="flex h-full w-full flex-col bg-[hsl(222.2,84%,4.9%)] text-white">
      <div className="flex h-14 flex-shrink-0 items-center border-b border-white/10 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500 text-sm font-bold">
            BB
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block text-base font-semibold tracking-tight">DigiCore</span>
              <span className="block text-[10px] text-gray-500">Core Banking</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {filteredSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
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

      <div className="flex-shrink-0 border-t border-white/10 p-2">
        <ThemeToggle collapsed={collapsed} />
        {!collapsed && (
          <div className="px-3 py-1 text-[10px] text-gray-600">v1.0.0</div>
        )}
      </div>

      <button
        onClick={onToggle}
        className="hidden h-9 flex-shrink-0 items-center justify-center border-t border-white/10 text-gray-500 transition-colors hover:text-white lg:flex"
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
          'flex h-10 w-full items-center justify-center rounded-md transition-colors',
          active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white',
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
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white',
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
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white',
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
                  'block rounded-md px-3 py-1.5 text-sm transition-colors',
                  childActive ? 'bg-white/5 text-white' : 'text-gray-500 hover:text-gray-300',
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
