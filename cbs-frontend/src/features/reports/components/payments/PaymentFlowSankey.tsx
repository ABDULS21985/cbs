import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SankeyFlow {
  source: string;
  target: string;
  value: number;
}

interface PaymentFlowSankeyProps {
  data: SankeyFlow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ColumnNode {
  id: string;
  value: number;
  y: number;
  height: number;
}

interface FlowLink {
  source: string;
  target: string;
  value: number;
  sourceY: number;
  targetY: number;
  height: number;
  color: string;
}

const COLUMN_COLORS: Record<number, string[]> = {
  0: ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
  1: ['#6366f1', '#14b8a6', '#f97316', '#e879f9', '#0ea5e9', '#84cc16'],
  2: ['#16a34a', '#eab308', '#ef4444', '#a855f7', '#0284c7', '#d946ef'],
};

function computeLayout(
  flows: SankeyFlow[],
  width: number,
  height: number,
): { columns: ColumnNode[][]; links: FlowLink[] } {
  // Identify unique nodes per column
  const sources = new Set<string>();
  const targets = new Set<string>();
  const midNodes = new Set<string>();

  for (const f of flows) {
    sources.add(f.source);
    targets.add(f.target);
  }

  // Determine columns: sources that are not targets -> col 0, targets that are also sources -> col 1, rest -> col 2
  const col0Ids = Array.from(sources).filter((s) => !targets.has(s));
  const col2Ids = Array.from(targets).filter((t) => !sources.has(t));
  const col1Ids = Array.from(sources).filter((s) => targets.has(s));

  // If there's no middle column, split targets
  const allColumns = col1Ids.length > 0 ? [col0Ids, col1Ids, col2Ids] : [col0Ids, col2Ids];

  // Compute node values
  const nodeValues: Record<string, number> = {};
  for (const f of flows) {
    nodeValues[f.source] = (nodeValues[f.source] || 0) + f.value;
    nodeValues[f.target] = (nodeValues[f.target] || 0) + f.value;
  }

  const padding = 8;
  const columns: ColumnNode[][] = [];

  for (const colIds of allColumns) {
    const sorted = [...colIds].sort((a, b) => (nodeValues[b] || 0) - (nodeValues[a] || 0));
    const totalValue = sorted.reduce((s, id) => s + (nodeValues[id] || 0), 0);
    const usableHeight = height - padding * (sorted.length - 1);

    let y = 0;
    const nodes: ColumnNode[] = sorted.map((id) => {
      const val = nodeValues[id] || 0;
      const h = Math.max(totalValue > 0 ? (val / totalValue) * usableHeight : 20, 8);
      const node: ColumnNode = { id, value: val, y, height: h };
      y += h + padding;
      return node;
    });
    columns.push(nodes);
  }

  // Compute links
  const links: FlowLink[] = [];
  const nodeMap: Record<string, { col: number; node: ColumnNode }> = {};
  columns.forEach((col, colIdx) => {
    col.forEach((node) => {
      nodeMap[node.id] = { col: colIdx, node };
    });
  });

  // Track y offsets for stacking flows
  const sourceOffsets: Record<string, number> = {};
  const targetOffsets: Record<string, number> = {};

  for (const f of flows) {
    const src = nodeMap[f.source];
    const tgt = nodeMap[f.target];
    if (!src || !tgt) continue;

    const srcOffset = sourceOffsets[f.source] || 0;
    const tgtOffset = targetOffsets[f.target] || 0;
    const flowHeight = src.node.value > 0 ? (f.value / src.node.value) * src.node.height : 4;

    const colors = COLUMN_COLORS[src.col] || COLUMN_COLORS[0];
    const colorIdx = columns[src.col].findIndex((n) => n.id === f.source);

    links.push({
      source: f.source,
      target: f.target,
      value: f.value,
      sourceY: src.node.y + srcOffset,
      targetY: tgt.node.y + tgtOffset,
      height: flowHeight,
      color: colors[colorIdx % colors.length],
    });

    sourceOffsets[f.source] = srcOffset + flowHeight;
    targetOffsets[f.target] = tgtOffset + flowHeight;
  }

  return { columns, links };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentFlowSankey({ data }: PaymentFlowSankeyProps) {
  const svgWidth = 600;
  const svgHeight = 360;
  const nodeWidth = 16;
  const chartPadding = 20;

  const layout = useMemo(() => {
    if (data.length === 0) return null;
    return computeLayout(data, svgWidth, svgHeight - chartPadding * 2);
  }, [data]);

  if (!layout || data.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Payment Flow</h2>
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          No payment flow data available
        </div>
      </div>
    );
  }

  const { columns, links } = layout;
  const columnCount = columns.length;
  const colSpacing = (svgWidth - chartPadding * 2 - nodeWidth * columnCount) / Math.max(columnCount - 1, 1);

  const columnLabels = columnCount === 3
    ? ['Channels', 'Payment Types', 'Outcomes']
    : ['Sources', 'Destinations'];

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Payment Flow</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Flow of payments from channels through payment types to outcomes
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[600px] mx-auto"
          aria-label="Payment flow diagram"
        >
          {/* Column headers */}
          {columns.map((_, colIdx) => {
            const x = chartPadding + colIdx * (nodeWidth + colSpacing) + nodeWidth / 2;
            return (
              <text
                key={`header-${colIdx}`}
                x={x}
                y={12}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] font-medium"
              >
                {columnLabels[colIdx] || ''}
              </text>
            );
          })}

          {/* Flow paths */}
          {links.map((link, i) => {
            const srcCol = columns.findIndex((col) => col.some((n) => n.id === link.source));
            const tgtCol = columns.findIndex((col) => col.some((n) => n.id === link.target));

            const x1 = chartPadding + srcCol * (nodeWidth + colSpacing) + nodeWidth;
            const x2 = chartPadding + tgtCol * (nodeWidth + colSpacing);
            const y1 = chartPadding + link.sourceY + link.height / 2;
            const y2 = chartPadding + link.targetY + link.height / 2;
            const cx1 = x1 + colSpacing * 0.4;
            const cx2 = x2 - colSpacing * 0.4;

            return (
              <path
                key={i}
                d={`M ${x1} ${y1 - link.height / 2}
                    C ${cx1} ${y1 - link.height / 2}, ${cx2} ${y2 - link.height / 2}, ${x2} ${y2 - link.height / 2}
                    L ${x2} ${y2 + link.height / 2}
                    C ${cx2} ${y2 + link.height / 2}, ${cx1} ${y1 + link.height / 2}, ${x1} ${y1 + link.height / 2}
                    Z`}
                fill={link.color}
                opacity={0.35}
                className="hover:opacity-60 transition-opacity"
              >
                <title>{`${link.source} → ${link.target}: ${formatMoneyCompact(link.value)}`}</title>
              </path>
            );
          })}

          {/* Nodes */}
          {columns.map((col, colIdx) => {
            const x = chartPadding + colIdx * (nodeWidth + colSpacing);
            const colors = COLUMN_COLORS[colIdx] || COLUMN_COLORS[0];
            return col.map((node, nodeIdx) => (
              <g key={node.id}>
                <rect
                  x={x}
                  y={chartPadding + node.y}
                  width={nodeWidth}
                  height={node.height}
                  rx={3}
                  fill={colors[nodeIdx % colors.length]}
                  className="hover:opacity-80 transition-opacity"
                >
                  <title>{`${node.id}: ${formatMoneyCompact(node.value)}`}</title>
                </rect>
                <text
                  x={colIdx === 0 ? x - 4 : colIdx === columnCount - 1 ? x + nodeWidth + 4 : x + nodeWidth + 4}
                  y={chartPadding + node.y + node.height / 2}
                  textAnchor={colIdx === 0 ? 'end' : 'start'}
                  dominantBaseline="central"
                  className="fill-foreground text-[9px]"
                >
                  {node.id}
                </text>
              </g>
            ));
          })}
        </svg>
      </div>
    </div>
  );
}
