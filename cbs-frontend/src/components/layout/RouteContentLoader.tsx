import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteContentLoaderProps {
  className?: string;
}

export function RouteContentLoader({ className }: RouteContentLoaderProps) {
  return (
    <div className={cn('flex min-h-[40vh] items-center justify-center', className)}>
      <div className="flex items-center gap-3 surface-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading module...
      </div>
    </div>
  );
}
