import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  Users, Landmark, CreditCard, ArrowLeftRight, Tag, PiggyBank, Send, Check, Loader2,
} from 'lucide-react';
import { reportBuilderApi, type DataSource } from '../../api/reportBuilderApi';

interface DataSourceCardsProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  sources: DataSource[];
}

const SOURCE_META: Record<string, { icon: React.ElementType; description: string; color: string }> = {
  customers: {
    icon: Users,
    description: 'Customer profiles, KYC, risk ratings',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  },
  accounts: {
    icon: Landmark,
    description: 'Account balances, types, statuses',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
  },
  loans: {
    icon: CreditCard,
    description: 'Loan portfolio, repayment schedules',
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
  },
  payments: {
    icon: Send,
    description: 'Payment instructions, batches, statuses',
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
  },
  cards: {
    icon: Tag,
    description: 'Card issuance, limits, transactions',
    color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30',
  },
  fixed_deposits: {
    icon: PiggyBank,
    description: 'FD placements, rates, maturity dates',
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30',
  },
  transactions: {
    icon: ArrowLeftRight,
    description: 'Debit/credit transactions across channels',
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
  },
};

interface SourceCountData {
  name: string;
  recordCount: number;
}

export function DataSourceCards({ selected, onChange, sources }: DataSourceCardsProps) {
  const { data: countsData } = useQuery<SourceCountData[]>({
    queryKey: ['report-builder', 'data-source-counts'],
    queryFn: async () => {
      // Return simulated counts -- these would come from the backend in production
      return sources.map((s) => ({
        name: s.id,
        recordCount: Math.floor(Math.random() * 50000) + 1000,
      }));
    },
    staleTime: 5 * 60 * 1000,
    enabled: sources.length > 0,
  });

  const countsMap = new Map<string, number>();
  countsData?.forEach((c) => countsMap.set(c.name, c.recordCount));

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sources.map((source) => {
        const isSelected = selected.includes(source.id);
        const meta = SOURCE_META[source.id];
        const Icon = meta?.icon ?? Landmark;
        const recordCount = countsMap.get(source.id);

        return (
          <button
            key={source.id}
            onClick={() => toggle(source.id)}
            className={cn(
              'relative flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all',
              isSelected
                ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
                : 'border-border bg-card hover:border-primary/40 hover:shadow-sm',
            )}
          >
            {/* Checkmark badge */}
            {isSelected && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </span>
            )}

            {/* Icon */}
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', meta?.color ?? 'bg-muted text-muted-foreground')}>
              <Icon className="w-5 h-5" />
            </div>

            {/* Title & description */}
            <div>
              <div className="text-sm font-semibold">{source.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {meta?.description ?? source.category}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 mt-auto pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{source.fields.length}</span> fields
              </div>
              {recordCount !== undefined && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{recordCount.toLocaleString()}</span> records
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
