import type { VintageCell } from '../../api/loanAnalyticsApi';

interface VintageHeatmapProps {
  data: VintageCell[];
}

const MONTH_COLUMNS = ['M3', 'M6', 'M9', 'M12', 'M18', 'M24'];

function getCellColor(rate: number | null): string {
  if (rate === null) return '#f3f4f6';
  if (rate < 1) return '#dcfce7';
  if (rate < 2) return '#86efac';
  if (rate < 3) return '#fde68a';
  if (rate <= 5) return '#fdba74';
  return '#fca5a5';
}

function getCellTextColor(rate: number | null): string {
  if (rate === null) return '#9ca3af';
  if (rate < 1) return '#166534';
  if (rate < 2) return '#14532d';
  if (rate < 3) return '#713f12';
  if (rate <= 5) return '#7c2d12';
  return '#7f1d1d';
}

interface LegendEntry {
  label: string;
  color: string;
  textColor: string;
}

const LEGEND: LegendEntry[] = [
  { label: '< 1%', color: '#dcfce7', textColor: '#166534' },
  { label: '1–2%', color: '#86efac', textColor: '#14532d' },
  { label: '2–3%', color: '#fde68a', textColor: '#713f12' },
  { label: '3–5%', color: '#fdba74', textColor: '#7c2d12' },
  { label: '> 5%', color: '#fca5a5', textColor: '#7f1d1d' },
  { label: 'N/A', color: '#f3f4f6', textColor: '#9ca3af' },
];

export function VintageHeatmap({ data }: VintageHeatmapProps) {
  // Build a map: vintage -> month -> rate
  const grid: Record<string, Record<string, number>> = {};
  const vintageSet = new Set<string>();

  for (const cell of data) {
    vintageSet.add(cell.vintage);
    if (!grid[cell.vintage]) grid[cell.vintage] = {};
    grid[cell.vintage][cell.month] = cell.defaultRate;
  }

  // Maintain insertion order for vintages
  const vintages = Array.from(vintageSet);

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Vintage Default Rate Heatmap</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cumulative default rate (%) by origination quarter and months on book. Empty cells indicate data not yet available.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left text-muted-foreground font-medium pr-4 pb-2 w-24">Vintage</th>
              {MONTH_COLUMNS.map((m) => (
                <th
                  key={m}
                  className="text-center text-muted-foreground font-medium pb-2 w-16"
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="space-y-1">
            {vintages.map((vintage) => (
              <tr key={vintage}>
                <td className="pr-4 py-1 font-medium text-foreground whitespace-nowrap">{vintage}</td>
                {MONTH_COLUMNS.map((month) => {
                  const rate = grid[vintage]?.[month] ?? null;
                  const bg = getCellColor(rate);
                  const fg = getCellTextColor(rate);
                  return (
                    <td key={month} className="py-1 px-1 text-center">
                      <div
                        className="w-14 h-10 mx-auto rounded flex items-center justify-center font-semibold transition-transform hover:scale-105"
                        style={{ backgroundColor: bg, color: fg }}
                        title={rate !== null ? `${vintage} ${month}: ${rate.toFixed(1)}% default rate` : `${vintage} ${month}: No data yet`}
                      >
                        {rate !== null ? `${rate.toFixed(1)}%` : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 flex-wrap pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground mr-2">Default rate:</span>
        {LEGEND.map((entry) => (
          <div
            key={entry.label}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: entry.color, color: entry.textColor }}
          >
            {entry.label}
          </div>
        ))}
      </div>
    </div>
  );
}
