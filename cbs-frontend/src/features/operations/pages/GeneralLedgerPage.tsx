import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, BarChart3, ScrollText, Scale, ArrowLeftRight, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared';
import { glApi } from '../api/glApi';
import type { JournalFilters } from '../api/glApi';
import { ChartOfAccountsTree } from '../components/gl/ChartOfAccountsTree';
import { GlBalancesTable } from '../components/gl/GlBalancesTable';
import { JournalEntrySearch } from '../components/gl/JournalEntrySearch';
import { JournalEntryTable } from '../components/gl/JournalEntryTable';
import { ManualJournalForm } from '../components/gl/ManualJournalForm';
import { TrialBalanceTable } from '../components/gl/TrialBalanceTable';
import { SubLedgerReconciliation } from '../components/gl/SubLedgerReconciliation';

const DEFAULT_FILTERS: JournalFilters = {
  glCode: '',
  dateFrom: '',
  dateTo: '',
  journalNumber: '',
  minAmount: '',
  maxAmount: '',
  source: 'ALL',
  status: 'ALL',
};

function JournalEntriesTab() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<JournalFilters>(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState<JournalFilters>(DEFAULT_FILTERS);
  const [journalFormOpen, setJournalFormOpen] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['gl-journals', activeFilters],
    queryFn: () =>
      glApi.getJournalEntries({
        glCode: activeFilters.glCode || undefined,
        dateFrom: activeFilters.dateFrom || undefined,
        dateTo: activeFilters.dateTo || undefined,
        journalNumber: activeFilters.journalNumber || undefined,
        source: activeFilters.source,
        status: activeFilters.status,
        minAmount: activeFilters.minAmount ? Number(activeFilters.minAmount) : undefined,
        maxAmount: activeFilters.maxAmount ? Number(activeFilters.maxAmount) : undefined,
      }),
  });

  const handleChange = useCallback((partial: Partial<JournalFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleSearch = useCallback(() => {
    setActiveFilters(filters);
  }, [filters]);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setActiveFilters(DEFAULT_FILTERS);
  }, []);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Journal Entries</h2>
        <button
          onClick={() => setJournalFormOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Journal Entry
        </button>
      </div>

      <JournalEntrySearch
        filters={filters}
        onChange={handleChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <JournalEntryTable entries={entries} isLoading={isLoading} />

      <ManualJournalForm
        open={journalFormOpen}
        onClose={() => setJournalFormOpen(false)}
        onSuccess={() => {
          setJournalFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ['gl-journals'] });
        }}
      />
    </div>
  );
}

function ChartOfAccountsTab() {
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['gl-accounts'],
    queryFn: glApi.getChartOfAccounts,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" style={{ marginLeft: `${(i % 3) * 24}px` }} />
        ))}
      </div>
    );
  }

  return <ChartOfAccountsTree accounts={accounts} />;
}

export function GeneralLedgerPage() {
  return (
    <>
      <PageHeader
        title="General Ledger"
        subtitle="Chart of accounts, journal entries, balances, and reconciliation"
      />
      <TabsPage
        tabs={[
          {
            id: 'coa',
            label: 'Chart of Accounts',
            icon: BookOpen,
            content: <ChartOfAccountsTab />,
          },
          {
            id: 'balances',
            label: 'GL Balances',
            icon: BarChart3,
            content: <GlBalancesTable />,
          },
          {
            id: 'journals',
            label: 'Journal Entries',
            icon: ScrollText,
            content: <JournalEntriesTab />,
          },
          {
            id: 'trial-balance',
            label: 'Trial Balance',
            icon: Scale,
            content: <TrialBalanceTable />,
          },
          {
            id: 'reconciliation',
            label: 'Reconciliation',
            icon: ArrowLeftRight,
            content: <SubLedgerReconciliation />,
          },
        ]}
        defaultTab="coa"
      />
    </>
  );
}
