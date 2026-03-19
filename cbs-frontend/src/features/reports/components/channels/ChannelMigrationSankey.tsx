import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { MigrationData } from '../../api/channelAnalyticsApi';

interface ChannelMigrationSankeyProps {
  data: MigrationData[];
  migrationScore: string;
}

interface NodeBox {
  id: string;
  label: string;
  count: number;
  color: string;
  side: 'left' | 'right';
  trend?: 'up' | 'down';
}

interface FlowLine {
  fromId: string;
  toId: string;
  customerCount: number;
  migrationPct: number;
  color: string;
}

const CHANNEL_META: Record<string, { label: string; color: string; trend: 'up' | 'down' }> = {
  BRANCH: { label: 'Branch',  color: '#6b7280', trend: 'down' },
  ATM:    { label: 'ATM',     color: '#f59e0b', trend: 'down' },
  USSD:   { label: 'USSD',    color: '#10b981', trend: 'down' },
  MOBILE: { label: 'Mobile',  color: '#3b82f6', trend: 'up'   },
  WEB:    { label: 'Web',     color: '#8b5cf6', trend: 'up'   },
};

const FLOW_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#f97316'];

export function ChannelMigrationSankey({ data, migrationScore }: ChannelMigrationSankeyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgLines, setSvgLines] = useState<
    Array<{ x1: number; y1: number; x2: number; y2: number; color: string; strokeWidth: number; key: string }>
  >([]);

  // Build node lists
  const fromChannels = [...new Set(data.map((d) => d.fromChannel))];
  const toChannels   = [...new Set(data.map((d) => d.toChannel))];

  // Aggregate counts per channel
  const fromCounts: Record<string, number> = {};
  const toCounts: Record<string, number> = {};
  for (const d of data) {
    fromCounts[d.fromChannel] = (fromCounts[d.fromChannel] || 0) + d.customerCount;
    toCounts[d.toChannel]     = (toCounts[d.toChannel]     || 0) + d.customerCount;
  }

  const leftNodes: NodeBox[] = fromChannels.map((ch) => ({
    id:    ch,
    label: CHANNEL_META[ch]?.label || ch,
    count: fromCounts[ch],
    color: CHANNEL_META[ch]?.color || '#6b7280',
    side:  'left',
    trend: CHANNEL_META[ch]?.trend,
  }));

  const rightNodes: NodeBox[] = toChannels.map((ch) => ({
    id:    ch,
    label: CHANNEL_META[ch]?.label || ch,
    count: toCounts[ch],
    color: CHANNEL_META[ch]?.color || '#6b7280',
    side:  'right',
    trend: CHANNEL_META[ch]?.trend,
  }));

  const flows: FlowLine[] = data.map((d, i) => ({
    fromId:        d.fromChannel,
    toId:          d.toChannel,
    customerCount: d.customerCount,
    migrationPct:  d.migrationPct,
    color:         FLOW_COLORS[i % FLOW_COLORS.length],
  }));

  const maxFlow = Math.max(...flows.map((f) => f.customerCount));

  // After render, measure DOM positions to draw SVG lines
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const lines: typeof svgLines = [];

    for (const flow of flows) {
      const fromEl = container.querySelector(`[data-node="${flow.fromId}"]`);
      const toEl   = container.querySelector(`[data-node="${flow.toId}"]`);
      if (!fromEl || !toEl) continue;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect   = toEl.getBoundingClientRect();

      const x1 = fromRect.right  - containerRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
      const x2 = toRect.left     - containerRect.left;
      const y2 = toRect.top + toRect.height / 2 - containerRect.top;

      const strokeWidth = Math.max(2, Math.round((flow.customerCount / maxFlow) * 12));

      lines.push({ x1, y1, x2, y2, color: flow.color, strokeWidth, key: `${flow.fromId}-${flow.toId}` });
    }
    setSvgLines(lines);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Channel Migration Flow</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Customer migration from traditional to digital channels over the past 12 months
        </p>
      </div>

      {/* Migration score banner */}
      <div className="mb-5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">{migrationScore}</p>
        </div>
      </div>

      {/* Sankey layout */}
      <div ref={containerRef} className="relative">
        <div className="grid grid-cols-3 gap-8 items-start">
          {/* Left column: Source channels */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              From (Traditional)
            </div>
            {leftNodes.map((node) => (
              <div
                key={node.id}
                data-node={node.id}
                className={cn(
                  'rounded-lg border-2 px-4 py-3 text-sm font-semibold flex items-center justify-between',
                  'bg-card hover:shadow-sm transition-shadow',
                )}
                style={{ borderColor: node.color }}
              >
                <span style={{ color: node.color }}>{node.label}</span>
                <div className="text-right">
                  <div className="tabular-nums text-xs text-muted-foreground">
                    {node.count.toLocaleString()} migrated
                  </div>
                  <div className="text-red-500 text-[10px] font-medium mt-0.5">↓ declining</div>
                </div>
              </div>
            ))}
          </div>

          {/* Center: migration stats */}
          <div className="flex flex-col items-center justify-center pt-8 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {data.reduce((s, d) => s + d.customerCount, 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">customers migrated</div>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="space-y-2 w-full">
              {flows.map((f) => (
                <div key={`${f.fromId}-${f.toId}`} className="text-xs flex items-center justify-between gap-2 bg-muted/30 rounded px-2 py-1">
                  <span className="text-muted-foreground">
                    {CHANNEL_META[f.fromId]?.label} → {CHANNEL_META[f.toId]?.label}
                  </span>
                  <span className="font-semibold tabular-nums">{f.migrationPct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: Destination channels */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              To (Digital)
            </div>
            {rightNodes.map((node) => (
              <div
                key={node.id}
                data-node={node.id}
                className={cn(
                  'rounded-lg border-2 px-4 py-3 text-sm font-semibold flex items-center justify-between',
                  'bg-card hover:shadow-sm transition-shadow',
                )}
                style={{ borderColor: node.color }}
              >
                <span style={{ color: node.color }}>{node.label}</span>
                <div className="text-right">
                  <div className="tabular-nums text-xs text-muted-foreground">
                    {node.count.toLocaleString()} received
                  </div>
                  <div className="text-green-500 text-[10px] font-medium mt-0.5">↑ growing</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SVG overlay for flow lines */}
        {svgLines.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            {svgLines.map((line) => {
              const cpx1 = line.x1 + (line.x2 - line.x1) * 0.4;
              const cpx2 = line.x1 + (line.x2 - line.x1) * 0.6;
              return (
                <path
                  key={line.key}
                  d={`M ${line.x1} ${line.y1} C ${cpx1} ${line.y1} ${cpx2} ${line.y2} ${line.x2} ${line.y2}`}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={line.strokeWidth}
                  strokeOpacity={0.35}
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
