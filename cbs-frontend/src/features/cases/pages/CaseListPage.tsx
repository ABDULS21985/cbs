import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Filter, X, BarChart2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CaseTable } from '../components/CaseTable';
import { caseApi } from '../api/caseApi';
import { useCaseStats, useMyCases, useUnassignedCases, useEscalatedCases } from '../hooks/useCases';
import type { CustomerCase } from '../api/caseApi';

interface CaseFilters {
  caseType: string;
  priority: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

const EMPTY_FILTERS: CaseFilters = {
  caseType: '',
  priority: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  search: '',
};

function hasActiveFilters(f: CaseFilters) {
  return Object.values(f).some((v) => v !== '');
}

function applyFilters(cases: CustomerCase[], filters: CaseFilters): CustomerCase[] {
  return cases.filter((c) => {
    if (filters.caseType && c.caseType !== filters.caseType) return false;
    if (filters.priority && c.priority !== filters.priority) return false;
    if (filters.status && c.status !== filters.status) return false;
    if (filters.dateFrom && c.openedAt < filters.dateFrom) return false;
    if (filters.dateTo && c.openedAt > filters.dateTo + 'T23:59:59') return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!c.caseNumber.toLowerCase().includes(q) && !c.customerName.toLowerCase().includes(q) && !c.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function CaseListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'my' | 'unassigned' | 'escalated' | 'sla_breached' | 'all'>('my');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CaseFilters>(EMPTY_FILTERS);

  const { data: stats } = useCaseStats();
  const { data: myCases = [], isLoading: myLoading } = useMyCases();
  const { data: unassigned = [], isLoading: unassignedLoading } = useUnassignedCases();
  const { data: allCases = [], isLoading: allLoading } = useQuery({
    queryKey: ['cases', 'list'],
    queryFn: () => caseApi.getAll(),
  });
  const { data: escalated = [], isLoading: escalatedLoading } = useEscalatedCases();
  const { data: slaBreached = [], isLoading: slaLoading } = useQuery({
    queryKey: ['cases', 'sla-breached'],
    queryFn: () => caseApi.getSlaBreached(),
  });

  const rawData = {
    my: myCases,
    unassigned,
    escalated,
    sla_breached: slaBreached,
    all: allCases,
  };

  const loading = {
    my: myLoading,
    unassigned: unassignedLoading,
    escalated: escalatedLoading,
    sla_breached: slaLoading,
    all: allLoading,
  };

  const currentRaw = rawData[activeTab];
  const currentData = hasActiveFilters(filters) ? applyFilters(currentRaw, filters) : currentRaw;

  const tabs: { key: typeof activeTab; label: string; badge?: number }[] = [
    { key: 'my', label: 'My Cases', badge: myCases.length },
    { key: 'unassigned', label: 'Unassigned', badge: unassigned.length },
    { key: 'escalated', label: 'Escalated', badge: escalated.length },
    { key: 'sla_breached', label: 'SLA Breached', badge: slaBreached.length },
    { key: 'all', label: 'All Cases' },
  ];

  const setFilter = (key: keyof CaseFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const statCards = [
    { label: 'Open Cases', value: stats?.openCases ?? '—' },
    { label: 'SLA Breached', value: stats?.slaBreached ?? '—', danger: (stats?.slaBreached ?? 0) > 0 },
    { label: 'Resolved Today', value: stats?.resolvedToday ?? '—' },
    { label: 'Avg Resolution', value: stats ? `${stats.avgResolutionHours.toFixed(1)}h` : '—' },
  ];

  return (
    <>
      <PageHeader
        title="Case Management"
        subtitle="Create, track and resolve customer cases"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/cases/rca-dashboard')}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted"
            >
              <BarChart2 className="w-4 h-4" /> RCA Dashboard
            </button>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted ${showFilters ? 'border-primary text-primary' : ''}`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters(filters) && (
                <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {Object.values(filters).filter((v) => v !== '').length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/cases/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> New Case
            </button>
          </div>
        }
      />
      <div className="page-container space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border bg-card p-4 ${stat.danger ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10' : ''}`}
            >
              <div className={`text-xs font-medium mb-1 ${stat.danger ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{stat.label}</div>
              <div className={`text-2xl font-semibold font-mono ${stat.danger ? 'text-red-600 dark:text-red-400' : ''}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Filter Cases</p>
              {hasActiveFilters(filters) && (
                <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Search</label>
                <input
                  value={filters.search}
                  onChange={(e) => setFilter('search', e.target.value)}
                  placeholder="Case #, customer, subject"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                <select value={filters.caseType} onChange={(e) => setFilter('caseType', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                  <option value="">All types</option>
                  <option value="COMPLAINT">Complaint</option>
                  <option value="SERVICE_REQUEST">Service Request</option>
                  <option value="INQUIRY">Inquiry</option>
                  <option value="DISPUTE">Dispute</option>
                  <option value="FRAUD_REPORT">Fraud Report</option>
                  <option value="ACCOUNT_ISSUE">Account Issue</option>
                  <option value="PAYMENT_ISSUE">Payment Issue</option>
                  <option value="CARD_ISSUE">Card Issue</option>
                  <option value="LOAN_ISSUE">Loan Issue</option>
                  <option value="FEE_REVERSAL">Fee Reversal</option>
                  <option value="DOCUMENT_REQUEST">Document Request</option>
                  <option value="PRODUCT_CHANGE">Product Change</option>
                  <option value="CLOSURE">Closure</option>
                  <option value="REGULATORY">Regulatory</option>
                  <option value="ESCALATION">Escalation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
                <select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                  <option value="">All priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                  <option value="">All statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ESCALATED">Escalated</option>
                  <option value="PENDING_CUSTOMER">Pending Customer</option>
                  <option value="PENDING_INTERNAL">Pending Internal</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                  <option value="REOPENED">Reopened</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
                <input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
                <input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? tab.key === 'sla_breached'
                    ? 'border-red-500 text-red-600 dark:text-red-400'
                    : 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  tab.key === 'sla_breached'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <CaseTable
          data={currentData}
          isLoading={loading[activeTab]}
          onRowClick={(row) => navigate(`/cases/${row.caseNumber}`)}
        />
      </div>
    </>
  );
}
