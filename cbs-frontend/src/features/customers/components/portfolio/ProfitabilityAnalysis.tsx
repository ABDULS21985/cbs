import { InfoGrid } from '@/components/shared/InfoGrid';

interface Props {
  revenue: number;
  costOfFunds: number;
  operatingCost: number;
  provisions: number;
  netProfit: number;
  roc: number;
  currency?: string;
}

export function ProfitabilityAnalysis({ revenue, costOfFunds, operatingCost, provisions, netProfit, roc, currency = 'NGN' }: Props) {
  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-semibold mb-4">Profitability Analysis</h3>
      <InfoGrid
        columns={3}
        items={[
          { label: 'Revenue', value: revenue, format: 'money', currency },
          { label: 'Cost of Funds', value: costOfFunds, format: 'money', currency },
          { label: 'Operating Cost', value: operatingCost, format: 'money', currency },
          { label: 'Provisions', value: provisions, format: 'money', currency },
          { label: 'Net Profit', value: netProfit, format: 'money', currency, mono: true },
          { label: 'Return on Customer', value: roc, format: 'percent' },
        ]}
      />
    </div>
  );
}
