import { CreditCard, Landmark, HandCoins, Wallet, Home, Lightbulb, Target } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ProductRecommendation } from '../../types/customer';

const PRODUCT_ICONS: Record<string, typeof Wallet> = {
  CREDIT_CARD: CreditCard,
  FIXED_DEPOSIT: Landmark,
  LOAN: HandCoins,
  SAVINGS: Wallet,
  MORTGAGE: Home,
};

interface LegacyRecommendation {
  product: string;
  reason: string;
  icon?: string;
}

interface Props {
  recommendations: LegacyRecommendation[] | ProductRecommendation[];
  customerName?: string;
}

function isApiRecommendation(rec: LegacyRecommendation | ProductRecommendation): rec is ProductRecommendation {
  return 'potentialRevenue' in rec;
}

export function CrossSellRecommendations({ recommendations, customerName }: Props) {
  if (!recommendations.length) return null;

  // Check if these are API-powered recommendations
  const hasApiData = recommendations.length > 0 && isApiRecommendation(recommendations[0]);

  if (hasApiData) {
    const apiRecs = recommendations as ProductRecommendation[];
    return (
      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">
            Recommended{customerName ? ` for ${customerName}` : ''}
          </h3>
        </div>
        <div className="space-y-3">
          {apiRecs.sort((a, b) => a.priority - b.priority).map((rec) => {
            const Icon = PRODUCT_ICONS[rec.icon] || Lightbulb;
            return (
              <div key={rec.id} className="rounded-lg border p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{rec.product}</p>
                      {rec.peerAdoptionPct > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {rec.peerAdoptionPct}% of peers
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                    {rec.potentialRevenue > 0 && (
                      <p className="text-xs font-medium text-green-600 mt-1">
                        Potential annual revenue: {formatMoney(rec.potentialRevenue)}
                      </p>
                    )}
                    <button
                      onClick={() => toast.success(`${rec.actionLabel} initiated for ${rec.product}`)}
                      className="mt-2 text-xs px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      {rec.actionLabel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Legacy fallback for simple recommendations
  const legacyRecs = recommendations as LegacyRecommendation[];
  return (
    <div className="space-y-3">
      {legacyRecs.map((rec, i) => (
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
  );
}
