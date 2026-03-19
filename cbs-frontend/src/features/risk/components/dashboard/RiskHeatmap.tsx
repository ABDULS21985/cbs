import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskHeatmapCell } from '../../types/dashboard';

interface Props {
  data: RiskHeatmapCell[];
  isLoading?: boolean;
}

const LIKELIHOODS = ['RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'CERTAIN'] as const;
const IMPACTS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const cellColor = (lIdx: number, iIdx: number) => {
  const score = (lIdx + 1) * (iIdx + 1); // 1-20
  if (score <= 4) return 'bg-green-100 hover:bg-green-200 text-green-800';
  if (score <= 9) return 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800';
  if (score <= 15) return 'bg-orange-100 hover:bg-orange-200 text-orange-800';
  return 'bg-red-100 hover:bg-red-200 text-red-800';
};

interface PopoverState {
  likelihood: string;
  impact: string;
  risks: string[];
  count: number;
}

export function RiskHeatmap({ data, isLoading }: Props) {
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const getCell = (likelihood: string, impact: string): RiskHeatmapCell | undefined =>
    (data ?? []).find((c) => c.likelihood === likelihood && c.impact === impact);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="h-5 w-32 bg-muted rounded animate-pulse mb-4" />
        <div className="grid gap-1 animate-pulse" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)' }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 relative">
      <h3 className="text-sm font-semibold mb-4">Risk Heatmap</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-24 text-right pr-3 pb-2 text-muted-foreground font-medium">
                Impact →<br />Likelihood ↓
              </th>
              {IMPACTS.map((impact) => (
                <th key={impact} className="text-center pb-2 font-medium text-muted-foreground px-1">
                  {impact}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LIKELIHOODS.map((likelihood, lIdx) => (
              <tr key={likelihood}>
                <td className="text-right pr-3 py-1 font-medium text-muted-foreground whitespace-nowrap">
                  {likelihood}
                </td>
                {IMPACTS.map((impact, iIdx) => {
                  const cell = getCell(likelihood, impact);
                  const count = cell?.count ?? 0;
                  return (
                    <td key={impact} className="px-1 py-1">
                      <button
                        onClick={() =>
                          cell && count > 0
                            ? setPopover({ likelihood, impact, risks: cell.risks, count })
                            : undefined
                        }
                        title={cell?.risks.join(', ') || undefined}
                        className={cn(
                          'w-full h-10 rounded flex items-center justify-center font-semibold transition-colors',
                          cellColor(lIdx, iIdx),
                          count === 0 && 'opacity-40 cursor-default',
                          count > 0 && 'cursor-pointer',
                        )}
                      >
                        {count > 0 ? count : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {popover && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/10 rounded-lg">
          <div className="bg-card border rounded-lg shadow-lg p-4 max-w-xs w-full mx-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">
                {popover.likelihood} × {popover.impact}
              </h4>
              <button
                onClick={() => setPopover(null)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{popover.count} risk(s)</p>
            <ul className="space-y-1">
              {popover.risks.map((risk, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
