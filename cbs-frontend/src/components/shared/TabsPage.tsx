import { useState, type ReactNode, type ComponentType } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  badge?: number;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsPageProps {
  tabs: TabItem[];
  defaultTab?: string;
  syncWithUrl?: boolean;
}

export function TabsPage({ tabs, defaultTab, syncWithUrl }: TabsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = syncWithUrl ? searchParams.get('tab') : null;
  const [localTab, setLocalTab] = useState(defaultTab || tabs[0]?.id);
  const activeTab = urlTab || localTab;

  const handleTabChange = (id: string) => {
    if (syncWithUrl) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', id);
      setSearchParams(nextParams);
    } else {
      setLocalTab(id);
    }
  };

  const current = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="tabs-page-shell">
      <div className="tabs-page-bar">
        <div className="tabs-page-list" role="tablist" aria-label="Page sections">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && handleTabChange(tab.id)}
                disabled={tab.disabled}
                aria-pressed={isActive}
                className={cn(
                  'tabs-page-trigger flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                  tab.disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-primary text-primary-foreground font-semibold">{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="tabs-page-content">{current?.content}</div>
    </div>
  );
}
