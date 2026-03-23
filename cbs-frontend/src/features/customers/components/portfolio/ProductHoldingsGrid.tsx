import { Landmark, HandCoins, CreditCard, TrendingUp, Shield } from 'lucide-react';

interface ProductHolding {
  category: string;
  items: { name: string; value?: string; status?: string }[];
}

interface Props {
  holdings: ProductHolding[];
  currency?: string;
}

const categoryIcons: Record<string, any> = {
  Deposits: Landmark,
  Lending: HandCoins,
  Cards: CreditCard,
  Investments: TrendingUp,
  Insurance: Shield,
};

export function ProductHoldingsGrid({ holdings }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {holdings.map((holding) => {
        const Icon = categoryIcons[holding.category] || Landmark;
        return (
          <div key={holding.category} className="surface-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold">{holding.category}</h4>
            </div>
            <div className="space-y-2">
              {holding.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-mono font-medium">{item.value || item.status || '—'}</span>
                </div>
              ))}
              {holding.items.length === 0 && (
                <p className="text-xs text-muted-foreground">No products</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
