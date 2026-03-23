import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/formatters';
import { Check, ChevronRight, ChevronLeft, Building2, Wallet, Users, ClipboardCheck } from 'lucide-react';
import { MccSelector, suggestRiskCategory } from '../components/MerchantForm';
import { useOnboardMerchant } from '../hooks/useCardData';
import { toast } from 'sonner';

const STEPS = [
  { label: 'Business Info', icon: Building2 },
  { label: 'Financial Setup', icon: Wallet },
  { label: 'Contact & Compliance', icon: Users },
  { label: 'Review & Submit', icon: ClipboardCheck },
];

interface FormState {
  merchantName: string;
  merchantCategoryCode: string;
  businessType: string;
  registrationNumber: string;
  mdrRate: number;
  settlementFrequency: string;
  settlementAccountId: string;
  riskCategory: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

const INITIAL: FormState = {
  merchantName: '',
  merchantCategoryCode: '',
  businessType: '',
  registrationNumber: '',
  mdrRate: 1.5,
  settlementFrequency: 'DAILY',
  settlementAccountId: '',
  riskCategory: 'LOW',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
};

export function MerchantOnboardPage() {
  const navigate = useNavigate();
  const onboard = useOnboardMerchant();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);

  const update = (field: keyof FormState, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const canProceed = () => {
    if (step === 0) return !!form.merchantName && !!form.merchantCategoryCode && !!form.businessType;
    if (step === 1) return form.mdrRate > 0 && !!form.settlementAccountId;
    if (step === 2) return !!form.contactName && !!form.contactEmail;
    return true;
  };

  const handleSubmit = () => {
    onboard.mutate(
      {
        merchantName: form.merchantName,
        merchantCategoryCode: form.merchantCategoryCode,
        businessType: form.businessType,
        registrationNumber: form.registrationNumber || undefined,
        mdrRate: form.mdrRate,
        riskCategory: form.riskCategory,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        settlementAccountId: parseInt(form.settlementAccountId, 10),
        settlementFrequency: form.settlementFrequency,
      },
      {
        onSuccess: (data) => {
          toast.success('Merchant onboarded successfully');
          navigate(`/cards/merchants/${data.merchantId}`);
        },
      },
    );
  };

  return (
    <>
      <PageHeader title="Onboard Merchant" subtitle="Multi-step merchant onboarding wizard" backTo="/cards/merchants" />
      <div className="page-container max-w-3xl mx-auto space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    done ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : active ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-2" />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="surface-card p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Business Information</h3>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Merchant Name</label>
                <input className="w-full mt-1 input" placeholder="Business name" value={form.merchantName} onChange={(e) => update('merchantName', e.target.value)} required />
              </div>
              <MccSelector
                value={form.merchantCategoryCode}
                onChange={(code, _desc) => {
                  setForm((f) => ({
                    ...f,
                    merchantCategoryCode: code,
                    riskCategory: suggestRiskCategory(code),
                  }));
                }}
              />
              {form.merchantCategoryCode && (
                <p className="text-xs text-muted-foreground">
                  Auto-suggested risk: <span className="font-medium">{suggestRiskCategory(form.merchantCategoryCode)}</span>
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Business Type</label>
                  <select className="w-full mt-1 input" value={form.businessType} onChange={(e) => update('businessType', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="SOLE_PROPRIETOR">Sole Proprietor</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="LLC">LLC</option>
                    <option value="CORPORATION">Corporation</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Registration Number</label>
                  <input className="w-full mt-1 input" placeholder="RC-12345" value={form.registrationNumber} onChange={(e) => update('registrationNumber', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Financial Setup</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">MDR Rate (%)</label>
                  <input type="number" step="0.01" min={0} max={10} className="w-full mt-1 input" value={form.mdrRate} onChange={(e) => update('mdrRate', parseFloat(e.target.value) || 0)} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Settlement Frequency</label>
                  <select className="w-full mt-1 input" value={form.settlementFrequency} onChange={(e) => update('settlementFrequency', e.target.value)}>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Settlement Account ID</label>
                <input type="number" className="w-full mt-1 input" placeholder="Settlement account ID" value={form.settlementAccountId} onChange={(e) => update('settlementAccountId', e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Risk Category</label>
                <select className="w-full mt-1 input" value={form.riskCategory} onChange={(e) => update('riskCategory', e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-suggested based on MCC {form.merchantCategoryCode}. You can override.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Contact & Compliance</h3>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                <input className="w-full mt-1 input" placeholder="Full name" value={form.contactName} onChange={(e) => update('contactName', e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Email</label>
                  <input type="email" className="w-full mt-1 input" placeholder="email@example.com" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Phone</label>
                  <input type="tel" className="w-full mt-1 input" placeholder="+234..." value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} />
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">Compliance Checklist</p>
                {['KYC documents verified', 'AML screening completed', 'Business registration confirmed', 'Bank account ownership verified'].map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" className="rounded border-muted-foreground/30" />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Review & Submit</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Merchant Name</p><p className="font-medium">{form.merchantName}</p></div>
                <div><p className="text-xs text-muted-foreground">MCC</p><p className="font-medium">{form.merchantCategoryCode}</p></div>
                <div><p className="text-xs text-muted-foreground">MDR Rate</p><p className="font-mono font-medium">{formatPercent(form.mdrRate)}</p></div>
                <div><p className="text-xs text-muted-foreground">Settlement</p><p className="font-medium">{form.settlementFrequency}</p></div>
                <div><p className="text-xs text-muted-foreground">Risk Category</p><StatusBadge status={form.riskCategory} /></div>
                <div><p className="text-xs text-muted-foreground">Settlement Account</p><p className="font-mono">{form.settlementAccountId}</p></div>
                <div><p className="text-xs text-muted-foreground">Contact</p><p className="font-medium">{form.contactName}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{form.contactEmail}</p></div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 btn-secondary disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 btn-primary disabled:opacity-50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={onboard.isPending}
              className="flex items-center gap-1.5 btn-primary"
            >
              {onboard.isPending ? 'Onboarding...' : 'Onboard Merchant'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
