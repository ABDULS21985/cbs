import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { RelationshipGraphData, RelationshipNode } from '../types/customer';

interface RelationshipGraphProps {
  data?: RelationshipGraphData;
  centralCustomerId: number;
  centralCustomerName: string;
  isLoading: boolean;
}

const NODE_COLORS: Record<string, string> = {
  INDIVIDUAL: '#3b82f6',
  CORPORATE: '#8b5cf6',
  GUARANTOR: '#10b981',
  DIRECTOR: '#f59e0b',
  SHAREHOLDER: '#06b6d4',
};

function nodeColor(node: RelationshipNode): string {
  if (node.isSanctioned) return '#111827';
  if (node.isPep) return '#dc2626';
  if (node.riskRating === 'HIGH' || node.riskRating === 'VERY_HIGH') return '#f59e0b';
  return NODE_COLORS[node.type] || '#6b7280';
}

export function RelationshipGraph({ data, centralCustomerId, centralCustomerName, isLoading }: RelationshipGraphProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
        No relationship data available
      </div>
    );
  }

  // Simple radial layout: center node + surrounding nodes
  const centerX = 250;
  const centerY = 150;
  const radius = 110;

  const otherNodes = data.nodes.filter((n) => n.id !== centralCustomerId);
  const angleStep = otherNodes.length > 0 ? (2 * Math.PI) / otherNodes.length : 0;

  const positions = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    map.set(centralCustomerId, { x: centerX, y: centerY });
    otherNodes.forEach((node, i) => {
      const angle = angleStep * i - Math.PI / 2;
      map.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });
    return map;
  }, [data.nodes, centralCustomerId, otherNodes.length]);

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">Relationship Network</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600" /> PEP</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-100" /> Sanctioned</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> High Risk</span>
        </div>
      </div>

      <svg viewBox="0 0 500 300" className="w-full h-auto" style={{ maxHeight: 300 }}>
        {/* Edges */}
        {data.edges.map((edge, i) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2 - 8;
          return (
            <g key={i}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth="1.5" className="text-border" strokeDasharray={edge.ownershipPct ? undefined : '4 3'} />
              <text x={midX} y={midY} textAnchor="middle" fontSize="8" fill="currentColor" className="text-muted-foreground">
                {edge.relationshipType.replace(/_/g, ' ')}
                {edge.ownershipPct ? ` (${edge.ownershipPct}%)` : ''}
              </text>
            </g>
          );
        })}

        {/* Central node */}
        <g className="cursor-default">
          <circle cx={centerX} cy={centerY} r={24} fill="hsl(var(--primary))" opacity={0.15} />
          <circle cx={centerX} cy={centerY} r={20} fill="hsl(var(--primary))" />
          <text x={centerX} y={centerY + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white" fontWeight="bold">
            {centralCustomerName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
          </text>
          <text x={centerX} y={centerY + 32} textAnchor="middle" fontSize="9" fill="currentColor" className="text-foreground" fontWeight="600">
            {centralCustomerName.length > 18 ? centralCustomerName.slice(0, 16) + '...' : centralCustomerName}
          </text>
        </g>

        {/* Other nodes */}
        {otherNodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const color = nodeColor(node);
          const initials = node.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <g key={node.id} className="cursor-pointer" onClick={() => navigate(`/customers/${node.id}`)}>
              <circle cx={pos.x} cy={pos.y} r={16} fill={color} opacity={0.85} />
              <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="white" fontWeight="bold">
                {initials}
              </text>
              <text x={pos.x} y={pos.y + 26} textAnchor="middle" fontSize="8" fill="currentColor" className="text-muted-foreground">
                {node.name.length > 16 ? node.name.slice(0, 14) + '...' : node.name}
              </text>
              {node.isPep && <circle cx={pos.x + 12} cy={pos.y - 12} r={4} fill="#dc2626" />}
              {node.isSanctioned && <circle cx={pos.x + 12} cy={pos.y - 12} r={4} fill="#111827" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
