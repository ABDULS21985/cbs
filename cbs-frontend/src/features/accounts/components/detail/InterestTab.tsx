import { FormSection, InfoGrid } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { Account } from '../../api/accountDetailApi';
import { Info } from 'lucide-react';

interface InterestTabProps {
  account: Account;
}

export function InterestTab({ account }: InterestTabProps) {
  return (
    <div className="p-6 space-y-6">
      <FormSection title="Interest Summary" description="Interest data currently exposed by the live account endpoint.">
        <InfoGrid
          columns={3}
          items={[
            { label: 'Current Rate (p.a.)', value: formatPercent(account.interestRate) },
            { label: 'Accrued Interest', value: formatMoney(account.accruedInterest, account.currency) },
            { label: 'Ledger Balance', value: formatMoney(account.ledgerBalance, account.currency) },
            { label: 'Statement Frequency', value: account.statementFrequency },
            { label: 'Last Interest Calculation', value: account.lastInterestCalcDate ?? 'Not yet calculated', format: account.lastInterestCalcDate ? 'date' : undefined },
            { label: 'Last Interest Posting', value: account.lastInterestPostDate ?? 'Not yet posted', format: account.lastInterestPostDate ? 'date' : undefined },
          ]}
        />
      </FormSection>

      <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Interest posting history is not exposed by the current backend contract, so this tab shows the live summary only.
        </p>
      </div>
    </div>
  );
}
