import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CreditCard, MessageSquare, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MoneyInput, FormSection } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { SignatoryManager, type Signatory } from './SignatoryManager';
import type { CustomerSearchResult, Product } from '../../api/accountOpeningApi';

export interface AccountConfig {
  accountTitle: string;
  initialDeposit: number;
  signatories: Signatory[];
  signingRule: string;
  requestDebitCard: boolean;
  smsAlerts: boolean;
  eStatement: boolean;
}

interface AccountConfigStepProps {
  customer: CustomerSearchResult;
  product: Product;
  currency: string;
  initialValues?: Partial<AccountConfig>;
  onNext: (config: AccountConfig) => void;
  onBack: () => void;
}

interface ToggleCheckboxProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleCheckbox({ icon, label, description, checked, onChange }: ToggleCheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'opening-selection-card flex items-center gap-3 w-full',
        checked && 'opening-selection-card-active',
      )}
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', checked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', checked && 'text-primary')}>{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', checked ? 'border-primary bg-primary' : 'border-muted-foreground')}>
        {checked && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

export function AccountConfigStep({ customer, product, currency, initialValues, onNext, onBack }: AccountConfigStepProps) {
  const [accountTitle, setAccountTitle] = useState(initialValues?.accountTitle || customer.fullName);
  const [initialDeposit, setInitialDeposit] = useState(initialValues?.initialDeposit ?? 0);
  const [signatories, setSignatories] = useState<Signatory[]>(initialValues?.signatories || []);
  const [signingRule, setSigningRule] = useState(initialValues?.signingRule || 'ANY_ONE');
  const [requestDebitCard, setRequestDebitCard] = useState(initialValues?.requestDebitCard ?? false);
  const [smsAlerts, setSmsAlerts] = useState(initialValues?.smsAlerts ?? true);
  const [eStatement, setEStatement] = useState(initialValues?.eStatement ?? true);
  const [titleError, setTitleError] = useState('');
  const [depositError, setDepositError] = useState('');

  useEffect(() => {
    if (initialValues?.accountTitle) setAccountTitle(initialValues.accountTitle);
  }, [initialValues?.accountTitle]);

  const validate = (): boolean => {
    let valid = true;
    if (!accountTitle.trim() || accountTitle.trim().length < 2) {
      setTitleError('Account title must be at least 2 characters');
      valid = false;
    } else {
      setTitleError('');
    }
    if (initialDeposit < 0) {
      setDepositError('Initial deposit cannot be negative');
      valid = false;
    } else if (initialDeposit > 0 && initialDeposit < product.minimumBalance) {
      setDepositError(`Minimum deposit is ${formatMoney(product.minimumBalance, currency)}`);
      valid = false;
    } else {
      setDepositError('');
    }
    return valid;
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext({
      accountTitle: accountTitle.trim(),
      initialDeposit,
      signatories,
      signingRule,
      requestDebitCard,
      smsAlerts,
      eStatement,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Account Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure the account details and linked services.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="opening-kpi-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Customer</p>
          <p className="mt-2 text-sm font-semibold">{customer.fullName}</p>
          <p className="mt-1 text-xs text-muted-foreground">{customer.type} · {customer.segment}</p>
        </div>
        <div className="opening-kpi-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Product</p>
          <p className="mt-2 text-sm font-semibold">{product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{product.code} · {currency}</p>
        </div>
        <div className="opening-kpi-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Minimum Balance</p>
          <p className="mt-2 text-sm font-semibold">{formatMoney(product.minimumBalance, currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Set the opening deposit accordingly</p>
        </div>
      </div>

      {/* Basic details */}
      <FormSection title="Account Details">
        <div className="space-y-4">
          {/* Account Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Account Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={accountTitle}
              onChange={(e) => { setAccountTitle(e.target.value); setTitleError(''); }}
              maxLength={100}
              className={cn(
                'opening-field-input',
                titleError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-primary/30',
              )}
              placeholder="e.g. John Doe or ABC Limited"
            />
            {titleError && <p className="text-xs text-red-500 mt-1">{titleError}</p>}
            <p className="text-xs text-muted-foreground mt-1">Usually the customer's full name or business name.</p>
          </div>

          {/* Initial Deposit */}
          <div>
            <MoneyInput
              label="Initial Deposit"
              value={initialDeposit}
              onChange={(v) => { setInitialDeposit(v); setDepositError(''); }}
              currency={currency}
              min={0}
              error={depositError}
            />
            {product.minimumBalance > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Minimum balance: <span className="font-mono font-medium">{formatMoney(product.minimumBalance, currency)}</span>
              </p>
            )}
          </div>
        </div>
      </FormSection>

      {/* Signatories — always show for corporate, optional toggle for individual */}
      {customer.type === 'CORPORATE' ? (
        <FormSection title="Signatories & Mandate" description="Manage account signatories and authorization rules">
          <SignatoryManager
            signatories={signatories}
            onChange={setSignatories}
            signingRule={signingRule}
            onRuleChange={setSigningRule}
          />
        </FormSection>
      ) : (
        <FormSection title="Joint Account Signatories" description="Optional: Add co-signatories for a joint account" collapsible defaultOpen={signatories.length > 0}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              To open a joint account, search and add additional account holders below.
            </p>
            <SignatoryManager
              signatories={signatories}
              onChange={setSignatories}
              signingRule={signingRule}
              onRuleChange={setSigningRule}
            />
          </div>
        </FormSection>
      )}

      {/* Linked Products */}
      <FormSection title="Linked Services" description="Choose additional services to activate with this account">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ToggleCheckbox
            icon={<CreditCard className="w-4 h-4" />}
            label="Debit Card"
            description="Instant-issue or standard debit card"
            checked={requestDebitCard}
            onChange={setRequestDebitCard}
          />
          <ToggleCheckbox
            icon={<MessageSquare className="w-4 h-4" />}
            label="SMS Alerts"
            description="Transaction and balance notifications"
            checked={smsAlerts}
            onChange={setSmsAlerts}
          />
          <ToggleCheckbox
            icon={<FileText className="w-4 h-4" />}
            label="e-Statement"
            description="Monthly electronic account statements"
            checked={eStatement}
            onChange={setEStatement}
          />
        </div>
      </FormSection>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="btn-primary"
        >
          Continue to Compliance
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
