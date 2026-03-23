import { RefreshCw, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/shared';
import { StatCard } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import type { ReportResult, VisualizationType, ReportConfig } from '../../api/reportBuilderApi';

interface ReportPreviewProps {
  result: ReportResult | null;
  vizType: VisualizationType;
  chartConfig: ReportConfig['chartConfig'];
  isLoading: boolean;
  onRefresh?: () => void;
  maxRows?: number;
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

export function ReportPreview({ result, vizType, chartConfig, isLoading, onRefresh, maxRows = 10 }: ReportPreviewProps) {
  return (
    <div className="surface-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <h4 className="text-sm font-semibold">
          Preview{result ? ` (${Math.min(result.rowCount, maxRows)} of ${result.rowCount} rows)` : ''}
        </h4>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      <div className="flex-1 p-4 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !result && (
          <EmptyState
            title="No preview available"
            description="Add columns to your report to see a preview"
            className="py-8"
          />
        )}

        {!isLoading && result && (
          <PreviewContent
            result={result}
            vizType={vizType}
            chartConfig={chartConfig}
            maxRows={maxRows}
          />
        )}
      </div>
    </div>
  );
}

interface PreviewContentProps {
  result: ReportResult;
  vizType: VisualizationType;
  chartConfig: ReportConfig['chartConfig'];
  maxRows: number;
}

function PreviewContent({ result, vizType, chartConfig, maxRows }: PreviewContentProps) {
  const rows = result.rows.slice(0, maxRows);

  if (vizType === 'TABLE') {
    return <PreviewTable result={result} rows={rows} />;
  }

  if (vizType === 'BAR_CHART') {
    return (
      <div>
        {chartConfig?.title && <h5 className="text-sm font-medium text-center mb-3">{chartConfig.title}</h5>}
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
            <XAxis dataKey={chartConfig?.xAxis ?? result.columns[0]?.key} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => typeof v === 'number' && v > 999999 ? `₦${(v / 1000000).toFixed(1)}M` : String(v)} />
            <Tooltip formatter={(value, name) => [typeof value === 'number' && value > 10000 ? formatMoney(value) : value, name]} />
            <Bar dataKey={chartConfig?.yAxis ?? result.columns[1]?.key ?? result.columns[0]?.key} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (vizType === 'LINE_CHART') {
    return (
      <div>
        {chartConfig?.title && <h5 className="text-sm font-medium text-center mb-3">{chartConfig.title}</h5>}
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
            <XAxis dataKey={chartConfig?.xAxis ?? result.columns[0]?.key} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => typeof v === 'number' && v > 999999 ? `₦${(v / 1000000).toFixed(1)}M` : String(v)} />
            <Tooltip formatter={(value, name) => [typeof value === 'number' && value > 10000 ? formatMoney(value) : value, name]} />
            <Line
              type="monotone"
              dataKey={chartConfig?.yAxis ?? result.columns[1]?.key ?? result.columns[0]?.key}
              stroke={CHART_COLORS[0]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (vizType === 'PIE_CHART') {
    const dataKey = chartConfig?.yAxis ?? result.columns[1]?.key ?? result.columns[0]?.key;
    const nameKey = chartConfig?.xAxis ?? result.columns[0]?.key;
    return (
      <div>
        {chartConfig?.title && <h5 className="text-sm font-medium text-center mb-3">{chartConfig.title}</h5>}
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={rows} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}>
              {rows.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (vizType === 'SUMMARY_CARDS') {
    const numericCols = result.columns.filter((c) => c.type === 'NUMBER' || c.type === 'MONEY');
    const summary = result.summary ?? {};
    const displayCols = numericCols.length > 0 ? numericCols : result.columns.slice(0, 4);
    return (
      <div className="grid grid-cols-2 gap-3">
        {displayCols.slice(0, 6).map((col) => {
          const val = summary[col.key] ?? (rows[0]?.[col.key] as number) ?? 0;
          return (
            <StatCard
              key={col.key}
              label={col.label}
              value={val}
              format={col.type === 'MONEY' ? 'money' : 'number'}
              compact
            />
          );
        })}
      </div>
    );
  }

  if (vizType === 'COMBINED') {
    return (
      <div className="space-y-4">
        <div>
          {chartConfig?.title && <h5 className="text-sm font-medium text-center mb-2">{chartConfig.title}</h5>}
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
              <XAxis dataKey={chartConfig?.xAxis ?? result.columns[0]?.key} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={55} tickFormatter={(v) => typeof v === 'number' && v > 999999 ? `₦${(v / 1000000).toFixed(1)}M` : String(v)} />
              <Tooltip />
              <Bar dataKey={chartConfig?.yAxis ?? result.columns[1]?.key ?? result.columns[0]?.key} fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <PreviewTable result={result} rows={rows} compact />
      </div>
    );
  }

  return <PreviewTable result={result} rows={rows} />;
}

function PreviewTable({ result, rows, compact }: { result: ReportResult; rows: Record<string, unknown>[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {result.columns.map((col) => (
              <th key={col.key} className={`text-left font-semibold text-muted-foreground ${compact ? 'pb-1.5 pr-3 text-xs' : 'pb-2 pr-4'} whitespace-nowrap`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              {result.columns.map((col) => {
                const val = row[col.key];
                let display: string;
                if (col.type === 'MONEY' && typeof val === 'number') {
                  display = formatMoney(val);
                } else {
                  display = val == null ? '—' : String(val);
                }
                return (
                  <td key={col.key} className={`${compact ? 'py-1.5 pr-3 text-xs' : 'py-2 pr-4'} whitespace-nowrap`}>
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
