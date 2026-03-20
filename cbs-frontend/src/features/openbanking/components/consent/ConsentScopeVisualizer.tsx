import { cn } from '@/lib/utils';
import { Building2, BarChart3, Wallet, CreditCard, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ScopeConfig {
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const SCOPE_CONFIG: Record<string, ScopeConfig> = {
  accounts: {
    icon: Building2,
    label: 'Accounts',
    description: 'View account details, type, and status',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  transactions: {
    icon: BarChart3,
    label: 'Transactions',
    description: 'Read transaction history and details',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  balance: {
    icon: Wallet,
    label: 'Balance',
    description: 'View account balances in real-time',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  payments: {
    icon: CreditCard,
    label: 'Payments',
    description: 'Initiate and manage payment orders',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  beneficiaries: {
    icon: Users,
    label: 'Beneficiaries',
    description: 'View and manage beneficiary list',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
};

interface ConsentScopeVisualizerProps {
  scopes: string[];
  compact?: boolean;
}

export function ConsentScopeVisualizer({ scopes, compact }: ConsentScopeVisualizerProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {scopes.map((scope) => {
          const config = SCOPE_CONFIG[scope];
          if (!config) return (
            <span key={scope} className="px-2 py-1 rounded-full bg-muted text-xs font-medium">
              {scope}
            </span>
          );
          const Icon = config.icon;
          return (
            <span
              key={scope}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border',
                config.bgColor,
                config.color,
                config.borderColor,
              )}
            >
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {scopes.map((scope) => {
        const config = SCOPE_CONFIG[scope];
        if (!config) return (
          <div key={scope} className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">{scope}</p>
          </div>
        );
        const Icon = config.icon;
        return (
          <div
            key={scope}
            className={cn(
              'rounded-lg border p-4 transition-colors',
              config.bgColor,
              config.borderColor,
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={cn('w-4 h-4', config.color)} />
              <h4 className={cn('text-sm font-semibold', config.color)}>{config.label}</h4>
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        );
      })}
    </div>
  );
}
