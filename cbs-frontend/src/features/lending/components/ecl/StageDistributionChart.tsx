import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoneyCompact, formatPercent } from '@/lib/formatters';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3 } from 'lucide-react';
import type { StageDistributionItem } from '../../types/ecl';

interface Props {
  data: StageDistributionItem[];
  onStageClick?: (stage: 1 | 2 | 3) => void;
  selectedStage?: 1 | 2 | 3 | null;
}

const COLORS: Record<string, string> = {
  'Stage 1': '#22c55e',
  'Stage 2': '#f59e0b',
  'Stage 3': '#ef4444',
};

const STAGE_NUMBER: Record<string, 1 | 2 | 3> = {
  'Stage 1': 1,
  'Stage 2': 2,
  'Stage 3': 3,
};

interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  amount?: number;
  pct?: number;
  depth?: number;
}

function CustomTreemapContent(props: TreemapContentProps & { onStageClick?: (stage: 1 | 2 | 3) => void; selectedStage?: 1 | 2 | 3 | null }) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', amount = 0, pct = 0, onStageClick, selectedStage } = props;

  if (width < 30 || height < 30) return null;

  const color = COLORS[name] ?? '#94a3b8';
  const stageNum = STAGE_NUMBER[name];
  const isSelected = selectedStage === stageNum;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={isSelected ? 1 : 0.8}
        stroke={isSelected ? '#1e293b' : '#fff'}
        strokeWidth={isSelected ? 2 : 1}
        style={{ cursor: onStageClick ? 'pointer' : 'default' }}
        onClick={() => onStageClick && stageNum && onStageClick(stageNum)}
      />
      {width > 60 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 10}
            textAnchor="middle"
            fill="#fff"
            fontSize={13}
            fontWeight="600"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
          >
            {formatMoneyCompact(amount)}
          </text>
          {height > 60 && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 24}
              textAnchor="middle"
              fill="rgba(255,255,255,0.85)"
              fontSize={11}
            >
              {formatPercent(pct)}
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function StageDistributionChart({ data, onStageClick, selectedStage }: Props) {
  if (!data || data.length === 0) {
    return <EmptyState icon={BarChart3} title="No stage distribution data" />;
  }

  const treemapData = data.map((item) => ({
    name: item.stage,
    amount: item.amount,
    size: item.amount,
    pct: item.pct,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <Treemap
        data={treemapData}
        dataKey="size"
        nameKey="name"
        content={
          <CustomTreemapContent
            onStageClick={onStageClick}
            selectedStage={selectedStage}
          />
        }
      >
        <Tooltip
          formatter={(value: number) => [formatMoneyCompact(value), 'ECL Amount']}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
