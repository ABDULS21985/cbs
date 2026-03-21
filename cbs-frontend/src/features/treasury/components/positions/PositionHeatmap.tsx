import { formatMoney } from '@/lib/formatters';
import { type DealerDesk, type TraderPosition } from '../../api/tradingApi';

interface PositionHeatmapProps {
  desks: DealerDesk[];
  positions: TraderPosition[];
}

function tone(utilizationPct: number) {
  if (utilizationPct >= 90) return 'bg-red-100 text-red-800 border-red-200';
  if (utilizationPct >= 70) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (utilizationPct > 0) return 'bg-green-100 text-green-800 border-green-200';
  return 'bg-background text-muted-foreground border-border';
}

export function PositionHeatmap({ desks, positions }: PositionHeatmapProps) {
  const instruments = Array.from(new Set(positions.map((position) => position.instrument))).sort();

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Position Heatmap</h3>
          <p className="text-xs text-muted-foreground">
            Net desk exposure by instrument, colored by live utilization.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            Normal
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Watch
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Breach
          </span>
        </div>
      </div>

      {desks.length === 0 || instruments.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No live positions are available to build the heatmap.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-2 text-xs">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Desk</th>
                {instruments.map((instrument) => (
                  <th key={instrument} className="px-3 py-2 text-center font-medium text-muted-foreground">
                    {instrument}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {desks.map((desk) => (
                <tr key={desk.id}>
                  <td className="min-w-[180px] rounded-lg border bg-muted/20 px-3 py-3 align-top">
                    <p className="font-medium text-foreground">{desk.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">{desk.code}</p>
                  </td>
                  {instruments.map((instrument) => {
                    const relatedPositions = positions.filter(
                      (position) => position.deskId === desk.id && position.instrument === instrument,
                    );
                    const exposure = relatedPositions.reduce(
                      (sum, position) => sum + position.netExposure,
                      0,
                    );
                    const limit = relatedPositions.reduce(
                      (max, position) => Math.max(max, position.positionLimit),
                      0,
                    );
                    const utilizationPct = limit > 0 ? (Math.abs(exposure) / limit) * 100 : 0;

                    return (
                      <td key={`${desk.id}-${instrument}`} className="align-top">
                        <div className={`rounded-lg border px-3 py-3 ${tone(utilizationPct)}`}>
                          <p className="font-mono text-[11px] font-semibold">
                            {exposure === 0 ? 'Flat' : formatMoney(exposure)}
                          </p>
                          <p className="mt-1 text-[11px]">
                            {limit > 0 ? `${utilizationPct.toFixed(1)}% of limit` : 'No limit'}
                          </p>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
