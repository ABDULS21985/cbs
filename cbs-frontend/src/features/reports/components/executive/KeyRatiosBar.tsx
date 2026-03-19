import { cn } from '@/lib/utils';
import type { KeyRatio } from '../../api/executiveReportApi';

// ─── Single Ratio Row ─────────────────────────────────────────────────────────

function RatioRow({ ratio }: { ratio: KeyRatio }) {
  // Compute target marker position as % of the bar width
  // We'll normalise the target against the barFill scale: max barFill=100 maps to full bar
  // Target marker: target / (value * (100/barFill)) * 100
  const scale = ratio.barFill > 0 ? ratio.value / ratio.barFill : 1; // value per 1% bar
  const targetPct = Math.min((ratio.target / scale), 100);

  const barColor = ratio.met ? 'bg-green-500 dark:bg-green-500' : 'bg-red-500 dark:bg-red-500';

  return (
    <div className="grid grid-cols-[200px_1fr_100px] gap-3 items-center py-2.5 border-b border-border/50 last:border-0">
      {/* Label */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">{ratio.label}</span>
      </div>

      {/* Bar */}
      <div className="relative h-5 rounded-full bg-muted overflow-visible">
        {/* Fill */}
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-all', barColor)}
          style={{ width: `${ratio.barFill}%` }}
        />

        {/* Target dashed marker */}
        <div
          className="absolute inset-y-0 w-px bg-foreground/60"
          style={{
            left: `${targetPct}%`,
            borderLeft: '2px dashed hsl(var(--foreground) / 0.5)',
            background: 'none',
          }}
        />

        {/* Target label tooltip */}
        <div
          className="absolute -top-5 text-[10px] text-muted-foreground whitespace-nowrap -translate-x-1/2"
          style={{ left: `${targetPct}%` }}
        >
          {ratio.targetLabel}
        </div>

        {/* Peer average dot */}
        {ratio.peerAvg !== undefined && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-background bg-amber-500 shadow-sm z-10"
            style={{ left: `${Math.min((ratio.peerAvg / scale), 100)}%`, transform: 'translate(-50%, -50%)' }}
            title={`Peer avg: ${ratio.peerAvg}%`}
          />
        )}
      </div>

      {/* Right side: value + indicator */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm font-semibold tabular-nums">{ratio.formatted}</span>
        <span className="text-base leading-none" title={ratio.met ? 'Target met' : 'Target not met'}>
          {ratio.met ? '✅' : '⚠️'}
        </span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface KeyRatiosBarProps {
  ratios: KeyRatio[];
}

export function KeyRatiosBar({ ratios }: KeyRatiosBarProps) {
  const metCount = ratios.filter((r) => r.met).length;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Key Regulatory &amp; Performance Ratios</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {metCount} of {ratios.length} targets met &mdash; dashed line = target, amber dot = peer average
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Met target
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> Below target
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-background bg-amber-500 shadow-sm" /> Peer avg
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="mt-6">
        {ratios.map((ratio) => (
          <RatioRow key={ratio.label} ratio={ratio} />
        ))}
      </div>
    </div>
  );
}
