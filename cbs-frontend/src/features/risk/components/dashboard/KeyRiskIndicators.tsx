import { KriSparkline } from './KriSparkline';
import type { KriIndicator } from '../../types/dashboard';

interface Props {
  data: KriIndicator[];
  isLoading?: boolean;
}

export function KeyRiskIndicators({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 animate-pulse">
            <div className="flex-1 h-3 bg-muted rounded" />
            <div className="w-20 h-8 bg-muted rounded" />
            <div className="w-20 h-4 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const display = (data ?? []).slice(0, 6);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-2">Key Risk Indicators</h3>
      <div className="divide-y">
        {display.map((kri) => (
          <KriSparkline key={kri.name} kri={kri} />
        ))}
        {display.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No KRI data available</p>
        )}
      </div>
    </div>
  );
}
