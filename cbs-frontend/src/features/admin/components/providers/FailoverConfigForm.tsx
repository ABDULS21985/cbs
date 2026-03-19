import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceProvider } from '../../api/providerApi';

interface FailoverConfig {
  failoverProviderId: string;
  triggerCondition: string;
  monitoringWindow: string;
  autoFailover: boolean;
  notifyOnFailover: boolean;
}

interface FailoverConfigFormProps {
  provider: ServiceProvider;
  allProviders: ServiceProvider[];
  onSave: (config: FailoverConfig) => Promise<void>;
}

const TRIGGER_CONDITIONS = [
  { value: 'ERROR_RATE_5PCT', label: 'Error rate > 5% in monitoring window' },
  { value: 'TIMEOUT_RATE_10PCT', label: 'Timeout rate > 10% in monitoring window' },
  { value: 'LATENCY_5X_BASELINE', label: 'Average latency > 5x baseline' },
  { value: 'MANUAL', label: 'Manual only — no auto-trigger' },
];

const MONITORING_WINDOWS = [
  { value: '1min', label: '1 minute' },
  { value: '5min', label: '5 minutes' },
  { value: '15min', label: '15 minutes' },
];

export function FailoverConfigForm({ provider, allProviders, onSave }: FailoverConfigFormProps) {
  const [failoverProviderId, setFailoverProviderId] = useState(provider.failoverProviderId ?? '');
  const [triggerCondition, setTriggerCondition] = useState('ERROR_RATE_5PCT');
  const [monitoringWindow, setMonitoringWindow] = useState('5min');
  const [autoFailover, setAutoFailover] = useState(true);
  const [notifyOnFailover, setNotifyOnFailover] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const otherProviders = allProviders.filter(p => p.id !== provider.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ failoverProviderId, triggerCondition, monitoringWindow, autoFailover, notifyOnFailover });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Primary provider (read-only) */}
      <div className="bg-muted/40 rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-1">Primary Provider</p>
        <p className="font-semibold">{provider.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{provider.code} · {provider.type}</p>
      </div>

      {/* Failover provider */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Failover Provider
        </label>
        <select
          value={failoverProviderId}
          onChange={e => setFailoverProviderId(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">None — no automatic failover target</option>
          {otherProviders.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.type})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          Select which provider to route traffic to when this provider fails.
        </p>
      </div>

      {/* Trigger condition */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Trigger Condition
        </label>
        <select
          value={triggerCondition}
          onChange={e => setTriggerCondition(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {TRIGGER_CONDITIONS.map(tc => (
            <option key={tc.value} value={tc.value}>{tc.label}</option>
          ))}
        </select>
      </div>

      {/* Monitoring window */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Monitoring Window
        </label>
        <div className="flex gap-2">
          {MONITORING_WINDOWS.map(mw => (
            <button
              key={mw.value}
              type="button"
              onClick={() => setMonitoringWindow(mw.value)}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                monitoringWindow === mw.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted',
              )}
            >
              {mw.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          The time window over which the trigger condition is evaluated.
        </p>
      </div>

      {/* Auto-failover toggle */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={autoFailover}
          onClick={() => setAutoFailover(!autoFailover)}
          className={cn(
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50',
            autoFailover ? 'bg-primary' : 'bg-muted',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
              autoFailover ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </button>
        <div>
          <p className="text-sm font-medium">Auto-Failover</p>
          <p className="text-xs text-muted-foreground">
            Automatically route traffic to the failover provider when the trigger condition is met.
            If disabled, failover must be triggered manually.
          </p>
        </div>
      </div>

      {/* Notify on failover */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="notify"
          checked={notifyOnFailover}
          onChange={e => setNotifyOnFailover(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
        />
        <label htmlFor="notify">
          <p className="text-sm font-medium cursor-pointer">Notify on Failover</p>
          <p className="text-xs text-muted-foreground">
            Send a system alert to operations team when failover is triggered.
          </p>
        </label>
      </div>

      {/* Summary */}
      {failoverProviderId && triggerCondition !== 'MANUAL' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
          <p className="font-semibold mb-1">Configuration Summary</p>
          <p>
            If <strong>{TRIGGER_CONDITIONS.find(t => t.value === triggerCondition)?.label}</strong>{' '}
            within a <strong>{MONITORING_WINDOWS.find(w => w.value === monitoringWindow)?.label}</strong> window,
            {autoFailover ? ' automatically route' : ' alert operators to route'} traffic to{' '}
            <strong>{otherProviders.find(p => p.id === failoverProviderId)?.name}</strong>.
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Failover Config
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            Configuration saved successfully.
          </span>
        )}
      </div>
    </form>
  );
}
