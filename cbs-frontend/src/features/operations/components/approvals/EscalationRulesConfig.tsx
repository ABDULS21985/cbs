import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EscalationRule } from '../../api/approvalApi';

interface EscalationRulesConfigProps {
  rules: EscalationRule[];
  onSave: (rules: EscalationRule[]) => void;
  loading?: boolean;
}

function getRuleTypeLabel(type: EscalationRule['type']): string {
  if (type === 'ALL') return 'All Types (Default)';
  const labels: Record<string, string> = {
    ACCOUNT_OPENING: 'Account Opening',
    LOAN_APPROVAL: 'Loan Approval',
    PAYMENT_APPROVAL: 'Payment Approval',
    FEE_WAIVER: 'Fee Waiver',
    RATE_OVERRIDE: 'Rate Override',
    PARAMETER_CHANGE: 'Parameter Change',
    USER_CREATION: 'User Creation',
    CARD_REQUEST: 'Card Request',
    WRITE_OFF: 'Write-Off',
    RESTRUCTURE: 'Restructure',
    LIMIT_CHANGE: 'Limit Change',
    KYC_OVERRIDE: 'KYC Override',
  };
  return labels[type] ?? type;
}

export function EscalationRulesConfig({ rules, onSave, loading = false }: EscalationRulesConfigProps) {
  const [localRules, setLocalRules] = useState<EscalationRule[]>(() => rules.map((r) => ({ ...r })));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateRule = (id: string, field: keyof EscalationRule, value: string | number | boolean) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    await onSave(localRules);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3.5">
        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Escalation rules define when pending approvals are automatically escalated to supervisors.
          <strong> Notify After</strong> sends a reminder email; <strong>Escalate After</strong> re-assigns to the escalation target.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Approval Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notify After (hrs)</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Escalate After (hrs)</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Escalate To (email)</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {localRules.map((rule) => (
              <tr
                key={rule.id}
                className={cn(
                  'transition-colors',
                  !rule.active && 'opacity-50',
                  'hover:bg-muted/20',
                )}
              >
                {/* Type */}
                <td className="px-4 py-3">
                  <p className="text-sm font-medium">{getRuleTypeLabel(rule.type)}</p>
                  {rule.type === 'ALL' && (
                    <p className="text-xs text-muted-foreground">Applies when no specific rule matches</p>
                  )}
                </td>

                {/* Notify After */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={rule.notifyAfterHours}
                      min={1}
                      max={168}
                      onChange={(e) => updateRule(rule.id, 'notifyAfterHours', parseInt(e.target.value, 10) || 0)}
                      className="w-20 px-2 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-center"
                      disabled={!rule.active}
                    />
                    <span className="text-xs text-muted-foreground">hrs</span>
                  </div>
                </td>

                {/* Escalate After */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={rule.escalateAfterHours}
                      min={1}
                      max={168}
                      onChange={(e) => updateRule(rule.id, 'escalateAfterHours', parseInt(e.target.value, 10) || 0)}
                      className={cn(
                        'w-20 px-2 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-center',
                        rule.escalateAfterHours <= rule.notifyAfterHours
                          ? 'border-amber-400'
                          : 'border-border',
                      )}
                      disabled={!rule.active}
                    />
                    <span className="text-xs text-muted-foreground">hrs</span>
                  </div>
                  {rule.escalateAfterHours <= rule.notifyAfterHours && rule.active && (
                    <p className="text-xs text-amber-600 mt-1">Should be &gt; notify hours</p>
                  )}
                </td>

                {/* Escalate To */}
                <td className="px-4 py-3">
                  <input
                    type="email"
                    value={rule.escalateTo}
                    onChange={(e) => updateRule(rule.id, 'escalateTo', e.target.value)}
                    className="w-full min-w-[200px] px-2 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={!rule.active}
                    placeholder="email@cbabank.ng"
                  />
                </td>

                {/* Active Toggle */}
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => updateRule(rule.id, 'active', !rule.active)}
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                      rule.active ? 'bg-primary' : 'bg-muted-foreground/30',
                    )}
                    role="switch"
                    aria-checked={rule.active}
                  >
                    <span
                      className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                        rule.active ? 'translate-x-4' : 'translate-x-1',
                      )}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between">
        <div>
          {saved && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Changes saved successfully.
            </p>
          )}
          {dirty && !saved && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              You have unsaved changes.
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={loading || !dirty}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
