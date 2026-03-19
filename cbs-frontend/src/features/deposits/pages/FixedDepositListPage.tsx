import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { FdStatsCards } from '../components/FdStatsCards';
import { FdTable } from '../components/FdTable';
import { useFixedDeposits } from '../hooks/useFixedDeposits';
import { cn } from '@/lib/utils';

type Tab = 'active' | 'maturing' | 'matured' | 'liquidated';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'maturing', label: 'Maturing Soon' },
  { key: 'matured', label: 'Matured' },
  { key: 'liquidated', label: 'Liquidated' },
];

export function FixedDepositListPage() {
  const navigate = useNavigate();
  const { list, stats, isLoading, activeTab, setActiveTab } = useFixedDeposits();

  return (
    <>
      <PageHeader
        title="Fixed Deposits"
        subtitle="Manage term deposits, rates, and maturity instructions"
        actions={
          <button
            onClick={() => navigate('/accounts/fixed-deposits/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New FD
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats */}
        <FdStatsCards stats={stats} isLoading={isLoading} />

        {/* Tabs + Table */}
        <div className="space-y-4">
          <div className="flex gap-1 border-b">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <FdTable data={list} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
}
