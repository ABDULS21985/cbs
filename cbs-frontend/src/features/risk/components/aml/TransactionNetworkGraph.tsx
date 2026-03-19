import { useState } from 'react';
import { formatMoney } from '@/lib/formatters';

interface NetworkNode {
  id: string;
  label: string;
  amount?: number;
  currency?: string;
  flagged?: boolean;
  isSubject?: boolean;
}

interface Props {
  subject: NetworkNode;
  connected: NetworkNode[];
}

interface TooltipState {
  node: NetworkNode;
  x: number;
  y: number;
}

const SVG_SIZE = 340;
const CENTER = SVG_SIZE / 2;
const SUBJECT_R = 32;
const CONNECTED_R = 20;
const ORBIT_R = 120;

export function TransactionNetworkGraph({ subject, connected }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const visible = connected.slice(0, 8);
  const angleStep = (2 * Math.PI) / Math.max(visible.length, 1);

  const nodes = visible.map((node, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    return {
      ...node,
      cx: CENTER + ORBIT_R * Math.cos(angle),
      cy: CENTER + ORBIT_R * Math.sin(angle),
    };
  });

  return (
    <div className="border rounded-lg p-4 relative">
      <h4 className="text-sm font-semibold mb-3">Transaction Network</h4>
      <div className="flex justify-center">
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          className="overflow-visible"
        >
          {/* Lines from center to each connected node */}
          {nodes.map((node) => (
            <line
              key={`line-${node.id}`}
              x1={CENTER}
              y1={CENTER}
              x2={node.cx}
              y2={node.cy}
              stroke="#e5e7eb"
              strokeWidth={1.5}
            />
          ))}

          {/* Connected entity nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as SVGGElement).getBoundingClientRect();
                setTooltip({ node, x: rect.left, y: rect.top });
              }}
              onMouseLeave={() => setTooltip(null)}
              className="cursor-pointer"
            >
              <circle
                cx={node.cx}
                cy={node.cy}
                r={CONNECTED_R}
                fill={node.flagged ? '#fef2f2' : '#f9fafb'}
                stroke={node.flagged ? '#ef4444' : '#d1d5db'}
                strokeWidth={node.flagged ? 2 : 1}
              />
              <text
                x={node.cx}
                y={node.cy + 4}
                textAnchor="middle"
                fontSize={8}
                fill={node.flagged ? '#ef4444' : '#374151'}
                className="select-none"
              >
                {node.label.slice(0, 8)}
              </text>
              {node.flagged && (
                <text
                  x={node.cx + CONNECTED_R - 4}
                  y={node.cy - CONNECTED_R + 4}
                  textAnchor="middle"
                  fontSize={10}
                  className="select-none"
                >
                  ⚠
                </text>
              )}
            </g>
          ))}

          {/* Subject node (center) */}
          <g
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as SVGGElement).getBoundingClientRect();
              setTooltip({ node: { ...subject, isSubject: true }, x: rect.left, y: rect.top });
            }}
            onMouseLeave={() => setTooltip(null)}
            className="cursor-pointer"
          >
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SUBJECT_R}
              fill="#eff6ff"
              stroke="#3b82f6"
              strokeWidth={2}
            />
            <text
              x={CENTER}
              y={CENTER + 4}
              textAnchor="middle"
              fontSize={9}
              fill="#1d4ed8"
              fontWeight="600"
              className="select-none"
            >
              {subject.label.slice(0, 10)}
            </text>
            <text
              x={CENTER}
              y={CENTER + 16}
              textAnchor="middle"
              fontSize={7}
              fill="#6b7280"
              className="select-none"
            >
              Subject
            </text>
          </g>
        </svg>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-popover border rounded-lg shadow-lg p-2 text-xs pointer-events-none"
          style={{ top: tooltip.y - 70, left: tooltip.x - 10 }}
        >
          <p className="font-semibold">{tooltip.node.label}</p>
          {tooltip.node.amount !== undefined && (
            <p className="text-muted-foreground">
              {formatMoney(tooltip.node.amount, tooltip.node.currency ?? 'NGN')}
            </p>
          )}
          {tooltip.node.flagged && <p className="text-red-600">Flagged entity</p>}
          {tooltip.node.isSubject && <p className="text-blue-600">Subject of investigation</p>}
        </div>
      )}
    </div>
  );
}
