import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { providerApi } from '../api/providerApi';
import type { ServiceProvider, ProviderHealthLog, ProviderTransaction, SlaRecord, CostRecord } from '../api/providerApi';
import { ProviderDetailCard } from '../components/providers/ProviderDetailCard';
import { HealthCheckChart } from '../components/providers/HealthCheckChart';
import { TransactionLogTable } from '../components/providers/TransactionLogTable';
import { SlaScorecard } from '../components/providers/SlaScorecard';
import { CostComparisonTable } from '../components/providers/CostComparisonTable';
import { FailoverConfigForm } from '../components/providers/FailoverConfigForm';

type Tab = 'health' | 'transactions' | 'sla' | 'costs' | 'failover';

const STATUS_BADGE: Record<string, string> = {
  HEALTHY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DEGRADED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DOWN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MAINTENANCE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('health');

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [allProviders, setAllProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const [healthLogs, setHealthLogs] = useState<ProviderHealthLog[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);

  const [transactions, setTransactions] = useState<ProviderTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const [slaRecords, setSlaRecords] = useState<SlaRecord[]>([]);
  const [slaLoading, setSlaLoading] = useState(false);

  const [costRecords, setCostRecords] = useState<CostRecord[]>([]);
  const [costLoading, setCostLoading] = useState(false);

  // Load provider + all providers
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      providerApi.getProviderById(id),
      providerApi.getProviders(),
    ]).then(([p, all]) => {
      setProvider(p);
      setAllProviders(all);
    }).finally(() => setLoading(false));
  }, [id]);

  // Load health logs on mount and when health tab selected
  useEffect(() => {
    if (!id) return;
    setHealthLoading(true);
    providerApi.getHealthLog(id, 30)
      .then(setHealthLogs)
      .finally(() => setHealthLoading(false));
  }, [id]);

  // Load transactions when tab selected
  useEffect(() => {
    if (tab === 'transactions' && id) {
      setTxLoading(true);
      providerApi.getTransactionLog(id, { limit: 50 })
        .then(setTransactions)
        .finally(() => setTxLoading(false));
    }
  }, [tab, id]);

  // Load SLA when tab selected
  useEffect(() => {
    if (tab === 'sla' && id) {
      setSlaLoading(true);
      providerApi.getSlaRecords(id)
        .then(setSlaRecords)
        .finally(() => setSlaLoading(false));
    }
  }, [tab, id]);

  // Load cost when tab selected
  useEffect(() => {
    if (tab === 'costs' && id) {
      setCostLoading(true);
      providerApi.getCostRecords(id)
        .then(setCostRecords)
        .finally(() => setCostLoading(false));
    }
  }, [tab, id]);

  const handleHealthCheck = async () => {
    if (!id) return;
    const updated = await providerApi.healthCheckNow(id);
    setProvider(updated);
  };

  const handleFailover = async () => {
    if (!id) return;
    await providerApi.triggerFailover(id);
  };

  const handleSuspend = async () => {
    if (!id) return;
    const updated = await providerApi.suspendProvider(id);
    setProvider(updated);
  };

  const handleDecommission = async () => {
    if (!id) return;
    // In demo: same as suspend
    const updated = await providerApi.suspendProvider(id);
    setProvider(updated);
  };

  const handleSaveFailover = async (config: Parameters<typeof providerApi.saveFailoverConfig>[1]) => {
    if (!id) return;
    const updated = await providerApi.saveFailoverConfig(id, config);
    setProvider(updated);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'health', label: 'Health Chart' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'sla', label: 'SLA' },
    { id: 'costs', label: 'Costs' },
    { id: 'failover', label: 'Failover' },
  ];

  if (loading) {
    return (
      <>
        <PageHeader title="Service Provider" backTo="/admin/providers" />
        <div className="page-container flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!provider) {
    return (
      <>
        <PageHeader title="Provider Not Found" backTo="/admin/providers" />
        <div className="page-container">
          <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
            The requested service provider could not be found.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={provider.name}
        backTo="/admin/providers"
        actions={
          <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', STATUS_BADGE[provider.status])}>
            {provider.status}
          </span>
        }
      />

      <div className="page-container space-y-6">
        {/* Detail Card */}
        <div className="bg-card rounded-lg border border-border p-6">
          <ProviderDetailCard
            provider={provider}
            onHealthCheck={handleHealthCheck}
            onFailover={handleFailover}
            onSuspend={handleSuspend}
            onDecommission={handleDecommission}
          />
        </div>

        {/* Tabs */}
        <div>
          <div className="border-b border-border mb-6">
            <nav className="-mb-px flex gap-6">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'py-2 text-sm font-medium transition-colors whitespace-nowrap',
                    tab === t.id
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Health Chart tab */}
          {tab === 'health' && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-sm font-semibold mb-4">30-Day Health Trend</h3>
              {healthLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <HealthCheckChart
                  logs={healthLogs}
                  slaUptime={99.9}
                  slaResponse={provider.type === 'PAYMENT_SWITCH' ? 150 : 300}
                />
              )}
            </div>
          )}

          {/* Transactions tab */}
          {tab === 'transactions' && (
            <div className="bg-card rounded-lg border border-border">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold">Recent Transactions (last 50)</h3>
                <span className="text-xs text-muted-foreground">{transactions.length} records</span>
              </div>
              {txLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <TransactionLogTable transactions={transactions} pageSize={20} />
              )}
            </div>
          )}

          {/* SLA tab */}
          {tab === 'sla' && (
            <div className="bg-card rounded-lg border border-border">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">SLA Scorecard — {provider.name}</h3>
              </div>
              {slaLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <SlaScorecard records={slaRecords} />
              )}
            </div>
          )}

          {/* Costs tab */}
          {tab === 'costs' && (
            <div className="bg-card rounded-lg border border-border">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-semibold">Cost History — {provider.name}</h3>
              </div>
              {costLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <CostComparisonTable records={costRecords} />
              )}
            </div>
          )}

          {/* Failover tab */}
          {tab === 'failover' && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-sm font-semibold mb-6">Failover Configuration</h3>
              <FailoverConfigForm
                provider={provider}
                allProviders={allProviders}
                onSave={handleSaveFailover}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
