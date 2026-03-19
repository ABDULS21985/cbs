import { cn } from '@/lib/utils';
import type { CrossSellCell } from '../../api/customerAnalyticsApi';

interface CrossSellMatrixProps {
  data: CrossSellCell[];
  isLoading: boolean;
}

const PRODUCTS = ['Savings', 'Current', 'Card', 'Loan', 'Fixed Deposit', 'Mobile'];

function heatmapColor(probability: number): string {
  if (probability >= 65) return 'bg-green-500 text-white';
  if (probability >= 45) return 'bg-green-300 text-green-900';
  if (probability >= 30) return 'bg-yellow-300 text-yellow-900';
  if (probability >= 15) return 'bg-orange-300 text-orange-900';
  return 'bg-red-300 text-red-900';
}

function heatmapLegendColor(probability: number): string {
  if (probability >= 65) return '#22c55e';
  if (probability >= 45) return '#86efac';
  if (probability >= 30) return '#fde047';
  if (probability >= 15) return '#fdba74';
  return '#fca5a5';
}

function CellTooltip({ from, to, prob }: { from: string; to: string; prob: number }) {
  return (
    <span
      className="absolute z-50 hidden group-hover:flex flex-col bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 bg-popover border rounded-lg shadow-lg text-xs p-2 space-y-0.5 pointer-events-none"
    >
      <span className="font-semibold text-foreground">{from} → {to}</span>
      <span className="text-muted-foreground">Conversion probability: <span className="text-foreground font-medium">{prob}%</span></span>
    </span>
  );
}

export function CrossSellMatrix({ data, isLoading }: CrossSellMatrixProps) {
  const cellMap = new Map<string, number>();
  data.forEach((c) => cellMap.set(`${c.fromProduct}||${c.toProduct}`, c.probability));

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4 h-80 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Cross-Sell Conversion Probability Matrix</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Probability that a customer holding the row product will accept the column product
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left pr-3 py-1.5 text-muted-foreground font-medium whitespace-nowrap w-32">
                Currently Holds ↓ / Target →
              </th>
              {PRODUCTS.map((col) => (
                <th key={col} className="text-center px-1 py-1.5 text-muted-foreground font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((from) => (
              <tr key={from} className="border-t border-muted/40">
                <td className="pr-3 py-1.5 font-semibold text-foreground whitespace-nowrap">{from}</td>
                {PRODUCTS.map((to) => {
                  if (from === to) {
                    return (
                      <td key={to} className="px-1 py-1.5 text-center">
                        <div className="w-12 h-8 mx-auto rounded bg-muted/40 flex items-center justify-center text-muted-foreground text-xs">
                          —
                        </div>
                      </td>
                    );
                  }
                  const prob = cellMap.get(`${from}||${to}`) ?? 0;
                  return (
                    <td key={to} className="px-1 py-1.5 text-center">
                      <div className="relative group inline-block">
                        <div
                          className={cn(
                            'w-12 h-8 rounded flex items-center justify-center text-xs font-bold cursor-default transition-opacity hover:opacity-80',
                            heatmapColor(prob),
                          )}
                        >
                          {prob}%
                        </div>
                        <CellTooltip from={from} to={to} prob={prob} />
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
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { label: 'High (≥65%)', prob: 70 },
          { label: 'Good (45–65%)', prob: 55 },
          { label: 'Medium (30–45%)', prob: 38 },
          { label: 'Low (15–30%)', prob: 22 },
          { label: 'Very Low (<15%)', prob: 8 },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: heatmapLegendColor(item.prob) }}
            />
            {item.label}
          </div>
        ))}
      </div>

      <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-900">
        <span className="font-semibold">Insight:</span> 72% of Savings customers who don't have a Card are likely to accept one — highest single-product cross-sell opportunity in the portfolio.
      </div>
    </div>
  );
}
