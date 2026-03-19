import { cn } from '@/lib/utils';
import type { EligibilityRules } from '../../api/productApi';

const EXISTING_PRODUCTS = [
  { code: null, label: 'None (Standalone product)' },
  { code: 'SAV-CLASSIC-001', label: 'Classic Savings Account' },
  { code: 'SAV-PREMIUM-001', label: 'Premium Savings Account' },
  { code: 'CURR-BIZ-001', label: 'Business Current Account' },
  { code: 'CORP-CURR-001', label: 'Corporate Current Account' },
  { code: 'FD-90DAY-001', label: '90-Day Fixed Deposit' },
];

interface EligibilityRuleBuilderProps {
  rules: EligibilityRules;
  onChange: (rules: EligibilityRules) => void;
  readOnly?: boolean;
}

const inputCls = (readOnly?: boolean) =>
  cn(
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
    readOnly && 'bg-muted cursor-not-allowed',
  );

const selectCls = (readOnly?: boolean) =>
  cn(
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
    readOnly && 'bg-muted cursor-not-allowed pointer-events-none',
  );

function buildPreviewText(rules: EligibilityRules): string {
  const parts: string[] = [];

  const typeMap: Record<EligibilityRules['customerType'], string> = {
    INDIVIDUAL: 'individual',
    CORPORATE: 'corporate',
    JOINT: 'joint account',
    ANY: 'any',
  };
  let typePart = `Available to ${typeMap[rules.customerType]} customers`;

  if (rules.customerType === 'INDIVIDUAL' && rules.minimumAge) {
    typePart += ` aged ${rules.minimumAge}+`;
  }
  parts.push(typePart);

  parts.push(`KYC Level ${rules.kycLevel}+`);

  if (rules.minimumOpeningBalance > 0) {
    parts.push(`₦${rules.minimumOpeningBalance.toLocaleString()} minimum opening balance`);
  }

  if (rules.segment !== 'ALL') {
    parts.push(`${rules.segment.toLowerCase()} segment`);
  }

  if (rules.existingProductRequired) {
    parts.push(`requires existing ${rules.existingProductRequired} product`);
  }

  if (rules.geographicScope === 'SPECIFIC') {
    parts.push('limited geographic scope');
  }

  return parts.join(', ') + '.';
}

export function EligibilityRuleBuilder({ rules, onChange, readOnly }: EligibilityRuleBuilderProps) {
  const update = <K extends keyof EligibilityRules>(field: K, value: EligibilityRules[K]) => {
    if (readOnly) return;
    onChange({ ...rules, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Type */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Customer Type</label>
          <select
            value={rules.customerType}
            onChange={(e) => update('customerType', e.target.value as EligibilityRules['customerType'])}
            className={selectCls(readOnly)}
            disabled={readOnly}
          >
            <option value="INDIVIDUAL">Individual</option>
            <option value="CORPORATE">Corporate</option>
            <option value="JOINT">Joint Account</option>
            <option value="ANY">Any</option>
          </select>
        </div>

        {/* Minimum Age (only for INDIVIDUAL) */}
        {rules.customerType === 'INDIVIDUAL' && (
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Minimum Age
              <span className="text-muted-foreground font-normal ml-1">(years)</span>
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={rules.minimumAge ?? ''}
              onChange={(e) => update('minimumAge', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="e.g. 18"
              className={inputCls(readOnly)}
              readOnly={readOnly}
            />
          </div>
        )}

        {/* KYC Level */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Minimum KYC Level</label>
          <select
            value={rules.kycLevel}
            onChange={(e) => update('kycLevel', Number(e.target.value))}
            className={selectCls(readOnly)}
            disabled={readOnly}
          >
            <option value={1}>Level 1 — Basic (BVN + ID)</option>
            <option value={2}>Level 2 — Verified (Utility bill + photo)</option>
            <option value={3}>Level 3 — Enhanced (Full CDD)</option>
          </select>
        </div>

        {/* Minimum Opening Balance */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Minimum Opening Balance
            <span className="text-muted-foreground font-normal ml-1">(₦)</span>
          </label>
          <input
            type="number"
            min={0}
            value={rules.minimumOpeningBalance}
            onChange={(e) => update('minimumOpeningBalance', Number(e.target.value))}
            placeholder="0"
            className={inputCls(readOnly)}
            readOnly={readOnly}
          />
        </div>

        {/* Segment */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Customer Segment</label>
          <select
            value={rules.segment}
            onChange={(e) => update('segment', e.target.value as EligibilityRules['segment'])}
            className={selectCls(readOnly)}
            disabled={readOnly}
          >
            <option value="ALL">All Segments</option>
            <option value="STANDARD">Standard</option>
            <option value="PREMIUM">Premium</option>
          </select>
        </div>

        {/* Existing Product Required */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Existing Product Required</label>
          <select
            value={rules.existingProductRequired ?? ''}
            onChange={(e) => update('existingProductRequired', e.target.value === '' ? null : e.target.value)}
            className={selectCls(readOnly)}
            disabled={readOnly}
          >
            {EXISTING_PRODUCTS.map((p) => (
              <option key={p.code ?? 'none'} value={p.code ?? ''}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Geographic Scope */}
      <div>
        <label className="block text-sm font-medium mb-2">Geographic Scope</label>
        <div className="flex gap-4">
          {(['ALL', 'SPECIFIC'] as const).map((scope) => (
            <label
              key={scope}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors',
                rules.geographicScope === scope
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/30',
                readOnly && 'pointer-events-none',
              )}
            >
              <input
                type="radio"
                name="geographicScope"
                value={scope}
                checked={rules.geographicScope === scope}
                onChange={() => update('geographicScope', scope)}
                className="accent-primary"
                disabled={readOnly}
              />
              <span className="text-sm font-medium">
                {scope === 'ALL' ? 'Nationwide' : 'Specific Regions'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Live Rule Preview */}
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Rule Preview
        </p>
        <p className="text-sm text-foreground leading-relaxed">{buildPreviewText(rules)}</p>
      </div>
    </div>
  );
}
