import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

const RISK_FACTORS = [
  { key: 'pep', label: 'PEP Status', desc: 'Is the customer a Politically Exposed Person?', weight: 25 },
  { key: 'sanctions', label: 'Sanctions Screening', desc: 'Has the customer been screened against sanctions lists?', weight: 20 },
  { key: 'adverseMedia', label: 'Adverse Media', desc: 'Any negative media coverage found?', weight: 15 },
  { key: 'transactionPattern', label: 'Unusual Transaction Pattern', desc: 'Any suspicious or unusual activity detected?', weight: 15 },
  { key: 'highRiskOccupation', label: 'High-Risk Occupation', desc: 'Occupation in a high-risk industry?', weight: 10 },
  { key: 'highRiskCountry', label: 'High-Risk Country', desc: 'Nationality or residence in a high-risk jurisdiction?', weight: 15 },
];

const SOURCE_OF_FUNDS = ['EMPLOYMENT', 'BUSINESS', 'INHERITANCE', 'INVESTMENT', 'OTHER'];

interface RiskAssessmentFormProps {
  currentRating?: string;
  onRatingChange?: (rating: string) => void;
}

export function RiskAssessmentForm({ currentRating, onRatingChange }: RiskAssessmentFormProps) {
  const [factors, setFactors] = useState<Record<string, boolean>>(
    Object.fromEntries(RISK_FACTORS.map((f) => [f.key, false])),
  );
  const [factorNotes, setFactorNotes] = useState<Record<string, string>>({});
  const [sourceOfFunds, setSourceOfFunds] = useState('EMPLOYMENT');

  const riskScore = useMemo(() => {
    return RISK_FACTORS.reduce((score, f) => score + (factors[f.key] ? f.weight : 0), 0);
  }, [factors]);

  const suggestedRating = riskScore >= 70 ? 'VERY_HIGH' : riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW';

  const toggleFactor = (key: string) => {
    setFactors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const barColor = riskScore >= 70 ? 'bg-red-500' : riskScore >= 50 ? 'bg-orange-500' : riskScore >= 25 ? 'bg-amber-500' : 'bg-green-500';
  const textColor = riskScore >= 70 ? 'text-red-600' : riskScore >= 50 ? 'text-orange-600' : riskScore >= 25 ? 'text-amber-600' : 'text-green-600';

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold">Risk Assessment</h3>

      {/* Risk score bar */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Risk Score</span>
          <span className={cn('text-lg font-bold font-mono', textColor)}>{riskScore}/100</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
          <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${riskScore}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Suggested:</span>
          <span className={cn('text-xs font-bold', textColor)}>{suggestedRating}</span>
        </div>
      </div>

      {/* Risk factors */}
      <div className="space-y-3">
        {RISK_FACTORS.map((f) => (
          <div key={f.key} className={cn('rounded-lg border p-3 transition-colors', factors[f.key] ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/30' : '')}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={factors[f.key]} onChange={() => toggleFactor(f.key)} className="accent-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">+{f.weight}</span>
            </label>
            {factors[f.key] && (
              <input
                value={factorNotes[f.key] ?? ''}
                onChange={(e) => setFactorNotes((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder="Add notes..."
                className="mt-2 w-full px-2 py-1 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            )}
          </div>
        ))}
      </div>

      {/* Source of Funds */}
      <div>
        <label className="block text-xs font-medium mb-1">Source of Funds</label>
        <select value={sourceOfFunds} onChange={(e) => setSourceOfFunds(e.target.value)} className={inputCls}>
          {SOURCE_OF_FUNDS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}
