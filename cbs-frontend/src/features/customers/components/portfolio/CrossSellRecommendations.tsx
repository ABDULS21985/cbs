import { Lightbulb } from 'lucide-react';

interface Recommendation {
  product: string;
  reason: string;
  icon?: string;
}

interface Props {
  recommendations: Recommendation[];
}

export function CrossSellRecommendations({ recommendations }: Props) {
  if (!recommendations.length) return null;

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Cross-Sell Recommendations</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{rec.product}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
