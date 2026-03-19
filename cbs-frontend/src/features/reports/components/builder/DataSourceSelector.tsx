import { cn } from '@/lib/utils';
import {
  Users, CreditCard, ArrowLeftRight, Landmark, PiggyBank, Tag, Send,
  ShieldAlert, AlertTriangle, BarChart2, Zap, FileText, Info,
} from 'lucide-react';
import type { DataSource } from '../../api/reportBuilderApi';

interface DataSourceSelectorProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  sources: DataSource[];
}

const SOURCE_ICONS: Record<string, React.ElementType> = {
  customers: Users,
  accounts: Landmark,
  transactions: ArrowLeftRight,
  loans: CreditCard,
  fixed_deposits: PiggyBank,
  cards: Tag,
  payments: Send,
  aml_alerts: ShieldAlert,
  fraud_cases: AlertTriangle,
  credit_risk: BarChart2,
  operational_events: Zap,
  audit_trail: FileText,
};

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  customers: 'Customer profiles, KYC status, risk ratings',
  accounts: 'Account balances, types, statuses',
  transactions: 'Debit/credit transactions across channels',
  loans: 'Loan portfolio, principal, outstanding balances',
  fixed_deposits: 'FD placements, rates, maturity dates',
  cards: 'Card issuance, limits, utilisation',
  payments: 'Interbank and intra-bank payment flows',
  aml_alerts: 'Anti-money laundering alerts and risk scores',
  fraud_cases: 'Confirmed and suspected fraud cases',
  credit_risk: 'PD/LGD scores and rating grades',
  operational_events: 'Operational loss events by department',
  audit_trail: 'System audit log of all user actions',
};

export function DataSourceSelector({ selected, onChange, sources }: DataSourceSelectorProps) {
  const bankingSources = sources.filter((s) => s.category === 'Banking Data');
  const riskSources = sources.filter((s) => s.category === 'Risk Data');

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  const totalFields = sources
    .filter((s) => selected.includes(s.id))
    .reduce((acc, s) => acc + s.fields.length, 0);

  return (
    <div className="space-y-6">
      {selected.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Sources with shared keys (<code className="font-mono text-xs">customer_id</code>,{' '}
            <code className="font-mono text-xs">account_id</code>) will be automatically joined.
          </p>
          <span className="ml-auto text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap">
            {totalFields} available fields
          </span>
        </div>
      )}

      <SourceGroup
        title="Banking Data"
        sources={bankingSources}
        selected={selected}
        onToggle={toggle}
      />
      <SourceGroup
        title="Risk Data"
        sources={riskSources}
        selected={selected}
        onToggle={toggle}
      />
    </div>
  );
}

interface SourceGroupProps {
  title: string;
  sources: DataSource[];
  selected: string[];
  onToggle: (id: string) => void;
}

function SourceGroup({ title, sources, selected, onToggle }: SourceGroupProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {sources.map((source) => {
          const isSelected = selected.includes(source.id);
          const Icon = SOURCE_ICONS[source.id] ?? FileText;
          return (
            <button
              key={source.id}
              onClick={() => onToggle(source.id)}
              className={cn(
                'relative flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium leading-tight">{source.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {SOURCE_DESCRIPTIONS[source.id] ?? source.category}
                </div>
              </div>
              {isSelected && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {source.fields.length} fields
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
