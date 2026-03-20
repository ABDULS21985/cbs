import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SectorItem {
  sector: string;
  amount: number;
  pct: number;
  color: string;
}

export interface GeographicItem {
  region: string;
  amount: number;
  pct: number;
  color: string;
}

export interface ObligorItem {
  rank: number;
  name: string;
  exposure: number;
  capitalPct: number;
  classification: string;
}

export interface ProductItem {
  product: string;
  amount: number;
  pct: number;
  color: string;
}

interface ConcentrationDashboardProps {
  sectorData: SectorItem[];
  geographicData: GeographicItem[];
  obligorData: ObligorItem[];
  productData: ProductItem[];
  regulatoryLimit?: number;
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────

function SectorTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SectorItem;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{d.sector}</p>
      <p className="text-muted-foreground">
        Exposure: <span className="font-medium text-foreground">{formatMoneyCompact(d.amount)}</span>
      </p>
      <p className="text-muted-foreground">
        Share: <span className="font-medium text-foreground">{d.pct.toFixed(1)}%</span>
      </p>
    </div>
  );
}

function GeoTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as GeographicItem;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{d.region}</p>
      <p className="text-muted-foreground">
        Exposure: <span className="font-medium text-foreground">{formatMoneyCompact(d.amount)}</span>
      </p>
      <p className="text-muted-foreground">
        Share: <span className="font-medium text-foreground">{d.pct.toFixed(1)}%</span>
      </p>
    </div>
  );
}

function ProductTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ProductItem;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{d.product}</p>
      <p className="text-muted-foreground">
        Amount: <span className="font-medium text-foreground">{formatMoneyCompact(d.amount)}</span>
      </p>
      <p className="text-muted-foreground">
        Share: <span className="font-medium text-foreground">{d.pct.toFixed(1)}%</span>
      </p>
    </div>
  );
}

// ─── Classification badge ─────────────────────────────────────────────────────

function getClassBadge(classification: string): string {
  switch (classification) {
    case 'PASS': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'WATCH': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'SUBSTANDARD': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'DOUBTFUL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'LOSS': return 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300';
    default: return 'bg-muted text-muted-foreground';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConcentrationDashboard({
  sectorData,
  geographicData,
  obligorData,
  productData,
  regulatoryLimit = 20,
}: ConcentrationDashboardProps) {
  const totalProduct = productData.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Concentration Dashboard</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          4-quadrant view: sector, geographic, top obligors, and product concentration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top-left: Sector Exposure */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Sector Exposure</h3>
          {sectorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sectorData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 0 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<SectorTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                <ReferenceLine x={regulatoryLimit} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Limit ${regulatoryLimit}%`, position: 'top', fontSize: 9, fill: '#dc2626' }} />
                <Bar dataKey="pct" radius={[0, 3, 3, 0]}>
                  {sectorData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">No sector data</div>
          )}
        </div>

        {/* Top-right: Geographic */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Geographic Distribution</h3>
          {geographicData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={geographicData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 0 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<GeoTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                <Bar dataKey="pct" radius={[0, 3, 3, 0]}>
                  {geographicData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">No geographic data</div>
          )}
        </div>

        {/* Bottom-left: Top 20 Obligors */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Top 20 Obligors</h3>
          <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
            <table className="w-full text-xs" aria-label="Top 20 obligors">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left font-medium text-muted-foreground pb-1.5 pr-2">#</th>
                  <th className="text-left font-medium text-muted-foreground pb-1.5 px-1">Name</th>
                  <th className="text-right font-medium text-muted-foreground pb-1.5 px-1">Exposure</th>
                  <th className="text-right font-medium text-muted-foreground pb-1.5 px-1">% Capital</th>
                  <th className="text-center font-medium text-muted-foreground pb-1.5 pl-1">Class.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {obligorData.slice(0, 20).map((o) => (
                  <tr key={o.rank} className="hover:bg-muted/30 transition-colors">
                    <td className="py-1.5 pr-2 text-muted-foreground">{o.rank}</td>
                    <td className="py-1.5 px-1 font-medium text-foreground truncate max-w-[120px]">{o.name}</td>
                    <td className="py-1.5 px-1 text-right tabular-nums text-foreground">{formatMoneyCompact(o.exposure)}</td>
                    <td className={cn('py-1.5 px-1 text-right tabular-nums font-semibold', o.capitalPct > 10 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                      {o.capitalPct.toFixed(1)}%
                    </td>
                    <td className="py-1.5 pl-1 text-center">
                      <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold', getClassBadge(o.classification))}>
                        {o.classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {obligorData.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground">No obligor data</div>
            )}
          </div>
        </div>

        {/* Bottom-right: Product Mix Donut */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Product Mix</h3>
          {productData.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={productData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="amount"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {productData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip content={<ProductTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-muted-foreground">Total</span>
                  <span className="text-sm font-bold text-foreground">{formatMoneyCompact(totalProduct)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs w-full">
                {productData.map((p) => (
                  <span key={p.product} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-muted-foreground truncate">{p.product}</span>
                    <span className="font-semibold text-foreground ml-auto">{p.pct.toFixed(0)}%</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">No product data</div>
          )}
        </div>
      </div>
    </div>
  );
}
