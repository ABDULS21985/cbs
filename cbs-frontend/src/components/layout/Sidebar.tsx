import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navigationItems, type NavItem } from './navigation';
import { ThemeToggle } from './ThemeToggle';
import { useState } from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Auto-expand the section containing the current route
    const initial: Record<string, boolean> = {};
    navigationItems.forEach((section) =>
      section.items.forEach((item) => {
        if (item.children && location.pathname.startsWith(item.path)) {
          initial[item.path] = true;
        }
      })
    );
    return initial;
  });

  const toggleExpand = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className="flex flex-col h-full bg-[hsl(222.2,84%,4.9%)] text-white w-full">
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
            BB
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-semibold text-base tracking-tight block">DigiCore</span>
              <span className="text-[10px] text-gray-500 block">Core Banking</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navigationItems.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold text-gray-500 tracking-widest uppercase">
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

      {/* Footer */}
      <div className="border-t border-white/10 p-2 flex-shrink-0">
        <ThemeToggle collapsed={collapsed} />
        {!collapsed && (
          <div className="px-3 py-1 text-[10px] text-gray-600">v1.0.0</div>
        )}
      </div>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={onToggle}
        className="hidden lg:flex items-center justify-center h-9 border-t border-white/10 text-gray-500 hover:text-white transition-colors flex-shrink-0"
        title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
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
  const hasChildren = item.children && item.children.length > 0;
  const active = isActive(item.path);

  if (collapsed) {
    return (
      <NavLink
        to={item.path}
        title={item.label}
        className={cn(
          'flex items-center justify-center w-full h-10 rounded-md transition-colors',
          active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
        )}
      >
        {Icon && <Icon className="w-5 h-5" />}
      </NavLink>
    );
  }

  return (
    <div>
      {hasChildren ? (
        <button
          onClick={onToggleExpand}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors',
            active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
          )}
        >
          {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')}
          />
        </button>
      ) : (
        <NavLink
          to={item.path}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
          )}
        >
          {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
          <span>{item.label}</span>
        </NavLink>
      )}

      {/* Sub-items */}
      {hasChildren && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="ml-5 pl-4 border-l border-white/10 mt-1 space-y-0.5">
            {item.children!.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                end={child.path === item.path}
                className={({ isActive: childActive }) =>
                  cn(
                    'block px-3 py-1.5 rounded-md text-sm transition-colors',
                    childActive ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300'
                  )
                }
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
