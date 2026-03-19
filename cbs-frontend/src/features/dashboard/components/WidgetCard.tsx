import { cn } from '@/lib/utils';
import { RefreshCw, Loader2 } from 'lucide-react';
import { type ReactNode } from 'react';

interface WidgetCardProps {
  title: string;
  children: ReactNode;
  colSpan: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function WidgetCard({ title, children, colSpan, isLoading, onRefresh, className }: WidgetCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)} style={{ gridColumn: `span ${colSpan}` }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-1">
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {onRefresh && (
            <button onClick={onRefresh} className="p-1 rounded hover:bg-muted transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
