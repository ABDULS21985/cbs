import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { RefreshCw, DollarSign, Banknote, Bell } from 'lucide-react';
import type { MaturityInstruction } from '../api/fixedDepositApi';

interface AccountOption {
  id: number | string;
  accountNumber: string;
  accountType: string;
  currency: string;
  availableBalance: number;
}

interface FdMaturityInstructionProps {
  value: MaturityInstruction;
  onChange: (v: MaturityInstruction) => void;
  accounts: AccountOption[];
  sourceAccountId?: string | number;
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
    <div onClick={onSelect} className={cn(
      'rounded-lg border p-4 cursor-pointer transition-all',
      selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-muted-foreground/40 hover:bg-muted/30',
    )}>
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

export function FdMaturityInstruction({ value, onChange, accounts, sourceAccountId }: FdMaturityInstructionProps) {
  const [manualEntry, setManualEntry] = useState(false);
  const destinationAccounts = accounts.filter((a) => String(a.id) !== String(sourceAccountId));

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
        {destinationAccounts.length > 0 && !manualEntry ? (
          <div className="space-y-2">
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Destination Account</label>
            <select value={value.destinationAccountId ?? ''} onChange={(e) => onChange({ type: 'LIQUIDATE', destinationAccountId: e.target.value })}
              onClick={(e) => e.stopPropagation()} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select account...</option>
              {destinationAccounts.map((acc) => (
                <option key={acc.id} value={String(acc.id)}>
                  {acc.accountNumber} — {acc.accountType} ({acc.currency} {formatMoney(acc.availableBalance, acc.currency)})
                </option>
              ))}
            </select>
            <button type="button" onClick={(e) => { e.stopPropagation(); setManualEntry(true); }} className="text-xs text-primary hover:underline">Enter different account</button>
          </div>
        ) : destinationAccounts.length === 0 && !manualEntry ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground italic">No other accounts available for this customer.</p>
            <button type="button" onClick={(e) => { e.stopPropagation(); setManualEntry(true); }} className="text-xs text-primary hover:underline">Enter account manually</button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Destination Account Number</label>
            <input type="text" value={value.destinationAccountId ?? ''} onChange={(e) => onChange({ type: 'LIQUIDATE', destinationAccountId: e.target.value })}
              onClick={(e) => e.stopPropagation()} placeholder="Enter account number..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
            {destinationAccounts.length > 0 && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setManualEntry(false); }} className="text-xs text-primary hover:underline">Select from customer accounts</button>
            )}
          </div>
        )}
      </InstructionOption>
      <InstructionOption
        selected={value.type === 'MANUAL'}
        onSelect={() => onChange({ type: 'MANUAL' })}
        icon={<Bell className="w-4 h-4" />}
        title="Manual Decision at Maturity"
        description="A reminder notification will be sent 7 days before maturity. A banker will confirm instructions."
      />
    </div>
  );
}
