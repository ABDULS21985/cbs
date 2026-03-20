import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { DataTable, StatusBadge } from '@/components/shared';
import type { TrustComplianceItem } from '../../api/wealthApi';
import { useTrustCompliance } from '../../hooks/useWealth';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrustComplianceTabProps {
  trustCode: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<TrustComplianceItem['type'], string> = {
  DEED_REVIEW: 'Trust Deed Review',
  REGULATORY_FILING: 'Regulatory Filings (FIRS, CAC)',
  IPS_COMPLIANCE: 'IPS Compliance',
  FEE_SCHEDULE: 'Fee Schedule',
};

const SECTION_ORDER: TrustComplianceItem['type'][] = [
  'DEED_REVIEW',
  'REGULATORY_FILING',
  'IPS_COMPLIANCE',
  'FEE_SCHEDULE',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntilLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrustComplianceTab({ trustCode }: TrustComplianceTabProps) {
  const { data: items = [], isLoading } = useTrustCompliance(trustCode);

  // ── Group by section ──

  const sections = useMemo(() => {
    const grouped: Record<string, TrustComplianceItem[]> = {};
    SECTION_ORDER.forEach((type) => {
      grouped[type] = [];
    });
    items.forEach((item) => {
      if (grouped[item.type]) {
        grouped[item.type].push(item);
      } else {
        grouped[item.type] = [item];
      }
    });
    return grouped;
  }, [items]);

  // ── Summary counts ──

  const summary = useMemo(() => {
    const counts = { COMPLIANT: 0, DUE_SOON: 0, OVERDUE: 0, PENDING: 0 };
    items.forEach((item) => {
      if (item.status in counts) counts[item.status as keyof typeof counts]++;
    });
    return counts;
  }, [items]);

  // ── Columns ──

  const columns: ColumnDef<TrustComplianceItem, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.status === 'OVERDUE' && (
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          )}
          <span className="text-sm font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {SECTION_LABELS[row.original.type] || row.original.type.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => (
        <div>
          <span className="text-sm">{formatDate(row.original.dueDate)}</span>
          {(row.original.status === 'DUE_SOON' || row.original.status === 'OVERDUE') && (
            <p
              className={cn(
                'text-xs mt-0.5',
                row.original.status === 'OVERDUE'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400',
              )}
            >
              {daysUntilLabel(row.original.dueDate)}
            </p>
          )}
          {row.original.status === 'COMPLIANT' && daysUntil(row.original.dueDate) > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {daysUntilLabel(row.original.dueDate)}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'lastCompleted',
      header: 'Last Completed',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.lastCompleted ? formatDate(row.original.lastCompleted) : '—'}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Compliant</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.COMPLIANT}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Due Soon</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.DUE_SOON}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-muted-foreground">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.OVERDUE}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold text-muted-foreground">{summary.PENDING}</p>
        </div>
      </div>

      {/* Sections */}
      {SECTION_ORDER.map((type) => {
        const sectionItems = sections[type] ?? [];
        if (sectionItems.length === 0) return null;

        const hasOverdue = sectionItems.some((i) => i.status === 'OVERDUE');

        return (
          <div
            key={type}
            className={cn(
              'rounded-xl border bg-card',
              hasOverdue && 'border-red-300 dark:border-red-800',
            )}
          >
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{SECTION_LABELS[type]}</h3>
              {hasOverdue && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  Has overdue items
                </span>
              )}
            </div>
            <DataTable
              columns={columns}
              data={sectionItems}
              isLoading={false}
              pageSize={10}
              emptyMessage="No compliance items"
            />
          </div>
        );
      })}

      {/* Full table (all items) if items exist across multiple categories */}
      {items.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="px-5 pt-4 pb-2">
            <h3 className="text-sm font-semibold">All Compliance Items</h3>
          </div>
          <DataTable
            columns={columns}
            data={items}
            isLoading={false}
            enableGlobalFilter
            pageSize={10}
            emptyMessage="No compliance items"
          />
        </div>
      )}
    </div>
  );
}
