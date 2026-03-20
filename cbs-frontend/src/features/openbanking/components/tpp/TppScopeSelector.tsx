import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { TppClientType } from '../../api/openBankingApi';

const ALL_SCOPES = [
  { id: 'accounts', label: 'Accounts', category: 'read' },
  { id: 'transactions', label: 'Transactions', category: 'read' },
  { id: 'balance', label: 'Balance', category: 'read' },
  { id: 'beneficiaries', label: 'Beneficiaries', category: 'read' },
  { id: 'payments', label: 'Payments', category: 'write' },
] as const;

const AISP_SCOPES = ['accounts', 'transactions', 'balance', 'beneficiaries'];
const PISP_SCOPES = ['payments'];
const BOTH_SCOPES = [...AISP_SCOPES, ...PISP_SCOPES];

interface TppScopeSelectorProps {
  selectedScopes: string[];
  onChange: (scopes: string[]) => void;
  clientType?: TppClientType;
  autoSelect?: boolean;
}

export function TppScopeSelector({
  selectedScopes,
  onChange,
  clientType,
  autoSelect = true,
}: TppScopeSelectorProps) {
  useEffect(() => {
    if (!autoSelect || !clientType) return;
    const defaultScopes =
      clientType === 'TPP_AISP'
        ? AISP_SCOPES
        : clientType === 'TPP_PISP'
          ? PISP_SCOPES
          : BOTH_SCOPES;
    onChange(defaultScopes);
    // Only run when clientType changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientType, autoSelect]);

  const toggleScope = (scopeId: string) => {
    if (selectedScopes.includes(scopeId)) {
      onChange(selectedScopes.filter((s) => s !== scopeId));
    } else {
      onChange([...selectedScopes, scopeId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_SCOPES.map((scope) => {
        const isSelected = selectedScopes.includes(scope.id);
        return (
          <button
            key={scope.id}
            type="button"
            onClick={() => toggleScope(scope.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              isSelected
                ? scope.category === 'write'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border',
            )}
          >
            {scope.label}
          </button>
        );
      })}
    </div>
  );
}
