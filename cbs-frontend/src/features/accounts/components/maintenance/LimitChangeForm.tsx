import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { MoneyInput } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { accountMaintenanceApi } from '../../api/accountMaintenanceApi';

interface LimitConfig {
  key: string;
  label: string;
  description: string;
  limitType: string;
}

const LIMIT_CONFIGS: LimitConfig[] = [
  {
    key: 'dailyTransaction',
    label: 'Daily Transaction Limit',
    description: 'Maximum total amount that can be transacted in a single day',
    limitType: 'DAILY_TRANSACTION',
  },
  {
    key: 'perTransaction',
    label: 'Per-Transaction Limit',
    description: 'Maximum amount allowed per individual transaction',
    limitType: 'PER_TRANSACTION',
  },
  {
    key: 'withdrawal',
    label: 'Withdrawal Limit',
    description: 'Maximum cash withdrawal amount per day',
    limitType: 'WITHDRAWAL',
  },
  {
    key: 'posAtm',
    label: 'POS / ATM Limit',
    description: 'Combined daily limit for POS and ATM transactions',
    limitType: 'POS_ATM',
  },
  {
    key: 'onlineTransaction',
    label: 'Online Transaction Limit',
    description: 'Maximum amount for internet and mobile banking transactions',
    limitType: 'ONLINE_TRANSACTION',
  },
];

interface LimitRow {
  newValue: number;
  reason: string;
  submitting: boolean;
  success: boolean;
}

type LimitState = Record<string, LimitRow>;

interface LimitChangeFormProps {
  accountId: string;
  currentLimits: {
    dailyTransaction: number;
    perTransaction: number;
    withdrawal: number;
    posAtm: number;
    onlineTransaction: number;
  };
  onSuccess: () => void;
}

export function LimitChangeForm({ accountId, currentLimits, onSuccess }: LimitChangeFormProps) {
  const [limits, setLimits] = useState<LimitState>(() =>
    Object.fromEntries(
      LIMIT_CONFIGS.map((c) => [
        c.key,
        {
          newValue: currentLimits[c.key as keyof typeof currentLimits] || 0,
          reason: '',
          submitting: false,
          success: false,
        },
      ])
    )
  );

  const [errors, setErrors] = useState<Record<string, { value?: string; reason?: string }>>({});

  const updateLimit = (key: string, field: 'newValue' | 'reason', value: number | string) => {
    setLimits((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value, success: false } }));
    setErrors((prev) => ({ ...prev, [key]: { ...prev[key], [field === 'newValue' ? 'value' : 'reason']: undefined } }));
  };

  const handleSingleSubmit = async (config: LimitConfig) => {
    const row = limits[config.key];
    const fieldErrors: { value?: string; reason?: string } = {};
    if (!row.reason.trim()) fieldErrors.reason = 'Reason is required';
    if (row.newValue <= 0) fieldErrors.value = 'Limit must be greater than zero';
    if (Object.keys(fieldErrors).length > 0) {
      setErrors((prev) => ({ ...prev, [config.key]: fieldErrors }));
      return;
    }
    setErrors((prev) => ({ ...prev, [config.key]: {} }));
    setLimits((prev) => ({ ...prev, [config.key]: { ...prev[config.key], submitting: true, success: false } }));
    try {
      await accountMaintenanceApi.changeTransactionLimit(accountId, {
        limitType: config.limitType,
        newValue: row.newValue,
        reason: row.reason,
      });
      setLimits((prev) => ({ ...prev, [config.key]: { ...prev[config.key], submitting: false, success: true } }));
      toast.success(`${config.label} updated successfully`);
      onSuccess();
    } catch {
      setLimits((prev) => ({ ...prev, [config.key]: { ...prev[config.key], submitting: false } }));
      toast.error(`Failed to update ${config.label.toLowerCase()}`);
    }
  };

  return (
    <div className="space-y-4">
      {LIMIT_CONFIGS.map((config) => {
        const row = limits[config.key];
        const rowErrors = errors[config.key] || {};
        const currentValue = currentLimits[config.key as keyof typeof currentLimits] || 0;

        return (
          <div key={config.key} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold">{config.label}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
              </div>
              {row.success && (
                <div className="flex items-center gap-1 text-green-600 text-xs font-medium flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  Updated
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Current Limit</p>
                <div className="px-3 py-2 rounded-lg border bg-muted/30 text-sm font-mono font-medium">
                  {formatMoney(currentValue)}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">New Limit</p>
                <MoneyInput
                  value={row.newValue}
                  onChange={(v: number) => updateLimit(config.key, 'newValue', v)}
                  error={rowErrors.value}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                Reason <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={row.reason}
                onChange={(e) => updateLimit(config.key, 'reason', e.target.value)}
                placeholder="Reason for limit change…"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {rowErrors.reason && <p className="text-xs text-red-500 mt-1">{rowErrors.reason}</p>}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleSingleSubmit(config)}
                disabled={row.submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {row.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Apply Change
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
