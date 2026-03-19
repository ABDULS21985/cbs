import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import type { ServiceProvider, ProviderFailoverConfig } from '../../api/providerApi';

interface FailoverConfigFormProps {
  provider: ServiceProvider;
  allProviders: ServiceProvider[];
  onSave: (config: ProviderFailoverConfig) => Promise<void>;
}

export function FailoverConfigForm({ provider, allProviders, onSave }: FailoverConfigFormProps) {
  const [failoverProviderId, setFailoverProviderId] = useState(provider.failoverProviderId ?? 0);
  const [autoFailover, setAutoFailover] = useState(false);
  const [maxRetries, setMaxRetries] = useState(3);
  const [saving, setSaving] = useState(false);

  const otherProviders = allProviders.filter(p => p.id !== provider.id && p.status === 'ACTIVE');

  const handleSave = async () => {
    setSaving(true);
    try { await onSave({ failoverProviderId, autoFailover, maxRetries }); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Failover Provider</label>
        <select value={failoverProviderId} onChange={e => setFailoverProviderId(Number(e.target.value))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value={0}>— None —</option>
          {otherProviders.map(p => (<option key={p.id} value={p.id}>{p.providerName} ({p.providerCode})</option>))}
        </select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={autoFailover} onChange={e => setAutoFailover(e.target.checked)} className="rounded" />
        <span className="text-sm font-medium">Enable Auto-Failover</span>
      </label>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Max Retries</label>
        <input type="number" min={1} max={10} value={maxRetries} onChange={e => setMaxRetries(Number(e.target.value))}
          className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>
      <div className="rounded-lg bg-muted/50 border p-4 text-sm space-y-1">
        <p>Primary: <strong>{provider.providerName}</strong></p>
        <p>Failover: <strong>{otherProviders.find(p => p.id === failoverProviderId)?.providerName || 'Not configured'}</strong></p>
        <p>Auto: <strong>{autoFailover ? 'Yes' : 'No'}</strong> · Retries: <strong>{maxRetries}</strong></p>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Configuration
      </button>
    </div>
  );
}
