import { cn } from '@/lib/utils';
import { RefreshCw, DollarSign, Banknote, Bell } from 'lucide-react';
import type { MaturityInstruction } from '../api/fixedDepositApi';

interface Account {
  id: string;
  number: string;
  title: string;
}

interface FdMaturityInstructionProps {
  value: MaturityInstruction;
  onChange: (v: MaturityInstruction) => void;
  accounts: Account[];
}

interface OptionProps {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}

function InstructionOption({ selected, onSelect, icon, title, description, children }: OptionProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-lg border p-4 cursor-pointer transition-all',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-muted-foreground/40 hover:bg-muted/30',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className={cn('w-3.5 h-3.5 rounded-full border-2 flex-shrink-0', selected ? 'border-primary bg-primary' : 'border-muted-foreground/40')}>
              {selected && <div className="w-full h-full rounded-full scale-50 bg-primary-foreground" />}
            </div>
            <span className="text-sm font-medium">{title}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-5">{description}</p>
          {selected && children && <div className="mt-3 ml-5">{children}</div>}
        </div>
      </div>
    </div>
  );
}

export function FdMaturityInstruction({ value, onChange, accounts }: FdMaturityInstructionProps) {
  return (
    <div className="space-y-3">
      <InstructionOption
        selected={value.type === 'ROLLOVER_ALL'}
        onSelect={() => onChange({ type: 'ROLLOVER_ALL' })}
        icon={<RefreshCw className="w-4 h-4" />}
        title="Auto-Rollover (Principal + Interest)"
        description="At maturity, automatically reinvest both principal and accrued interest at the prevailing rate."
      />

      <InstructionOption
        selected={value.type === 'ROLLOVER_PRINCIPAL'}
        onSelect={() => onChange({ type: 'ROLLOVER_PRINCIPAL' })}
        icon={<DollarSign className="w-4 h-4" />}
        title="Auto-Rollover (Principal Only)"
        description="At maturity, reinvest the principal. Pay net interest to the source account."
      />

      <InstructionOption
        selected={value.type === 'LIQUIDATE'}
        onSelect={() => onChange({ type: 'LIQUIDATE', destinationAccountId: value.destinationAccountId })}
        icon={<Banknote className="w-4 h-4" />}
        title="Liquidate to Account"
        description="At maturity, credit the full maturity value to a nominated account."
      >
        {accounts.length > 0 ? (
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Destination Account</label>
            <select
              value={value.destinationAccountId ?? ''}
              onChange={(e) => onChange({ type: 'LIQUIDATE', destinationAccountId: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select account...</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.title} — {acc.number}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No accounts available. Proceeds will credit to source account.</p>
        )}
      </InstructionOption>

      <InstructionOption
        selected={value.type === 'MANUAL'}
        onSelect={() => onChange({ type: 'MANUAL' })}
        icon={<Bell className="w-4 h-4" />}
        title="Manual Decision at Maturity"
        description="Send a reminder notification 7 days before maturity. A banker will confirm instructions."
      />
    </div>
  );
}
