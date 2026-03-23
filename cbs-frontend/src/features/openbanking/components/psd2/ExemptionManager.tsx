import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Coins,
  UserCheck,
  RefreshCw,
  BarChart3,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ExemptionConfig {
  id: string;
  name: string;
  description: string;
  rtsArticle: string;
  icon: LucideIcon;
  enabled: boolean;
  threshold?: string;
  thresholdLabel?: string;
  thresholdUnit?: string;
  usageCount: number;
  usageRate: number; // percentage of transactions using this exemption
}

const DEFAULT_EXEMPTIONS: ExemptionConfig[] = [
  {
    id: 'low-value',
    name: 'Low-Value Transactions',
    description:
      'Exempt contactless or remote electronic payments below the threshold amount. Cumulative limit and transaction count triggers re-authentication.',
    rtsArticle: 'RTS Art. 16',
    icon: Coins,
    enabled: true,
    threshold: '30',
    thresholdLabel: 'Maximum amount',
    thresholdUnit: 'EUR',
    usageCount: 12_450,
    usageRate: 34.2,
  },
  {
    id: 'trusted-beneficiary',
    name: 'Trusted Beneficiary',
    description:
      'Payments to beneficiaries previously added by the payer to a trusted list maintained by the ASPSP. SCA applied when adding beneficiary.',
    rtsArticle: 'RTS Art. 13',
    icon: UserCheck,
    enabled: true,
    threshold: '',
    thresholdLabel: '',
    thresholdUnit: '',
    usageCount: 3_280,
    usageRate: 9.0,
  },
  {
    id: 'recurring-payment',
    name: 'Recurring Payments',
    description:
      'Recurring payments with the same amount and payee. SCA required for the first transaction and when the payer modifies the recurring payment.',
    rtsArticle: 'RTS Art. 14',
    icon: RefreshCw,
    enabled: true,
    threshold: '',
    thresholdLabel: '',
    thresholdUnit: '',
    usageCount: 8_670,
    usageRate: 23.8,
  },
  {
    id: 'risk-analysis',
    name: 'Transaction Risk Analysis (TRA)',
    description:
      'Real-time risk assessment based on transaction patterns, device profiling, and behavioral analytics. Fraud rate must remain below regulatory thresholds.',
    rtsArticle: 'RTS Art. 18',
    icon: BarChart3,
    enabled: false,
    threshold: '500',
    thresholdLabel: 'Maximum amount',
    thresholdUnit: 'EUR',
    usageCount: 0,
    usageRate: 0,
  },
];

const inputCls =
  'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

export function ExemptionManager() {
  const [exemptions, setExemptions] = useState(DEFAULT_EXEMPTIONS);
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleExemption = (id: string) => {
    setExemptions((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, enabled: !ex.enabled } : ex)),
    );
  };

  const updateThreshold = (id: string, value: string) => {
    setExemptions((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, threshold: value } : ex)),
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">SCA Exemptions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure exemptions to Strong Customer Authentication under PSD2 RTS
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-center">
              <div className="text-lg font-bold tabular-nums">
                {exemptions.filter((e) => e.enabled).length}
              </div>
              <div className="text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold tabular-nums">
                {exemptions.reduce((acc, e) => acc + e.usageCount, 0).toLocaleString()}
              </div>
              <div className="text-muted-foreground">Total Uses</div>
            </div>
          </div>
        </div>
      </div>

      {/* Exemption Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exemptions.map((exemption) => {
          const Icon = exemption.icon;
          const isEditing = editingId === exemption.id;

          return (
            <div
              key={exemption.id}
              className={cn(
                'surface-card overflow-hidden transition-colors',
                !exemption.enabled && 'opacity-60',
              )}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        exemption.enabled
                          ? 'bg-primary/10'
                          : 'bg-muted',
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-5 h-5',
                          exemption.enabled ? 'text-primary' : 'text-muted-foreground',
                        )}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{exemption.name}</h4>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {exemption.rtsArticle}
                      </span>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleExemption(exemption.id)}
                    className={cn(
                      'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
                      exemption.enabled ? 'bg-primary' : 'bg-muted-foreground/30',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                        exemption.enabled ? 'translate-x-5' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {exemption.description}
                </p>

                {/* Threshold config */}
                {exemption.thresholdLabel && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {exemption.thresholdLabel}
                      </label>
                      {!isEditing && (
                        <button
                          onClick={() => setEditingId(exemption.id)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <Settings className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            className={inputCls}
                            value={exemption.threshold}
                            onChange={(e) => updateThreshold(exemption.id, e.target.value)}
                          />
                          {exemption.thresholdUnit && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              {exemption.thresholdUnit}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold tabular-nums">
                        {exemption.threshold ? `${exemption.thresholdUnit} ${exemption.threshold}` : '—'}
                      </div>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 pt-3 border-t">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Uses: </span>
                    <span className="font-semibold tabular-nums">
                      {exemption.usageCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Rate: </span>
                    <span className="font-semibold tabular-nums">{exemption.usageRate}%</span>
                  </div>
                  {exemption.enabled && (
                    <div className="flex-1">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full"
                          style={{ width: `${Math.min(exemption.usageRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
