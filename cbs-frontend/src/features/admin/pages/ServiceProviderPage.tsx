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
  useEffect(() => { document.title = 'Service Providers | CBS'; }, []);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('all');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProviderId, setSelectedProviderId] = useState<number>(0);
  const [healthLogs, setHealthLogs] = useState<ProviderHealthLog[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);

  const [slaRecords, setSlaRecords] = useState<SlaRecord[]>([]);
  const [slaLoading, setSlaLoading] = useState(false);

  const [costRecords, setCostRecords] = useState<CostRecord[]>([]);
  const [costLoading, setCostLoading] = useState(false);

  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    setLoading(true);
    providerApi.getProviders().then(data => {
      setProviders(data);
      if (data.length > 0) setSelectedProviderId(data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'health' && selectedProviderId) {
      setHealthLoading(true);
      providerApi.getHealthLogs(selectedProviderId)
        .then(setHealthLogs)
        .finally(() => setHealthLoading(false));
    }
  }, [tab, selectedProviderId]);

  useEffect(() => {
    if (tab === 'sla') {
      setSlaLoading(true);
      providerApi.getSlaRecords()
        .then(setSlaRecords)
        .finally(() => setSlaLoading(false));
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'cost') {
      setCostLoading(true);
      providerApi.getCostRecords()
        .then(setCostRecords)
        .finally(() => setCostLoading(false));
    }
  }, [tab]);

  const handleRegister = async (data: Partial<ServiceProvider>) => {
    await providerApi.registerProvider(data);
    const refreshed = await providerApi.getProviders();
    setProviders(refreshed);
    setShowRegister(false);
  };

  const selectedProvider = providers.find(p => p.id === selectedProviderId);

  // SLA breach alerts
  const slaBreaches = slaRecords.filter(r => !r.slaMet);

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
          <button onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Register Provider
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Health Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Provider Health Overview</h2>
              <button onClick={() => providerApi.getProviders().then(setProviders)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
            <ProviderHealthGrid providers={providers} onProviderClick={id => navigate(`/admin/providers/${id}`)} />
          </div>
        )}

        {/* Tabs */}
        <div>
          <div className="border-b border-border mb-6">
            <nav className="-mb-px flex gap-6">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn('py-2 text-sm font-medium transition-colors whitespace-nowrap',
                    tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {tab === 'all' && (
            <div className="bg-card rounded-lg border border-border">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <ProviderTable providers={providers} onRowClick={id => navigate(`/admin/providers/${id}`)} />
              )}
            </div>
          )}

          {tab === 'health' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Provider</label>
                <select value={selectedProviderId} onChange={e => setSelectedProviderId(Number(e.target.value))}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-48">
                  {providers.map(p => (<option key={p.id} value={p.id}>{p.providerName}</option>))}
                </select>
              </div>
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-sm font-semibold mb-4">Health Trend — {selectedProvider?.providerName}</h3>
                {healthLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <HealthCheckChart logs={healthLogs} slaUptime={99.9}
                    slaResponse={selectedProvider?.slaResponseTimeMs ?? 300} />
                )}
              </div>
            </div>
          )}

          {tab === 'sla' && (
            <div className="space-y-6">
              {slaLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {/* Breach alerts */}
                  {slaBreaches.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 p-4">
                      <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">SLA Breach Alerts ({slaBreaches.length})</h3>
                      <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
                        {slaBreaches.map(b => (
                          <li key={b.providerCode}>• <strong>{b.providerName}</strong> — Uptime: {Number(b.actualUptimePct ?? 0).toFixed(2)}% (target: {Number(b.slaUptimePct ?? 0).toFixed(2)}%), Response: {b.actualAvgResponseTimeMs}ms (target: {b.slaResponseTimeMs}ms)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-sm font-semibold mb-4">SLA Compliance by Provider</h3>
                    <SlaTrendChart records={slaRecords} slaTarget={99.9} />
                  </div>
                  <div className="bg-card rounded-lg border border-border">
                    <div className="px-6 py-4 border-b border-border"><h3 className="text-sm font-semibold">SLA Scorecard</h3></div>
                    <SlaScorecard records={slaRecords} />
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'cost' && (
            <div className="space-y-6">
              {costLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-sm font-semibold mb-4">Cost by Provider</h3>
                    <CostReportChart records={costRecords} />
                  </div>
                  <div className="bg-card rounded-lg border border-border">
                    <div className="px-6 py-4 border-b border-border"><h3 className="text-sm font-semibold">Cost Comparison</h3></div>
                    <CostComparisonTable records={costRecords} />
                  </div>
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-sm font-semibold mb-3">Cost Optimization</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {costRecords.filter(r => r.estimatedMonthlyCost > Number(r.monthlyCost ?? 0) * 1.15).map(r => (
                        <li key={r.providerCode} className="flex items-start gap-2">
                          <span className="text-amber-500 font-bold mt-0.5">•</span>
                          <strong>{r.providerName}</strong> estimated cost (₦{Number(r.estimatedMonthlyCost).toLocaleString()}) exceeds flat rate (₦{Number(r.monthlyCost ?? 0).toLocaleString()}). Consider renegotiating.
                        </li>
                      ))}
                      {costRecords.filter(r => r.monthlyVolumeLimit > 0 && r.currentMonthVolume < r.monthlyVolumeLimit * 0.3).map(r => (
                        <li key={`under-${r.providerCode}`} className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold mt-0.5">•</span>
                          <strong>{r.providerName}</strong> using only {Math.round((r.currentMonthVolume / r.monthlyVolumeLimit) * 100)}% of volume limit — consider downgrading plan.
                        </li>
                      ))}
                      {costRecords.length === 0 && <li>No cost data available for optimization analysis.</li>}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showRegister && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowRegister(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
                <h2 className="text-lg font-semibold">Register New Service Provider</h2>
                <button onClick={() => setShowRegister(false)} className="p-1.5 rounded-md hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6">
                <ProviderRegistrationForm onSubmit={handleRegister} onCancel={() => setShowRegister(false)} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
