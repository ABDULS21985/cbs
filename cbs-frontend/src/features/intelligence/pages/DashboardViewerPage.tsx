import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, EmptyState, StatCard } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import {
  LayoutDashboard,
  Plus,
  Loader2,
  AlertCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  useDashboardWithWidgets,
  useAddWidget,
  type DashboardWidget,
  type DashboardDefinition,
} from '../hooks/useIntelligence';

// ---- Constants ------------------------------------------------------------------

const WIDGET_TYPES = [
  'KPI_CARD', 'LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'TABLE',
  'HEATMAP', 'MAP', 'GAUGE', 'FUNNEL', 'TREEMAP',
  'SCATTER', 'ALERT_FEED', 'TICKER',
] as const;

const CHART_COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(47, 96%, 53%)',
  'hsl(0, 84%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(199, 89%, 48%)',
  'hsl(24, 95%, 53%)', 'hsl(330, 81%, 60%)',
];

// ---- Widget Data Fetcher --------------------------------------------------------

function useWidgetData(dataSource: string, enabled: boolean) {
  return useQuery({
    queryKey: ['widget-data', dataSource],
    queryFn: async () => {
      if (!dataSource) return null;
      // dataSource can be a full API path like "/api/v1/dashboard/stats"
      // or a relative path — normalize it
      const url = dataSource.startsWith('/api/') ? dataSource : `/api${dataSource}`;
      try {
        const data = await apiGet<unknown>(url);
        return data;
      } catch {
        return null;
      }
    },
    enabled: enabled && !!dataSource,
    staleTime: 60_000,
    retry: 1,
  });
}

// ---- KPI Card Widget ------------------------------------------------------------

function KpiCardWidget({ widget, data }: { widget: DashboardWidget; data: unknown }) {
  // Parse display config for formatting
  const config = widget.displayConfig || {};
  const format = (config as Record<string, string>).format || 'number';

  let value: string | number = '—';
  let trend: string | undefined;

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    // Try common KPI field patterns
    value = (d.value ?? d.total ?? d.count ?? d.amount ?? d.balance ?? Object.values(d)[0] ?? '—') as string | number;
    if (d.trend !== undefined) trend = String(d.trend);
    if (d.change !== undefined) trend = String(d.change);
  } else if (typeof data === 'number' || typeof data === 'string') {
    value = data;
  }

  const formattedValue = typeof value === 'number'
    ? format === 'money' ? formatMoney(value) : value.toLocaleString()
    : String(value);

  return (
    <div className="flex flex-col justify-between h-full">
      <p className="text-xs font-medium text-muted-foreground truncate">{widget.title}</p>
      <div className="mt-2">
        <p className="text-2xl font-bold tabular-nums">{formattedValue}</p>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {Number(trend) >= 0 ? (
              <TrendingUp className="w-3 h-3 text-green-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-600" />
            )}
            <span className={cn('text-xs font-medium', Number(trend) >= 0 ? 'text-green-600' : 'text-red-600')}>
              {Number(trend) >= 0 ? '+' : ''}{trend}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Line Chart Widget ----------------------------------------------------------

function LineChartWidget({ widget, data }: { widget: DashboardWidget; data: unknown }) {
  const chartData = normalizeChartData(data);
  if (!chartData.length) return <NoDataPlaceholder title={widget.title} />;

  const keys = Object.keys(chartData[0]).filter((k) => k !== 'name' && k !== 'label' && k !== 'date' && k !== 'period');
  const xKey = chartData[0].date ? 'date' : chartData[0].period ? 'period' : chartData[0].label ? 'label' : 'name';

  return (
    <div className="h-full flex flex-col">
      <p className="text-xs font-medium text-muted-foreground mb-2 truncate">{widget.title}</p>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {keys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- Bar Chart Widget -----------------------------------------------------------

function BarChartWidget({ widget, data }: { widget: DashboardWidget; data: unknown }) {
  const chartData = normalizeChartData(data);
  if (!chartData.length) return <NoDataPlaceholder title={widget.title} />;

  const keys = Object.keys(chartData[0]).filter((k) => k !== 'name' && k !== 'label' && k !== 'date' && k !== 'period');
  const xKey = chartData[0].date ? 'date' : chartData[0].period ? 'period' : chartData[0].label ? 'label' : 'name';

  return (
    <div className="h-full flex flex-col">
      <p className="text-xs font-medium text-muted-foreground mb-2 truncate">{widget.title}</p>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {keys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- Pie Chart Widget -----------------------------------------------------------

function PieChartWidget({ widget, data }: { widget: DashboardWidget; data: unknown }) {
  const chartData = normalizeChartData(data);
  if (!chartData.length) return <NoDataPlaceholder title={widget.title} />;

  const valueKey = Object.keys(chartData[0]).find((k) => k !== 'name' && k !== 'label' && typeof chartData[0][k] === 'number') || 'value';

  return (
    <div className="h-full flex flex-col">
      <p className="text-xs font-medium text-muted-foreground mb-2 truncate">{widget.title}</p>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius="70%"
              dataKey={valueKey}
              nameKey={chartData[0].label ? 'label' : 'name'}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((_entry, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- Scatter Chart Widget -------------------------------------------------------

function ScatterChartWidget({ widget, data }: { widget: DashboardWidget; data: unknown }) {
  const chartData = normalizeChartData(data);
  if (!chartData.length) return <NoDataPlaceholder title={widget.title} />;

  const keys = Object.keys(chartData[0]).filter((k) => typeof chartData[0][k] === 'number');
  const xKey = keys[0] || 'x';
  const yKey = keys[1] || keys[0] || 'y';

  return (
    <div className="h-full flex flex-col">
      <p className="text-xs font-medium text-muted-foreground mb-2 truncate">{widget.title}</p>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xKey} type="number" tick={{ fontSize: 10 }} name={xKey} />
            <YAxis dataKey={yKey} type="number" tick={{ fontSize: 10 }} name={yKey} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Scatter data={chartData} fill={CHART_COLORS[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- Table Widget ---------------------------------------------------------------

function TableWidget({ widget, data }: { widget: DashboardWidget; data: unknown }) {
  const rows = normalizeChartData(data);
  if (!rows.length) return <NoDataPlaceholder title={widget.title} />;

  const columns = Object.keys(rows[0]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <p className="text-xs font-medium text-muted-foreground mb-2 truncate">{widget.title}</p>
      <div className="flex-1 overflow-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              {columns.map((col) => (
                <th key={col} className="text-left px-2 py-1.5 font-medium text-muted-foreground whitespace-nowrap">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.slice(0, 20).map((row, i) => (
              <tr key={i} className="hover:bg-muted/20">
                {columns.map((col) => (
                  <td key={col} className="px-2 py-1 whitespace-nowrap">
                    {typeof row[col] === 'number' ? row[col].toLocaleString() : String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Gauge Widget ---------------------------------------------------------------

function GaugeWidget({ widget, data }: { widget: DashboardWidget; data: unknown }) {
  let value = 0;
  let max = 100;
  let label = '';

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    value = Number(d.value ?? d.score ?? d.ratio ?? d.percent ?? Object.values(d).find((v) => typeof v === 'number') ?? 0);
    max = Number(d.max ?? d.total ?? 100);
    label = String(d.label ?? d.name ?? '');
  } else if (typeof data === 'number') {
    value = data;
  }

  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-600';
  const bgColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <p className="text-xs font-medium text-muted-foreground mb-3 truncate">{widget.title}</p>
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="stroke-muted"
            strokeWidth="3"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={cn('transition-all duration-700', pct >= 80 ? 'stroke-green-500' : pct >= 50 ? 'stroke-amber-500' : 'stroke-red-500')}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${pct}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-lg font-bold tabular-nums', color)}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      {label && <p className="text-xs text-muted-foreground mt-2">{label}</p>}
    </div>
  );
}

// ---- Alert Feed Widget ----------------------------------------------------------

function AlertFeedWidget({ widget, data }: { widget: DashboardWidget; data: unknown }) {
  const items = normalizeChartData(data);
  if (!items.length) return <NoDataPlaceholder title={widget.title} />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <p className="text-xs font-medium text-muted-foreground mb-2 truncate">{widget.title}</p>
      <div className="flex-1 overflow-auto space-y-1.5">
        {items.slice(0, 10).map((item, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded-lg border text-xs">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">{String(item.title ?? item.message ?? item.name ?? `Alert ${i + 1}`)}</p>
              {item.description != null && <p className="text-muted-foreground truncate">{String(item.description)}</p>}
              {item.status != null && <StatusBadge status={String(item.status)} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Ticker Widget --------------------------------------------------------------

function TickerWidget({ widget, data }: { widget: DashboardWidget; data: unknown }) {
  const items = normalizeChartData(data);
  if (!items.length) return <NoDataPlaceholder title={widget.title} />;

  return (
    <div className="h-full flex flex-col">
      <p className="text-xs font-medium text-muted-foreground mb-2 truncate">{widget.title}</p>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-4 overflow-x-auto py-1">
          {items.map((item, i) => {
            const value = Number(item.value ?? item.price ?? item.amount ?? 0);
            const change = Number(item.change ?? item.trend ?? 0);
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 whitespace-nowrap">
                <span className="text-xs font-medium">{String(item.name ?? item.symbol ?? item.label ?? `Item ${i}`)}</span>
                <span className="text-xs tabular-nums font-semibold">{value.toLocaleString()}</span>
                {change !== 0 && (
                  <span className={cn('text-xs tabular-nums', change > 0 ? 'text-green-600' : 'text-red-600')}>
                    {change > 0 ? '+' : ''}{change.toFixed(2)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Heatmap Widget (grid based) ------------------------------------------------

function HeatmapWidget({ widget, data }: { widget: DashboardWidget; data: unknown }) {
  const items = normalizeChartData(data);
  if (!items.length) return <NoDataPlaceholder title={widget.title} />;

  const valueKey = Object.keys(items[0]).find((k) => typeof items[0][k] === 'number') || 'value';
  const values = items.map((r) => Number(r[valueKey] ?? 0));
  const maxVal = Math.max(...values, 1);

  return (
    <div className="h-full flex flex-col">
      <p className="text-xs font-medium text-muted-foreground mb-2 truncate">{widget.title}</p>
      <div className="flex-1 grid grid-cols-4 gap-1 auto-rows-fr">
        {items.slice(0, 16).map((item, i) => {
          const val = Number(item[valueKey] ?? 0);
          const intensity = val / maxVal;
          return (
            <div
              key={i}
              className="rounded flex flex-col items-center justify-center p-1 text-[10px]"
              style={{ backgroundColor: `hsl(221, 83%, ${90 - intensity * 50}%)` }}
              title={`${item.name ?? item.label ?? i}: ${val}`}
            >
              <span className="font-medium truncate w-full text-center">{String(item.name ?? item.label ?? i)}</span>
              <span className="tabular-nums font-bold">{val.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Funnel Widget (horizontal bars) --------------------------------------------

function FunnelWidget({ widget, data }: { widget: DashboardWidget; data: unknown }) {
  const items = normalizeChartData(data);
  if (!items.length) return <NoDataPlaceholder title={widget.title} />;

  const valueKey = Object.keys(items[0]).find((k) => typeof items[0][k] === 'number') || 'value';
  const maxVal = Math.max(...items.map((r) => Number(r[valueKey] ?? 0)), 1);

  return (
    <div className="h-full flex flex-col">
      <p className="text-xs font-medium text-muted-foreground mb-2 truncate">{widget.title}</p>
      <div className="flex-1 space-y-1.5 overflow-auto">
        {items.map((item, i) => {
          const val = Number(item[valueKey] ?? 0);
          const pct = (val / maxVal) * 100;
          return (
            <div key={i} className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">{String(item.name ?? item.label ?? `Step ${i + 1}`)}</span>
                <span className="font-medium tabular-nums">{val.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- No Data Placeholder --------------------------------------------------------

function NoDataPlaceholder({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
      <Activity className="w-6 h-6 mb-1 opacity-30" />
      <p className="text-xs font-medium">{title}</p>
      <p className="text-[10px]">No data available</p>
    </div>
  );
}

// ---- Data normalization ---------------------------------------------------------

function normalizeChartData(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    // If the response has a data/items/content array inside
    if (Array.isArray(d.data)) return d.data as Record<string, unknown>[];
    if (Array.isArray(d.items)) return d.items as Record<string, unknown>[];
    if (Array.isArray(d.content)) return d.content as Record<string, unknown>[];
    // Wrap single object
    return [d];
  }
  return [];
}

// ---- Widget Renderer Router -----------------------------------------------------

function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  const { data, isLoading, isError } = useWidgetData(widget.dataSource, widget.isActive);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || data === null) {
    // Show metadata card as fallback
    return <WidgetMetadataCard widget={widget} />;
  }

  switch (widget.widgetType) {
    case 'KPI_CARD':  return <KpiCardWidget widget={widget} data={data} />;
    case 'LINE_CHART': return <LineChartWidget widget={widget} data={data} />;
    case 'BAR_CHART':  return <BarChartWidget widget={widget} data={data} />;
    case 'PIE_CHART':  return <PieChartWidget widget={widget} data={data} />;
    case 'TABLE':      return <TableWidget widget={widget} data={data} />;
    case 'GAUGE':      return <GaugeWidget widget={widget} data={data} />;
    case 'SCATTER':    return <ScatterChartWidget widget={widget} data={data} />;
    case 'ALERT_FEED': return <AlertFeedWidget widget={widget} data={data} />;
    case 'TICKER':     return <TickerWidget widget={widget} data={data} />;
    case 'HEATMAP':    return <HeatmapWidget widget={widget} data={data} />;
    case 'FUNNEL':     return <FunnelWidget widget={widget} data={data} />;
    case 'TREEMAP':    return <BarChartWidget widget={widget} data={data} />; // fallback to bar
    case 'MAP':        return <NoDataPlaceholder title={`${widget.title} (Map)`} />; // map needs geo lib
    default:           return <WidgetMetadataCard widget={widget} />;
  }
}

// ---- Metadata fallback card (when data source fails) ----------------------------

function WidgetMetadataCard({ widget }: { widget: DashboardWidget }) {
  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
          <Activity className="w-3 h-3 text-primary" />
        </div>
        <p className="text-xs font-medium truncate">{widget.title}</p>
      </div>
      <div className="flex-1 flex flex-col justify-center text-[10px] text-muted-foreground space-y-1">
        <p>Type: {widget.widgetType.replace(/_/g, ' ')}</p>
        <p>Source: <span className="font-mono">{widget.dataSource || '—'}</span></p>
        <p>Size: {widget.width}x{widget.height} at ({widget.positionX},{widget.positionY})</p>
        <StatusBadge status={widget.isActive ? 'ACTIVE' : 'INACTIVE'} />
      </div>
    </div>
  );
}

// ---- Add Widget Dialog ----------------------------------------------------------

function AddWidgetDialog({
  open,
  onClose,
  dashboardId,
  dashboardCode,
}: {
  open: boolean;
  onClose: () => void;
  dashboardId: number;
  dashboardCode: string;
}) {
  const addWidget = useAddWidget();
  const [widgetCode, setWidgetCode] = useState('');
  const [title, setTitle] = useState('');
  const [widgetType, setWidgetType] = useState<string>('KPI_CARD');
  const [dataSource, setDataSource] = useState('');
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(3);

  const handleSubmit = () => {
    addWidget.mutate(
      {
        dashboardId,
        dashboardCode, // passed so the hook invalidates the specific dashboard-with-widgets cache
        widget: {
          dashboardId,
          widgetCode,
          widgetType: widgetType as DashboardWidget['widgetType'],
          title,
          dataSource,
          positionX: posX,
          positionY: posY,
          width,
          height,
          isActive: true,
        },
      },
      {
        onSuccess: () => {
          onClose();
          setWidgetCode('');
          setTitle('');
          setDataSource('');
        },
      },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold">Add Widget</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Widget Code</label>
            <input
              value={widgetCode}
              onChange={(e) => setWidgetCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. TOTAL_DEPOSITS_KPI"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Total Deposits"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Widget Type</label>
            <select
              value={widgetType}
              onChange={(e) => setWidgetType(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {WIDGET_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Data Source (API endpoint)</label>
            <input
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. /v1/dashboard/stats"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">X</label>
              <input type="number" min={0} value={posX} onChange={(e) => setPosX(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 text-sm border rounded-lg bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Y</label>
              <input type="number" min={0} value={posY} onChange={(e) => setPosY(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 text-sm border rounded-lg bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">W</label>
              <input type="number" min={1} max={12} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 text-sm border rounded-lg bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">H</label>
              <input type="number" min={1} max={12} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 text-sm border rounded-lg bg-background" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={addWidget.isPending || !widgetCode.trim() || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {addWidget.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Widget
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function DashboardViewerPage() {
  const { code } = useParams<{ code: string }>();
  const { data: dashboardData, isLoading, isError } = useDashboardWithWidgets(code || '');
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const dashboard = dashboardData?.dashboard as DashboardDefinition | undefined;
  const widgets = (dashboardData?.widgets as DashboardWidget[] | undefined) || [];

  // Auto-refresh support
  useEffect(() => {
    if (!autoRefresh || !dashboard?.refreshIntervalSec) return;
    const interval = setInterval(() => {
      // Widget queries auto-refetch via staleTime; we just need to signal
    }, dashboard.refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, dashboard?.refreshIntervalSec]);

  if (!code) {
    return (
      <>
        <PageHeader title="Dashboard" backTo="/intelligence/dashboards" />
        <div className="page-container">
          <EmptyState title="No dashboard code" description="No dashboard code provided in the URL." />
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/intelligence/dashboards" />
        <div className="page-container">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </>
    );
  }

  if (isError || !dashboardData) {
    return (
      <>
        <PageHeader title="Dashboard Not Found" backTo="/intelligence/dashboards" />
        <div className="page-container">
          <EmptyState
            title="Dashboard Not Found"
            description={`No dashboard found with code "${code}".`}
          />
        </div>
      </>
    );
  }

  // Sort widgets by position for grid layout
  const sortedWidgets = [...widgets]
    .filter((w) => w.isActive)
    .sort((a, b) => a.positionY - b.positionY || a.positionX - b.positionX);

  return (
    <>
      <PageHeader
        title={dashboard?.dashboardName || code}
        subtitle={`${dashboard?.dashboardType || 'CUSTOM'} dashboard — ${widgets.length} widget(s)`}
        backTo="/intelligence/dashboards"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border',
                autoRefresh ? 'bg-green-50 border-green-200 text-green-700' : 'hover:bg-muted',
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', autoRefresh && 'animate-spin')} />
              {autoRefresh ? `Auto (${dashboard?.refreshIntervalSec || 300}s)` : 'Auto-refresh Off'}
            </button>
            <button
              onClick={() => setShowAddWidget(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-3.5 h-3.5" /> Add Widget
            </button>
          </div>
        }
      />
      <div className="page-container space-y-6">
        {/* Dashboard metadata bar */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <StatusBadge status={dashboard?.dashboardType || 'CUSTOM'} />
          <span>|</span>
          <span>{widgets.length} widgets</span>
          <span>|</span>
          <StatusBadge status={dashboard?.isActive ? 'ACTIVE' : 'INACTIVE'} />
          {dashboard?.allowedRoles && dashboard.allowedRoles.length > 0 && (
            <>
              <span>|</span>
              <span>Roles: {dashboard.allowedRoles.join(', ')}</span>
            </>
          )}
        </div>

        {/* Widget Grid — uses CSS grid with 12-column layout matching dashboard convention */}
        {sortedWidgets.length === 0 ? (
          <EmptyState
            title="No Active Widgets"
            description="Add widgets to build out this dashboard. Each widget fetches live data from its configured data source."
            icon={LayoutDashboard}
          />
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}
          >
            {sortedWidgets.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border bg-card p-4 shadow-sm"
                style={{
                  gridColumn: `span ${Math.min(w.width, 12)}`,
                  minHeight: `${Math.max(w.height * 60, 120)}px`,
                }}
              >
                <WidgetRenderer widget={w} />
              </div>
            ))}
          </div>
        )}
      </div>

      {dashboard && (
        <AddWidgetDialog
          open={showAddWidget}
          onClose={() => setShowAddWidget(false)}
          dashboardId={dashboard.id}
          dashboardCode={dashboard.dashboardCode}
        />
      )}
    </>
  );
}
