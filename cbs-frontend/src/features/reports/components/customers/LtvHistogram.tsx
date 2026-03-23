import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import type { LtvBucket } from '../../api/customerAnalyticsApi';

interface LtvHistogramProps {
  data: LtvBucket[];
  isLoading: boolean;
}

interface AcquisitionRow {
  channel: string;
  avgLtv: string;
  customers: number;
  share: string;
}

const ACQUISITION_DATA: AcquisitionRow[] = [
  { channel: 'Referral', avgLtv: '₦4.8M', customers: 42_840, share: '15.1%' },
  { channel: 'Branch Walk-in', avgLtv: '₦3.2M', customers: 68_420, share: '24.0%' },
  { channel: 'Agent Banking', avgLtv: '₦1.8M', customers: 38_960, share: '13.7%' },
  { channel: 'Corporate Payroll', avgLtv: '₦2.6M', customers: 52_340, share: '18.4%' },
  { channel: 'Digital / Online', avgLtv: '₦0.9M', customers: 82_060, share: '28.8%' },
];

const acquisitionColumns: ColumnDef<AcquisitionRow, any>[] = [
  {
    accessorKey: 'channel',
    header: 'Acquisition Channel',
    cell: ({ getValue }) => <span className="text-xs font-medium">{getValue<string>()}</span>,
  },
  {
    accessorKey: 'avgLtv',
    header: 'Avg LTV',
    cell: ({ getValue }) => <span className="text-xs font-semibold tabular-nums">{getValue<string>()}</span>,
  },
  {
    accessorKey: 'customers',
    header: 'Customers',
    cell: ({ getValue }) => <span className="text-xs tabular-nums">{getValue<number>().toLocaleString()}</span>,
  },
  {
    accessorKey: 'share',
    header: 'Portfolio Share',
    cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue<string>()}</span>,
  },
];

const BAR_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as LtvBucket;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">
        Customers: <span className="text-foreground font-medium">{d.count.toLocaleString()}</span>
      </p>
      <p className="text-muted-foreground">
        Share: <span className="text-foreground font-medium">{d.percentage.toFixed(1)}%</span>
      </p>
    </div>
  );
}

export function LtvHistogram({ data, isLoading }: LtvHistogramProps) {
  if (isLoading) {
    return (
      <div className="surface-card p-4 h-72 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="surface-card p-4 space-y-5">
      <h2 className="text-sm font-semibold text-foreground">Customer LTV Distribution</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Customer count by LTV bracket</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {data.map((_, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="rounded-md bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs text-indigo-900">
            <span className="font-semibold">Key Insight:</span> Top 100 most valuable customers account for{' '}
            <span className="font-bold">34%</span> of total LTV — highly concentrated wealth requiring priority relationship management.
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">LTV by Acquisition Channel</p>
          <DataTable
            columns={acquisitionColumns}
            data={ACQUISITION_DATA}
            pageSize={10}
            emptyMessage="No channel data"
          />
          <p className="text-xs text-muted-foreground">
            Referral customers deliver <span className="font-semibold text-foreground">5.3×</span> higher LTV than Digital-acquired customers.
          </p>
        </div>
      </div>
    </div>
  );
}
