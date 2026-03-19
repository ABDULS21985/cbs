import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef as TableColumnDef } from '@tanstack/react-table';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DataTable, StatusBadge, DateRangePicker } from '@/components/shared';
import { userAdminApi, type LoginEvent } from '../../api/userAdminApi';
import { formatDateTime } from '@/lib/formatters';
import { subHours, format, parseISO } from 'date-fns';

interface DateRange { from?: Date; to?: Date; }

export function LoginHistoryTable() {
  const [userSearch, setUserSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'login-history'],
    queryFn: () => userAdminApi.getLoginHistory({}),
  });

  // Client-side filtering
  const filtered = useMemo(() => {
    let results = [...events];
    if (userSearch) {
      const q = userSearch.toLowerCase();
      results = results.filter(e => e.username.toLowerCase().includes(q) || e.userId.toLowerCase().includes(q));
    }
    if (outcomeFilter) {
      results = results.filter(e => e.outcome === outcomeFilter);
    }
    if (dateRange.from) {
      results = results.filter(e => parseISO(e.timestamp) >= dateRange.from!);
    }
    if (dateRange.to) {
      const toEnd = new Date(dateRange.to!);
      toEnd.setHours(23, 59, 59, 999);
      results = results.filter(e => parseISO(e.timestamp) <= toEnd);
    }
    return results;
  }, [events, userSearch, outcomeFilter, dateRange]);

  // Hourly failed attempt chart (last 24h)
  const hourlyChart = useMemo(() => {
    const now = new Date();
    const hours: { hour: string; failures: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = subHours(now, i + 1);
      const hourEnd = subHours(now, i);
      const label = format(hourEnd, 'HH:mm');
      const failures = events.filter(
        e => e.outcome === 'FAILED' && parseISO(e.timestamp) >= hourStart && parseISO(e.timestamp) < hourEnd,
      ).length;
      hours.push({ hour: label, failures });
    }
    return hours;
  }, [events]);

  // Suspicious IP detection: >5 failures from same IP in last hour
  const suspiciousIps = useMemo(() => {
    const oneHourAgo = subHours(new Date(), 1);
    const ipMap: Record<string, number> = {};
    events.forEach(e => {
      if (e.outcome === 'FAILED' && parseISO(e.timestamp) >= oneHourAgo) {
        ipMap[e.ip] = (ipMap[e.ip] || 0) + 1;
      }
    });
    return Object.entries(ipMap).filter(([, count]) => count > 5).map(([ip, count]) => ({ ip, count }));
  }, [events]);

  const columns: TableColumnDef<LoginEvent>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: ({ row }) => <span className="text-sm tabular-nums text-muted-foreground">{formatDateTime(row.original.timestamp)}</span>,
    },
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium font-mono">{row.original.username}</div>
          <div className="text-xs text-muted-foreground">{row.original.userId}</div>
        </div>
      ),
    },
    {
      accessorKey: 'ip',
      header: 'IP Address',
      cell: ({ row }) => {
        const isSuspicious = suspiciousIps.some(s => s.ip === row.original.ip);
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm">{row.original.ip}</span>
            {isSuspicious && <AlertTriangle className="w-3.5 h-3.5 text-red-500" aria-label="Suspicious IP" />}
          </div>
        );
      },
    },
    {
      accessorKey: 'browser',
      header: 'Browser',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.browser}</span>,
    },
    {
      accessorKey: 'outcome',
      header: 'Outcome',
      cell: ({ row }) => (
        <StatusBadge status={row.original.outcome === 'SUCCESS' ? 'ACTIVE' : 'FAILED'} dot />
      ),
    },
    {
      id: 'failureReason',
      header: 'Failure Reason',
      cell: ({ row }) => (
        row.original.failureReason ? (
          <span className="text-sm text-red-600 dark:text-red-400">{row.original.failureReason}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Suspicious IP Warnings */}
      {suspiciousIps.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Suspicious Login Activity Detected</p>
              <p className="text-sm text-red-600 dark:text-red-500 mt-0.5">
                The following IP address{suspiciousIps.length > 1 ? 'es have' : ' has'} more than 5 failed login attempts in the last hour:
              </p>
              <ul className="mt-2 space-y-1">
                {suspiciousIps.map(({ ip, count }) => (
                  <li key={ip} className="text-sm font-mono text-red-700 dark:text-red-400">
                    {ip} — <strong>{count}</strong> failed attempts
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Failed attempts chart */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Failed Login Attempts — Last 24 Hours</h3>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={hourlyChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10 }}
              interval={3}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(val) => [val, 'Failures']}
            />
            <Bar dataKey="failures" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
          placeholder="Search by username..."
          className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-52"
        />
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <select
          value={outcomeFilter}
          onChange={e => setOutcomeFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All outcomes</option>
          <option value="SUCCESS">Success only</option>
          <option value="FAILED">Failed only</option>
        </select>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors ml-auto">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No login history found"
        pageSize={15}
      />
    </div>
  );
}
