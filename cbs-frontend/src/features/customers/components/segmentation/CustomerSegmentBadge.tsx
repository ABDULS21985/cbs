import { cn } from '@/lib/utils';

interface CustomerSegmentBadgeProps {
  segmentCode: string;
  segmentName: string;
  colorCode?: string | null;
  size?: 'sm' | 'md';
}

const FALLBACK_COLORS: Record<string, string> = {
  PREMIUM: '#8b5cf6',
  RETAIL: '#3b82f6',
  CORPORATE: '#10b981',
  SME: '#f59e0b',
  PRIVATE: '#6366f1',
  DEFAULT: '#6b7280',
};

export function CustomerSegmentBadge({ segmentCode, segmentName, colorCode, size = 'sm' }: CustomerSegmentBadgeProps) {
  const color = colorCode || FALLBACK_COLORS[segmentCode.toUpperCase()] || FALLBACK_COLORS.DEFAULT;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
      style={{ backgroundColor: `${color}15`, color, borderLeft: `3px solid ${color}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {segmentName}
    </span>
  );
}
