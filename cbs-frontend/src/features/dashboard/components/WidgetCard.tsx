import { cn } from '@/lib/utils';
import { RefreshCw, Loader2, Info } from 'lucide-react';
import { type ReactNode } from 'react';

interface WidgetCardProps {
  title: string;
  children: ReactNode;
  colSpan: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
  info?: string;
  headerRight?: ReactNode;
}

export function WidgetCard({ title, children, colSpan, isLoading, onRefresh, className, info, headerRight }: WidgetCardProps) {
  return (
    <div className={cn('surface-card shadow-sm overflow-hidden', className)} style={{ gridColumn: `span ${colSpan}` }}>
      <div className="flex items-center justify-between px-5 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {info && (
            <div className="relative group/tip">
              <Info className="w-3.5 h-3.5 text-muted-foreground/40 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg border opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {info}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {onRefresh && (
            <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
