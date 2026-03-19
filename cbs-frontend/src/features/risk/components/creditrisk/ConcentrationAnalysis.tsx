import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { formatMoneyCompact, formatPercent } from '@/lib/formatters';
import { useSectorConcentration, useProductConcentration, useRatingConcentration } from '../../hooks/useCreditRisk';

const PRODUCT_COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#f97316', '#8b5cf6', '#ec4899', '#10b981'];

const gradeColors: Record<string, string> = {
  A: '#22c55e',
  B: '#14b8a6',
  C: '#f59e0b',
  D: '#f97316',
  E: '#ef4444',
};

function computeHhi(items: { pct: number }[]): number {
  return items.reduce((sum, item) => sum + Math.pow(item.pct, 2) * 100, 0);
}

function hhiLabel(hhi: number): { text: string; colorClass: string } {
  if (hhi < 1000) return { text: 'Diverse', colorClass: 'text-green-600' };
  if (hhi <= 2500) return { text: 'Moderately Concentrated', colorClass: 'text-amber-600' };
  return { text: 'Highly Concentrated', colorClass: 'text-red-600' };
}

export function ConcentrationAnalysis() {
  const { data: sectorData = [], isLoading: sectorLoading } = useSectorConcentration();
  const { data: productData = [], isLoading: productLoading } = useProductConcentration();
  const { data: ratingData = [], isLoading: ratingLoading } = useRatingConcentration();

  const sortedSectors = useMemo(
    () => [...sectorData].sort((a, b) => b.exposure - a.exposure),
    [sectorData],
  );

  const hhi = useMemo(() => computeHhi(sectorData), [sectorData]);
  const hhiInfo = hhiLabel(hhi);

  return (
    <div className="space-y-6 p-4">
      {/* Sector Concentration */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">By Sector</h4>
          {sectorData.length > 0 && (
            <span className="text-xs">
              HHI: {Math.round(hhi).toLocaleString()}
              {' — '}
              <span className={hhiInfo.colorClass}>{hhiInfo.text}</span>
            </span>
          )}
        </div>
        {sectorLoading ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : sortedSectors.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No sector data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, sortedSectors.length * 32)}>
            <BarChart
              data={sortedSectors}
              layout="vertical"
              margin={{ top: 0, right: 60, left: 120, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatMoneyCompact(v)} />
              <YAxis type="category" dataKey="sector" tick={{ fontSize: 11 }} width={110} />
              <Tooltip
                formatter={(value: number) => [formatMoneyCompact(value), 'Exposure']}
              />
              <Bar dataKey="exposure" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Product Concentration */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="text-sm font-semibold mb-3">By Product</h4>
        {productLoading ? (
          <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : productData.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">No product data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={productData}
                dataKey="exposure"
                nameKey="sector"
                cx="50%"
                cy="50%"
                outerRadius={65}
                label={({ sector, pct }) => `${sector} ${pct.toFixed(1)}%`}
                labelLine={false}
              >
                {productData.map((_, index) => (
                  <Cell key={index} fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [formatMoneyCompact(value), 'Exposure']} />
              <Legend
                formatter={(value) => {
                  const item = productData.find(d => d.sector === value);
                  return item ? `${value} (${item.pct.toFixed(1)}%)` : value;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Rating Grade Concentration */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="text-sm font-semibold mb-3">By Rating Grade</h4>
        {ratingLoading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">Loading...</div>
        ) : ratingData.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">No rating concentration data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground pr-4">Grade</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-4">Exposure</th>
                  <th className="pb-2 font-medium text-muted-foreground pr-4">Provision</th>
                  <th className="pb-2 font-medium text-muted-foreground">Coverage %</th>
                </tr>
              </thead>
              <tbody>
                {ratingData.map((row) => {
                  const color = gradeColors[row.grade] || '#94a3b8';
                  return (
                    <tr key={row.grade} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{formatMoneyCompact(row.exposure)}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{formatMoneyCompact(row.provision)}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[80px]">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${Math.min(row.coveragePct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono w-12">{formatPercent(row.coveragePct)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
