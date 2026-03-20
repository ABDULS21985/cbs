import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Users, Wallet, Briefcase, UserCheck, Plus, Loader2, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { wealthApi, type WealthManagementPlan, type WealthAdvisor } from '../api/wealthApi';

// ─── Create Mandate Dialog ───────────────────────────────────────────────────

function CreateMandateDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    customerId: '',
    planType: 'COMPREHENSIVE' as string,
    advisorId: '',
  });

  const createMutation = useMutation({
    mutationFn: () =>
      wealthApi.create({
        customerId: Number(form.customerId),
        planType: form.planType,
        advisorId: form.advisorId || null,
      }),
    onSuccess: () => {
      toast.success('Client mandate created successfully');
      queryClient.invalidateQueries({ queryKey: ['wealth-plans'] });
      onClose();
    },
    onError: () => toast.error('Failed to create mandate'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">New Client Mandate</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
            <input
              type="number"
              className="w-full mt-1 input"
              placeholder="e.g. 1001"
              value={form.customerId}
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
              required
              min={1}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Plan Type</label>
            <select
              value={form.planType}
              onChange={(e) => setForm((f) => ({ ...f, planType: e.target.value }))}
              className="w-full mt-1 input"
            >
              <option value="COMPREHENSIVE">Comprehensive</option>
              <option value="RETIREMENT">Retirement</option>
              <option value="TAX">Tax</option>
              <option value="ESTATE">Estate</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Advisor ID</label>
            <input
              className="w-full mt-1 input"
              placeholder="e.g. ADV-001"
              value={form.advisorId}
              onChange={(e) => setForm((f) => ({ ...f, advisorId: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Creating...</> : 'Create Mandate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Advisor Card ────────────────────────────────────────────────────────────

function AdvisorCard({ advisor, onClick }: { advisor: WealthAdvisor; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card p-5 text-left hover:shadow-md transition-shadow w-full">
      <p className="font-semibold font-mono text-sm">{advisor.advisorId}</p>
      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Active Clients</p>
          <p className="font-semibold text-lg">{advisor.activeClients}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Plans</p>
          <p className="font-semibold text-lg">{advisor.totalPlans}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function WealthManagementPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [advisorFilter, setAdvisorFilter] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Wealth Management';
  }, []);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['wealth-plans'],
    queryFn: wealthApi.listAll,
  });

  const { data: advisors = [], isLoading: advisorsLoading } = useQuery({
    queryKey: ['wealth-advisors'],
    queryFn: wealthApi.listAdvisors,
  });

  const filteredPlans = useMemo(
    () => (advisorFilter ? plans.filter((p) => p.advisorId === advisorFilter) : plans),
    [plans, advisorFilter],
  );

  const totalClients = useMemo(() => new Set(plans.map((p) => p.customerId)).size, [plans]);
  const totalAum = useMemo(() => plans.reduce((s, p) => s + (p.totalInvestableAssets ?? 0), 0), [plans]);
  const activeMandates = useMemo(() => plans.filter((p) => p.status === 'ACTIVE').length, [plans]);
  const uniqueAdvisors = useMemo(() => new Set(plans.map((p) => p.advisorId).filter(Boolean)).size, [plans]);

  const columns = useMemo<ColumnDef<WealthManagementPlan, unknown>[]>(
    () => [
      {
        accessorKey: 'planCode',
        header: 'Plan Code',
        cell: ({ getValue }) => <span className="font-mono text-primary cursor-pointer hover:underline">{getValue<string>()}</span>,
      },
      { accessorKey: 'customerId', header: 'Customer ID' },
      { accessorKey: 'advisorId', header: 'Advisor', cell: ({ getValue }) => getValue<string>() || '—' },
      {
        accessorKey: 'planType',
        header: 'Plan Type',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: 'totalInvestableAssets',
        header: 'Investable Assets',
        cell: ({ getValue }) => <span className="font-mono">{formatMoney(getValue<number>() ?? 0)}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
    ],
    [],
  );

  const tabs = [
    {
      id: 'mandates',
      label: 'Client Mandates',
      badge: filteredPlans.length || undefined,
      content: (
        <div className="p-4">
          {advisorFilter && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Filtered by advisor:</span>
              <span className="font-mono font-medium">{advisorFilter}</span>
              <button onClick={() => setAdvisorFilter(null)} className="ml-1 text-xs text-primary hover:underline">Clear</button>
            </div>
          )}
          <DataTable
            columns={columns}
            data={filteredPlans}
            isLoading={plansLoading}
            enableGlobalFilter
            onRowClick={(row) => navigate(`/investments/wealth/${row.planCode}`)}
            emptyMessage="No client mandates found"
          />
        </div>
      ),
    },
    {
      id: 'advisors',
      label: 'Advisors',
      badge: advisors.length || undefined,
      content: (
        <div className="p-4">
          {advisorsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : advisors.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No advisors found</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {advisors.map((a) => (
                <AdvisorCard key={a.advisorId} advisor={a} onClick={() => setAdvisorFilter(a.advisorId)} />
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'performance',
      label: 'Performance',
      content: (
        <div className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Portfolio Performance Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Plans</p>
              <p className="text-2xl font-semibold mt-1">{plans.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Investable Assets</p>
              <p className="text-2xl font-semibold mt-1 font-mono">
                {formatMoney(plans.length > 0 ? totalAum / plans.length : 0)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Rate</p>
              <p className="text-2xl font-semibold mt-1">
                {plans.length > 0 ? ((activeMandates / plans.length) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      {showCreate && <CreateMandateDialog onClose={() => setShowCreate(false)} />}

      <PageHeader
        title="Wealth Management"
        subtitle="Client mandates, advisory assignments and portfolio performance"
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 btn-primary">
            <Plus className="w-4 h-4" />
            New Client Mandate
          </button>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Clients" value={totalClients} format="number" icon={Users} loading={plansLoading} />
          <StatCard label="Assets Under Management" value={totalAum} format="money" compact icon={Wallet} loading={plansLoading} />
          <StatCard label="Active Mandates" value={activeMandates} format="number" icon={Briefcase} loading={plansLoading} />
          <StatCard label="Advisors" value={uniqueAdvisors} format="number" icon={UserCheck} loading={plansLoading} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
