import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DataTable } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import type { SubLimit } from '../../types/facility';

interface SubLimitTableProps {
  data: SubLimit[];
  isLoading?: boolean;
}

const SUB_LIMIT_LABELS: Record<string, string> = {
  OVERDRAFT: 'Overdraft',
  TERM_LOAN: 'Term Loan',
  BANK_GUARANTEE: 'Bank Guarantee',
  LETTER_OF_CREDIT: 'Letter of Credit',
  IMPORT_FINANCE: 'Import Finance',
};

export function SubLimitTable({ data, isLoading }: SubLimitTableProps) {
  const columns = useMemo<ColumnDef<SubLimit>[]>(
    () => [
      {
        accessorKey: 'subLimitType',
        header: 'Sub-limit Type',
        cell: ({ row }) => (
          <span className="font-medium">
            {SUB_LIMIT_LABELS[row.original.subLimitType] ?? row.original.subLimitType}
          </span>
        ),
      },
      {
        accessorKey: 'productName',
        header: 'Product',
      },
      {
        accessorKey: 'allocated',
        header: 'Allocated',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{formatMoney(row.original.allocated)}</span>
        ),
      },
      {
        accessorKey: 'used',
        header: 'Used',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-blue-600">{formatMoney(row.original.used)}</span>
        ),
      },
      {
        accessorKey: 'available',
        header: 'Available',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-green-600">{formatMoney(row.original.available)}</span>
        ),
      },
    ],
    []
  );

  const chartData = data.map((sl) => ({
    name: SUB_LIMIT_LABELS[sl.subLimitType] ?? sl.subLimitType,
    Allocated: sl.allocated / 1_000_000,
    Used: sl.used / 1_000_000,
  }));

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="No sub-limits configured for this facility"
        pageSize={10}
      />
      {chartData.length > 0 && (
        <div className="p-4 border rounded-lg">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
            Allocation vs Utilization (₦M)
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" tickFormatter={(v) => `₦${v}M`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [`₦${value.toFixed(1)}M`, '']} />
              <Legend />
              <Bar dataKey="Allocated" fill="#93c5fd" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Used" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
