import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, RefreshCw, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { providerApi } from '../api/providerApi';
import type { ServiceProvider, ProviderHealthLog, SlaRecord, CostRecord } from '../api/providerApi';
import { ProviderHealthGrid } from '../components/providers/ProviderHealthGrid';
import { ProviderTable } from '../components/providers/ProviderTable';
import { HealthCheckChart } from '../components/providers/HealthCheckChart';
import { SlaScorecard } from '../components/providers/SlaScorecard';
import { SlaTrendChart } from '../components/providers/SlaTrendChart';
import { CostReportChart } from '../components/providers/CostReportChart';
import { CostComparisonTable } from '../components/providers/CostComparisonTable';
import { ProviderRegistrationForm } from '../components/providers/ProviderRegistrationForm';

type Tab = 'all' | 'health' | 'sla' | 'cost';

export function ServiceProviderPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('all');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);

  // Health log state
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [healthLogs, setHealthLogs] = useState<ProviderHealthLog[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);

  // SLA state
  const [slaRecords, setSlaRecords] = useState<SlaRecord[]>([]);
  const [slaSelectedProvider, setSlaSelectedProvider] = useState<string>('');
  const [slaLoading, setSlaLoading] = useState(false);

  // Cost state
  const [costRecords, setCostRecords] = useState<CostRecord[]>([]);
  const [costLoading, setCostLoading] = useState(false);

  // Registration dialog
  const [showRegister, setShowRegister] = useState(false);

  // Load providers
  useEffect(() => {
    setLoading(true);
    providerApi.getProviders().then(data => {
      setProviders(data);
      if (data.length > 0) setSelectedProviderId(data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  // Load health logs when tab/provider changes
  useEffect(() => {
    if (tab === 'health' && selectedProviderId) {
      setHealthLoading(true);
      providerApi.getHealthLog(selectedProviderId, 30)
        .then(setHealthLogs)
        .finally(() => setHealthLoading(false));
    }
  }, [tab, selectedProviderId]);

  // Load SLA records when tab changes
  useEffect(() => {
    if (tab === 'sla') {
      setSlaLoading(true);
      providerApi.getSlaRecords(slaSelectedProvider ? { providerId: slaSelectedProvider } : undefined)
        .then(setSlaRecords)
        .finally(() => setSlaLoading(false));
    }
  }, [tab, slaSelectedProvider]);

  // Load cost records when tab changes
  useEffect(() => {
    if (tab === 'cost') {
      setCostLoading(true);
      providerApi.getCostRecords()
        .then(setCostRecords)
        .finally(() => setCostLoading(false));
    }
  }, [tab]);

  const handleRegister = async (data: Parameters<typeof providerApi.registerProvider>[0]) => {
    await providerApi.registerProvider(data);
    const refreshed = await providerApi.getProviders();
    setProviders(refreshed);
    setShowRegister(false);
  };

  const selectedProvider = providers.find(p => p.id === selectedProviderId);
  const slaProvider = providers.find(p => p.id === slaSelectedProvider);

  // For cost chart — unique providers in records
  const costProviders = Array.from(
    new Map(costRecords.map(r => [r.providerId, { id: r.providerId, name: r.providerName }])).values()
  );

  // Filter SLA records for trend chart (all if no filter, else for one provider group by month)
  const slaForTrend = slaSelectedProvider
    ? slaRecords.filter(r => r.provider === slaSelectedProvider)
    : (() => {
        // Average across providers per month
        const byMonth = new Map<string, SlaRecord[]>();
        slaRecords.forEach(r => {
          if (!byMonth.has(r.month)) byMonth.set(r.month, []);
          byMonth.get(r.month)!.push(r);
        });
        return Array.from(byMonth.entries()).map(([month, records]) => ({
          month,
          provider: 'all',
          providerName: 'All Providers',
          slaUptimeTarget: 99.9,
          actualUptime: records.reduce((s, r) => s + r.actualUptime, 0) / records.length,
          slaResponseTarget: 300,
          actualResponse: records.reduce((s, r) => s + r.actualResponse, 0) / records.length,
          uptimeMet: records.every(r => r.uptimeMet),
          responseMet: records.every(r => r.responseMet),
        }));
      })();

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All Providers' },
    { id: 'health', label: 'Health Log' },
    { id: 'sla', label: 'SLA Report' },
    { id: 'cost', label: 'Cost Report' },
  ];

  return (
    <>
      <PageHeader
        title="Service Providers"
        subtitle="Monitor and manage external API integrations, SLA compliance, and cost tracking"
        actions={
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Provider
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Health Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Provider Health Overview
              </h2>
              <button
                onClick={() => providerApi.getProviders().then(setProviders)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
            <ProviderHealthGrid
              providers={providers}
              onProviderClick={id => navigate(`/admin/providers/${id}`)}
            />
          </div>
        )}

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

          {/* All Providers tab */}
          {tab === 'all' && (
            <div className="bg-card rounded-lg border border-border">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ProviderTable
                  providers={providers}
                  onRowClick={id => navigate(`/admin/providers/${id}`)}
                />
              )}
            </div>
          )}

          {/* Health Log tab */}
          {tab === 'health' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Provider</label>
                <select
                  value={selectedProviderId}
                  onChange={e => setSelectedProviderId(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-48"
                >
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-sm font-semibold mb-4">
                  30-Day Health Trend — {selectedProvider?.name}
                </h3>
                {healthLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <HealthCheckChart
                    logs={healthLogs}
                    slaUptime={99.9}
                    slaResponse={selectedProvider?.type === 'PAYMENT_SWITCH' ? 150 : 300}
                  />
                )}
              </div>
            </div>
          )}

          {/* SLA Report tab */}
          {tab === 'sla' && (
            <div className="space-y-6">
              {/* Provider filter */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Filter by Provider</label>
                <select
                  value={slaSelectedProvider}
                  onChange={e => setSlaSelectedProvider(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-48"
                >
                  <option value="">All Providers</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {slaLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Trend chart */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-sm font-semibold mb-4">
                      SLA Compliance Trend — {slaProvider?.name ?? 'All Providers'}
                    </h3>
                    <SlaTrendChart
                      records={slaForTrend}
                      slaTarget={99.9}
                    />
                  </div>

                  {/* Scorecard */}
                  <div className="bg-card rounded-lg border border-border">
                    <div className="px-6 py-4 border-b border-border">
                      <h3 className="text-sm font-semibold">Monthly SLA Scorecard</h3>
                    </div>
                    <SlaScorecard records={slaRecords} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Cost Report tab */}
          {tab === 'cost' && (
            <div className="space-y-6">
              {costLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Cost chart */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-sm font-semibold mb-4">Monthly Cost by Provider</h3>
                    <CostReportChart records={costRecords} providers={costProviders} />
                  </div>

                  {/* Cost comparison table */}
                  <div className="bg-card rounded-lg border border-border">
                    <div className="px-6 py-4 border-b border-border">
                      <h3 className="text-sm font-semibold">Cost Comparison (Latest Month)</h3>
                    </div>
                    <CostComparisonTable records={costRecords} />
                  </div>

                  {/* Cost optimization */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-sm font-semibold mb-3">Cost Optimization Suggestions</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">•</span>
                        Consider consolidating SMS and Push notification spend under a single multi-channel vendor to unlock volume discounts.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">•</span>
                        MTN USSD is over budget by {'>'}16%. Review usage patterns and negotiate a flat-rate plan with MTN for high-volume months.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">•</span>
                        SendGrid Email is using less than 85% of the monthly budget — consider downgrading the plan tier.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        NIBSS NIP payment volumes are within budget. Current per-call pricing is competitive.
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      {showRegister && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowRegister(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
                <h2 className="text-lg font-semibold">Register New Service Provider</h2>
                <button onClick={() => setShowRegister(false)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <ProviderRegistrationForm
                  onSubmit={handleRegister}
                  onCancel={() => setShowRegister(false)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
