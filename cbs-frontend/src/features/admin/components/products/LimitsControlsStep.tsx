import { cn } from '@/lib/utils';
import type { ProductLimits } from '../../api/productApi';

const ALL_CHANNELS = ['Branch', 'Mobile', 'Web', 'USSD', 'ATM', 'POS', 'Agent'] as const;

interface LimitsControlsStepProps {
  limits: ProductLimits;
  onChange: (limits: ProductLimits) => void;
  readOnly?: boolean;
}

const labelCls = 'block text-sm font-medium mb-1.5 text-foreground';
const inputCls = (readOnly?: boolean) =>
  cn(
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
    readOnly && 'bg-muted cursor-not-allowed',
  );

function MoneyField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">₦</span>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          readOnly={readOnly}
          className={cn(inputCls(readOnly), 'pl-7')}
        />
      </div>
      {!readOnly && value > 0 && (
        <p className="text-xs text-muted-foreground mt-1">{`₦${value.toLocaleString()}`}</p>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  readOnly,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
  unit?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          readOnly={readOnly}
          className={cn(inputCls(readOnly), unit ? 'pr-12' : '')}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4">{children}</h4>
);

export function LimitsControlsStep({ limits, onChange, readOnly }: LimitsControlsStepProps) {
  const update = <K extends keyof ProductLimits>(field: K, value: ProductLimits[K]) => {
    if (readOnly) return;
    onChange({ ...limits, [field]: value });
  };

  const toggleChannel = (channel: string) => {
    if (readOnly) return;
    const updated = limits.channels.includes(channel)
      ? limits.channels.filter((c) => c !== channel)
      : [...limits.channels, channel];
    onChange({ ...limits, channels: updated });
  };

  return (
    <div className="space-y-8">
      {/* Transaction Limits */}
      <div>
        <SectionTitle>Transaction Limits</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MoneyField
            label="Daily Debit Limit"
            value={limits.dailyDebitLimit}
            onChange={(v) => update('dailyDebitLimit', v)}
            readOnly={readOnly}
          />
          <MoneyField
            label="Daily Credit Limit"
            value={limits.dailyCreditLimit}
            onChange={(v) => update('dailyCreditLimit', v)}
            readOnly={readOnly}
          />
          <MoneyField
            label="Per-Transaction Limit"
            value={limits.perTransactionLimit}
            onChange={(v) => update('perTransactionLimit', v)}
            readOnly={readOnly}
          />
          <MoneyField
            label="ATM Withdrawal Limit"
            value={limits.atmLimit}
            onChange={(v) => update('atmLimit', v)}
            readOnly={readOnly}
          />
          <MoneyField
            label="POS Transaction Limit"
            value={limits.posLimit}
            onChange={(v) => update('posLimit', v)}
            readOnly={readOnly}
          />
          <MoneyField
            label="Online Transaction Limit"
            value={limits.onlineLimit}
            onChange={(v) => update('onlineLimit', v)}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Account Limits */}
      <div>
        <SectionTitle>Account Balance Limits</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MoneyField
            label="Maximum Balance"
            value={limits.maxBalance}
            onChange={(v) => update('maxBalance', v)}
            readOnly={readOnly}
          />
          <MoneyField
            label="Minimum Balance"
            value={limits.minimumBalance}
            onChange={(v) => update('minimumBalance', v)}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Overdraft */}
      <div>
        <SectionTitle>Overdraft Facility</SectionTitle>
        <div className="space-y-4">
          <label
            className={cn(
              'flex items-center gap-3 w-fit',
              readOnly ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            <div
              onClick={() => !readOnly && update('overdraftAllowed', !limits.overdraftAllowed)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                limits.overdraftAllowed ? 'bg-primary' : 'bg-muted-foreground/30',
                readOnly && 'pointer-events-none',
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                  limits.overdraftAllowed && 'translate-x-5',
                )}
              />
            </div>
            <span className="text-sm font-medium">Allow Overdraft</span>
          </label>

          {limits.overdraftAllowed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MoneyField
                label="Overdraft Limit"
                value={limits.overdraftLimit ?? 0}
                onChange={(v) => update('overdraftLimit', v)}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dormancy */}
      <div>
        <SectionTitle>Dormancy Settings</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Dormancy Threshold"
            value={limits.dormancyDays}
            onChange={(v) => update('dormancyDays', v)}
            readOnly={readOnly}
            unit="days"
          />
          <MoneyField
            label="Dormancy Fee (monthly)"
            value={limits.dormancyFee}
            onChange={(v) => update('dormancyFee', v)}
            readOnly={readOnly}
          />
        </div>
        {limits.dormancyDays === 0 && !readOnly && (
          <p className="text-xs text-muted-foreground mt-2">Set to 0 to disable dormancy tracking.</p>
        )}
      </div>

      {/* Channel Availability */}
      <div>
        <SectionTitle>Channel Availability</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ALL_CHANNELS.map((channel) => {
            const enabled = limits.channels.includes(channel);
            return (
              <label
                key={channel}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors',
                  enabled ? 'border-primary bg-primary/5' : 'border-border bg-background',
                  readOnly ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted/20',
                )}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleChannel(channel)}
                  disabled={readOnly}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">{channel}</span>
              </label>
            );
          })}
        </div>
        {!readOnly && (
          <p className="text-xs text-muted-foreground mt-2">
            {limits.channels.length} of {ALL_CHANNELS.length} channels enabled
          </p>
        )}
      </div>
    </div>
  );
}
