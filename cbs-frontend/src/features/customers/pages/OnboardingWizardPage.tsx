import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle, Loader2, AlertTriangle,
  FileText, Clock, X, User, Building2, Upload, Eye, Briefcase,
  CreditCard, Globe, Shield, Sparkles, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { WizardStepper } from '../components/onboarding/WizardStepper';
import { useOnboardingWizard } from '../hooks/useOnboardingWizard';
import { customerApi } from '../api/customerApi';
import type { OnboardingFormData } from '../types/customer';

const STEP_LABELS = ['Type', 'Personal', 'Contact', 'ID/KYC', 'Verify', 'Employment', 'Account', 'Review'];

// ─── Validated Field ────────────────────────────────────────────────────────

function ValidatedField({ name, label, required, type = 'text', value, defaultValue, onChange, onBlur, error, placeholder, className, ...props }: {
  name: string; label: string; required?: boolean; type?: string; value?: string; defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; onBlur?: () => void;
  error?: string; placeholder?: string; className?: string; maxLength?: number; min?: string;
}) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <input
          id={id} name={name} type={type} required={required}
          value={value} defaultValue={defaultValue}
          onChange={onChange} onBlur={onBlur}
          placeholder={placeholder}
          aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full px-3 py-2.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 transition-colors',
            error ? 'border-red-400 focus:ring-red-400/30' : 'border-border focus:ring-primary/30',
            className,
          )}
          {...props}
        />
        {/* Validation indicator */}
        {value && !error && (
          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" aria-hidden="true" />
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-600 flex items-center gap-1" role="alert" aria-live="polite">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Nav Buttons ────────────────────────────────────────────────────────────

function NavButtons({ onBack, onNext, nextLabel, nextDisabled, isFirst }: {
  onBack: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean; isFirst?: boolean;
}) {
  return (
    <div className="flex justify-between pt-6">
      {!isFirst ? (
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 px-4 py-2.5 text-sm border rounded-lg hover:bg-muted transition-colors" aria-label="Go to previous step">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      ) : <div />}
      <button type={onNext ? 'button' : 'submit'} onClick={onNext} disabled={nextDisabled}
        className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label={nextLabel || 'Go to next step'}>
        {nextLabel || 'Next'} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Review Accordion ───────────────────────────────────────────────────────

function ReviewAccordion({ title, items, validation, onEdit, defaultOpen }: {
  title: string; items: { label: string; value: string }[]; validation: 'complete' | 'error' | 'unvisited'; onEdit: () => void; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const Icon = validation === 'complete' ? CheckCircle : validation === 'error' ? AlertTriangle : Clock;
  const iconColor = validation === 'complete' ? 'text-green-500' : validation === 'error' ? 'text-amber-500' : 'text-muted-foreground';

  return (
    <div className={cn('rounded-lg border overflow-hidden', validation === 'error' && 'border-amber-300 dark:border-amber-800/40')}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
        <Icon className={cn('w-4 h-4 flex-shrink-0', iconColor)} />
        <span className="flex-1 text-sm font-semibold">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t bg-muted/10">
          <div className="flex justify-end pt-2">
            <button type="button" onClick={onEdit} className="text-xs text-primary hover:underline font-medium">Edit</button>
          </div>
          {items.map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">{label}</span>
              <span className={cn('font-medium', !value && 'text-red-500')}>{value || 'Not provided'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Success Screen ─────────────────────────────────────────────────────────

function SuccessScreen({ customerId }: { customerId: number }) {
  return (
    <div className="max-w-lg mx-auto py-12 text-center space-y-8">
      {/* Animated check */}
      <div className="relative mx-auto w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-green-100 dark:bg-green-900/30 animate-ping opacity-30" />
        <div className="relative w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-green-700 dark:text-green-300">Customer Created!</h2>
        <p className="text-sm text-muted-foreground mt-2">Customer ID: <span className="font-mono font-bold text-lg text-foreground">{customerId}</span></p>
      </div>

      {/* What's Next card */}
      <div className="rounded-xl border bg-card p-6 text-left">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> What's Next?
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to={`/accounts/open?customerId=${customerId}`} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm font-medium">
            <CreditCard className="w-4 h-4 text-primary" /> Open Account
          </Link>
          <Link to={`/customers/${customerId}`} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm font-medium">
            <Eye className="w-4 h-4 text-primary" /> View Customer 360
          </Link>
          <Link to="/customers/onboarding" className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm font-medium">
            <User className="w-4 h-4 text-primary" /> Onboard Another
          </Link>
          <Link to="/customers" className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4 text-primary" /> Customer List
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingWizardPage() {
  useEffect(() => { document.title = 'New Customer | CBS'; }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wizard = useOnboardingWizard();
  const returnUrl = searchParams.get('returnUrl');
  const [showDraftPicker, setShowDraftPicker] = useState(wizard.existingDrafts.length > 0 && wizard.currentStep === 1);
  const [bvn, setBvn] = useState(wizard.formData.bvn ?? '');
  const [bvnResult, setBvnResult] = useState<{ matched: boolean; status?: string; failureReason?: string | null } | null>(null);
  const [bvnVerifying, setBvnVerifying] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Track controlled field values for real-time validation
  const [liveFields, setLiveFields] = useState<Record<string, string>>({});
  const updateLive = (name: string, value: string) => {
    setLiveFields((p) => ({ ...p, [name]: value }));
    wizard.onFieldBlur(name, value);
  };

  // Redirect on success
  useEffect(() => {
    if (wizard.isSubmitSuccess && wizard.submittedCustomer) {
      if (returnUrl) {
        const sep = returnUrl.includes('?') ? '&' : '?';
        navigate(`${returnUrl}${sep}customerId=${wizard.submittedCustomer.id}`);
      }
    }
  }, [navigate, returnUrl, wizard.isSubmitSuccess, wizard.submittedCustomer]);

  useEffect(() => {
    if (wizard.existingDrafts.length > 0 && wizard.currentStep === 1 && !wizard.draftId) {
      setShowDraftPicker(true);
    }
  }, [wizard.existingDrafts, wizard.currentStep, wizard.draftId]);

  const { currentStep, formData, nextStep, prevStep, updateStep, goToStep, submit, saveDraft, isSubmitting, getStepValidation, getValidationIssues, fieldErrors } = wizard;
  const isCorp = formData.customerType === 'CORPORATE' || formData.customerType === 'SME';

  const fc = 'w-full px-3 py-2.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 border-border';

  // BVN verification
  const handleVerifyBvn = async () => {
    if (bvn.length !== 11) return;
    setBvnVerifying(true);
    try {
      const data = await customerApi.verifyBvn(bvn, undefined, { firstName: formData.firstName, lastName: formData.lastName, dateOfBirth: formData.dateOfBirth });
      setBvnResult({ matched: data.status === 'VERIFIED', status: data.status, failureReason: data.failureReason ?? null });
    } catch (e) {
      setBvnResult({ matched: false, status: 'FAILED', failureReason: e instanceof Error ? e.message : 'Verification failed' });
    } finally { setBvnVerifying(false); }
  };

  // Success state
  if (wizard.isSubmitSuccess && wizard.submittedCustomer) {
    return <SuccessScreen customerId={wizard.submittedCustomer.id} />;
  }

  const renderStep = () => {
    switch (currentStep) {
      // ── Step 1: Customer Type ──
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select the type of customer you want to onboard.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup" aria-label="Customer type">
              {([
                { type: 'INDIVIDUAL' as const, icon: User, desc: 'Personal banking account', sub: 'Individuals, salary earners' },
                { type: 'CORPORATE' as const, icon: Building2, desc: 'Corporate business account', sub: 'Limited companies, PLCs' },
                { type: 'SME' as const, icon: Briefcase, desc: 'Small business account', sub: 'SMEs, sole proprietors' },
              ]).map(({ type, icon: Icon, desc, sub }) => (
                <button key={type} type="button" onClick={() => nextStep({ customerType: type })} role="radio" aria-checked={formData.customerType === type}
                  className={cn('p-5 border-2 rounded-xl text-left transition-all hover:border-primary/60 hover:shadow-sm group',
                    formData.customerType === type ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' : 'border-border')}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', formData.customerType === type ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground group-hover:text-primary')}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={cn('text-base font-semibold', formData.customerType === type && 'text-primary')}>{type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
                </button>
              ))}
            </div>
          </div>
        );

      // ── Step 2: Personal/Company Info ──
      case 2:
        return (
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>); }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
            {isCorp ? (
              <>
                <ValidatedField name="registeredName" label="Registered Name" required defaultValue={formData.registeredName} error={fieldErrors.registeredName} onBlur={() => wizard.onFieldBlur('registeredName', formData.registeredName ?? '')} />
                <ValidatedField name="tradingName" label="Trading Name" defaultValue={formData.tradingName} />
                <ValidatedField name="registrationNumber" label="Registration Number" required defaultValue={formData.registrationNumber} />
                <ValidatedField name="registrationDate" label="Registration Date" type="date" defaultValue={formData.registrationDate} />
                <ValidatedField name="nationality" label="Country of Registration" required defaultValue={formData.nationality ?? 'NGA'} />
              </>
            ) : (
              <>
                <ValidatedField name="firstName" label="First Name" required defaultValue={formData.firstName} error={fieldErrors.firstName}
                  onBlur={() => { const el = document.getElementById('field-firstName') as HTMLInputElement; if (el) wizard.onFieldBlur('firstName', el.value); }} />
                <ValidatedField name="lastName" label="Last Name" required defaultValue={formData.lastName} error={fieldErrors.lastName}
                  onBlur={() => { const el = document.getElementById('field-lastName') as HTMLInputElement; if (el) wizard.onFieldBlur('lastName', el.value); }} />
                <ValidatedField name="middleName" label="Middle Name" defaultValue={formData.middleName} />
                <ValidatedField name="dateOfBirth" label="Date of Birth" type="date" required defaultValue={formData.dateOfBirth} error={fieldErrors.dateOfBirth}
                  onBlur={() => { const el = document.getElementById('field-dateOfBirth') as HTMLInputElement; if (el) wizard.onFieldBlur('dateOfBirth', el.value); }} />
                <ValidatedField name="nationality" label="Nationality" required defaultValue={formData.nationality ?? 'NGA'} />
              </>
            )}
            <div className="sm:col-span-2"><NavButtons onBack={prevStep} /></div>
          </form>
        );

      // ── Step 3: Contact & Address ──
      case 3:
        return (
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>); }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
            <div className="sm:col-span-2">
              <ValidatedField name="residentialAddress" label="Residential/Business Address" required defaultValue={formData.residentialAddress} error={fieldErrors.residentialAddress} placeholder="Full street address" />
            </div>
            <ValidatedField name="city" label="City" defaultValue={formData.city} placeholder="e.g. Lagos" />
            <ValidatedField name="state" label="State" defaultValue={formData.state} placeholder="e.g. Lagos" />
            <ValidatedField name="phone" label="Phone Number" type="tel" required defaultValue={formData.phone} error={fieldErrors.phone} placeholder="+234..."
              onBlur={() => { const el = document.getElementById('field-phone') as HTMLInputElement; if (el) wizard.onFieldBlur('phone', el.value); }} />
            <ValidatedField name="email" label="Email Address" type="email" required defaultValue={formData.email} error={fieldErrors.email} placeholder="email@example.com"
              onBlur={() => { const el = document.getElementById('field-email') as HTMLInputElement; if (el) wizard.onFieldBlur('email', el.value); }} />
            <div className="sm:col-span-2"><NavButtons onBack={prevStep} /></div>
          </form>
        );

      // ── Step 4: ID/KYC ──
      case 4:
        return (
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>); }}
            className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="idType" className="block text-sm font-medium">{isCorp ? 'Document Type' : 'ID Type'} {!isCorp && <span className="text-red-500">*</span>}</label>
                <select id="idType" name="idType" required={!isCorp} defaultValue={formData.idType ?? ''} className={fc}>
                  <option value="">Select</option>
                  {(isCorp
                    ? ['Certificate of Incorporation', 'TIN Certificate', 'Board Resolution', 'Memorandum of Association']
                    : ['NIN', "Driver's License", 'International Passport', "Voter's Card"]
                  ).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <ValidatedField name="idNumber" label={isCorp ? 'Document Number' : 'ID Number'} required={!isCorp} defaultValue={formData.idNumber} error={fieldErrors.idNumber}
                onBlur={() => { const el = document.getElementById('field-idNumber') as HTMLInputElement; if (el) wizard.onFieldBlur('idNumber', el.value); }} />
              <ValidatedField name="idExpiry" label="Expiry Date" type="date" defaultValue={formData.idExpiry} min={new Date().toISOString().split('T')[0]} />
            </div>

            {/* Document upload hint */}
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center bg-muted/20">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Document uploads can be added after customer creation</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Customer 360 → Documents tab to upload ID images</p>
            </div>

            <NavButtons onBack={prevStep} />
          </form>
        );

      // ── Step 5: BVN Verification ──
      case 5:
        if (isCorp) return (
          <div className="space-y-5">
            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              BVN verification applies to individual customers only. Corporate customers can skip this step.
            </div>
            <NavButtons onBack={prevStep} onNext={() => nextStep({ bvn: undefined, bvnVerified: false })} />
          </div>
        );
        return (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> BVN Verification</h3>
              <p className="text-xs text-muted-foreground mb-4">Enter the customer's Bank Verification Number for identity validation.</p>
              <div className="flex gap-2">
                <input type="text" maxLength={11} value={bvn} onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 11-digit BVN" aria-label="Bank Verification Number"
                  className={cn(fc, 'flex-1 font-mono text-lg tracking-wider')} />
                <button type="button" onClick={handleVerifyBvn} disabled={bvn.length !== 11 || bvnVerifying}
                  className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                  {bvnVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {bvnVerifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              {bvn.length > 0 && bvn.length !== 11 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1" role="status">
                  <Clock className="w-3 h-3" /> {bvn.length}/11 digits entered
                </p>
              )}
            </div>

            {bvnResult && (
              <div className={cn('rounded-xl border p-5', bvnResult.matched ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10' : 'border-red-300 bg-red-50/50 dark:bg-red-900/10')} role="alert">
                {bvnResult.matched ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">BVN Verified Successfully</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-semibold text-red-700 dark:text-red-300">Verification Failed</span>
                    </div>
                    <p className="text-xs text-red-600">{bvnResult.failureReason || 'BVN could not be verified'}</p>
                  </div>
                )}
              </div>
            )}

            <NavButtons onBack={prevStep} onNext={() => nextStep({ bvn, bvnVerified: bvnResult?.matched ?? false })} nextLabel={bvnResult?.matched ? 'Next' : 'Skip'} />
          </div>
        );

      // ── Step 6: Employment ──
      case 6:
        return (
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>); }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
            {isCorp ? (
              <>
                <div className="sm:col-span-2 space-y-1"><label className="block text-sm font-medium">Business Activity</label>
                  <textarea name="businessActivity" rows={2} defaultValue={(formData as Record<string, unknown>).businessActivity as string ?? ''} className={fc} /></div>
                <div className="space-y-1"><label className="block text-sm font-medium">Employees</label>
                  <select name="employeeRange" defaultValue={(formData as Record<string, unknown>).employeeRange as string ?? ''} className={fc}>
                    <option value="">Select</option>{['1-10', '11-50', '51-200', '201-500', '500+'].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select></div>
              </>
            ) : (
              <>
                <div className="space-y-1"><label className="block text-sm font-medium">Employment Status</label>
                  <select name="employmentStatus" defaultValue={formData.employmentStatus ?? ''} className={fc}>
                    <option value="">Select</option>{['EMPLOYED', 'SELF_EMPLOYED', 'RETIRED', 'STUDENT', 'UNEMPLOYED'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select></div>
                <ValidatedField name="employerName" label="Employer Name" defaultValue={formData.employerName} />
                <ValidatedField name="jobTitle" label="Job Title" defaultValue={formData.jobTitle} />
              </>
            )}
            <div className="space-y-1"><label className="block text-sm font-medium">Monthly Income Range</label>
              <select name="monthlyIncomeRange" defaultValue={formData.monthlyIncomeRange ?? ''} className={fc}>
                <option value="">Select</option>{[['BELOW_50K', 'Below ₦50K'], ['50K_200K', '₦50K–₦200K'], ['200K_500K', '₦200K–₦500K'], ['500K_1M', '₦500K–₦1M'], ['ABOVE_1M', 'Above ₦1M']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div className="sm:col-span-2"><NavButtons onBack={prevStep} /></div>
          </form>
        );

      // ── Step 7: Account Product ──
      case 7: {
        const hasProduct = !!formData.accountProduct;
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Choose the account product for this customer.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup" aria-label="Account product">
              {([
                { code: 'SAVINGS', label: 'Savings', desc: 'Earn interest, unlimited withdrawals', icon: '💰' },
                { code: 'CURRENT', label: 'Current', desc: 'Unlimited transactions, chequebook', icon: '🏦' },
                { code: 'DOMICILIARY', label: 'Domiciliary', desc: 'Hold foreign currencies', icon: '🌍' },
              ]).map(({ code, label, desc, icon }) => (
                <button key={code} type="button" onClick={() => updateStep({ accountProduct: code })} role="radio" aria-checked={formData.accountProduct === code}
                  className={cn('p-5 border-2 rounded-xl text-left transition-all hover:border-primary/60',
                    formData.accountProduct === code ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' : 'border-border')}>
                  <span className="text-2xl mb-2 block">{icon}</span>
                  <div className="font-semibold mb-1">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </button>
              ))}
            </div>
            <label className="flex items-start gap-3 p-4 rounded-lg border bg-muted/20 cursor-pointer">
              <input type="checkbox" checked={!!formData.acceptTerms} onChange={(e) => updateStep({ acceptTerms: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-border" aria-describedby="terms-desc" />
              <div>
                <span className="text-sm font-medium">I accept the Terms and Conditions <span className="text-red-500">*</span></span>
                <p id="terms-desc" className="text-xs text-muted-foreground mt-0.5">By checking, I confirm the customer has been informed of applicable fees and charges.</p>
              </div>
            </label>
            {!formData.acceptTerms && formData.accountProduct && (
              <p className="text-xs text-red-600 flex items-center gap-1" role="alert"><AlertTriangle className="w-3 h-3" /> Terms must be accepted to proceed.</p>
            )}
            <NavButtons onBack={prevStep} onNext={() => hasProduct && formData.acceptTerms && nextStep({})} nextDisabled={!hasProduct || !formData.acceptTerms} />
          </div>
        );
      }

      // ── Step 8: Review & Submit ──
      case 8: {
        const issues = getValidationIssues();
        const completeSections = STEP_LABELS.slice(0, 7).filter((_, i) => getStepValidation(i + 1) === 'complete').length;

        return (
          <div className="space-y-5">
            {/* Pre-submission checks */}
            <div className={cn('rounded-xl border p-4', issues.length > 0 ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-900/5' : 'border-green-300 bg-green-50/30 dark:bg-green-900/5')}>
              <div className="flex items-center gap-2 mb-3">
                {issues.length > 0 ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
                <span className="text-sm font-semibold">{issues.length > 0 ? `${issues.length} issue(s) to resolve` : 'All checks passed — ready to submit'}</span>
                <span className="text-xs text-muted-foreground ml-auto">{completeSections}/7 sections complete</span>
              </div>
              {/* Check list */}
              <div className="space-y-1.5">
                {[
                  { check: !!formData.customerType, label: 'Customer type selected' },
                  { check: isCorp ? !!formData.registeredName : !!(formData.firstName && formData.lastName), label: isCorp ? 'Company info provided' : 'Personal info complete' },
                  { check: !!formData.email && !!formData.phone, label: 'Contact details provided' },
                  { check: isCorp || !!(formData.idType && formData.idNumber), label: 'ID document provided' },
                  { check: isCorp || !!formData.bvnVerified, label: 'BVN verified', optional: true },
                  { check: !!formData.accountProduct, label: 'Account product selected' },
                  { check: !!formData.acceptTerms, label: 'Terms accepted' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    {item.check ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <span className={cn('w-3.5 h-3.5 rounded-full border-2', item.optional ? 'border-amber-400' : 'border-red-400')} />}
                    <span className={cn(item.check ? 'text-muted-foreground' : 'text-foreground font-medium')}>{item.label}</span>
                    {item.optional && !item.check && <span className="text-xs text-amber-600">(optional)</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Accordion sections */}
            <div className="space-y-2">
              <ReviewAccordion title={isCorp ? 'Company Information' : 'Personal Information'} validation={getStepValidation(2)} onEdit={() => goToStep(2)} defaultOpen
                items={isCorp ? [
                  { label: 'Registered Name', value: formData.registeredName ?? '' },
                  { label: 'Trading Name', value: formData.tradingName ?? '' },
                  { label: 'Registration #', value: formData.registrationNumber ?? '' },
                ] : [
                  { label: 'Name', value: `${formData.firstName ?? ''} ${formData.middleName ?? ''} ${formData.lastName ?? ''}`.trim() },
                  { label: 'Date of Birth', value: formData.dateOfBirth ?? '' },
                  { label: 'Nationality', value: formData.nationality ?? '' },
                ]} />
              <ReviewAccordion title="Contact & Address" validation={getStepValidation(3)} onEdit={() => goToStep(3)}
                items={[
                  { label: 'Phone', value: formData.phone ?? '' },
                  { label: 'Email', value: formData.email ?? '' },
                  { label: 'Address', value: formData.residentialAddress ?? '' },
                  { label: 'City', value: formData.city ?? '' },
                ]} />
              <ReviewAccordion title="ID & KYC" validation={getStepValidation(4)} onEdit={() => goToStep(4)}
                items={[
                  { label: 'ID Type', value: formData.idType ?? '' },
                  { label: 'ID Number', value: formData.idNumber ?? '' },
                  { label: 'BVN', value: isCorp ? 'N/A' : formData.bvnVerified ? `Verified (${formData.bvn})` : 'Not verified' },
                ]} />
              <ReviewAccordion title="Employment" validation={getStepValidation(6)} onEdit={() => goToStep(6)}
                items={[
                  { label: 'Status', value: formData.employmentStatus ?? '' },
                  { label: 'Employer', value: formData.employerName ?? '' },
                  { label: 'Income', value: formData.monthlyIncomeRange ?? '' },
                ]} />
              <ReviewAccordion title="Account" validation={getStepValidation(7)} onEdit={() => goToStep(7)}
                items={[
                  { label: 'Product', value: formData.accountProduct ?? '' },
                  { label: 'Terms', value: formData.acceptTerms ? 'Accepted' : 'Not accepted' },
                ]} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-between pt-4 border-t">
              <button type="button" onClick={prevStep} className="flex items-center gap-1.5 px-4 py-2.5 text-sm border rounded-lg hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Back</button>
              <div className="flex gap-2">
                <button type="button" onClick={saveDraft} className="flex items-center gap-1.5 px-4 py-2.5 text-sm border rounded-lg hover:bg-muted">
                  <Save className="h-4 w-4" /> Save Draft
                </button>
                <button type="button" onClick={() => setShowConfirmSubmit(true)} disabled={isSubmitting || issues.length > 0}
                  className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Application'}
                </button>
              </div>
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-semibold">New Customer Onboarding</h1>
        </div>
        {wizard.lastSavedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            <Clock className="w-3.5 h-3.5" /> Draft saved at {wizard.lastSavedAt}
          </div>
        )}
      </div>

      {/* Stepper */}
      <WizardStepper steps={STEP_LABELS} currentStep={currentStep} onStepClick={goToStep} getStepValidation={getStepValidation} />

      {/* Step content */}
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Step {currentStep} of {STEP_LABELS.length}: {STEP_LABELS[currentStep - 1]}</h2>
        </div>
        <div className="p-6">{renderStep()}</div>
      </div>

      {/* Draft picker */}
      {showDraftPicker && wizard.existingDrafts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-label="Resume draft">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowDraftPicker(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Resume Draft?</h3><button onClick={() => setShowDraftPicker(false)} className="p-1 rounded hover:bg-muted" aria-label="Close"><X className="w-4 h-4" /></button></div>
            <p className="text-sm text-muted-foreground">You have saved drafts. Resume one or start fresh.</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {wizard.existingDrafts.map((d) => (
                <button key={d.id} onClick={() => { wizard.resumeDraft(d.id); setShowDraftPicker(false); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 text-left">
                  <div><p className="text-sm font-medium">{d.displayLabel || `Draft #${d.id}`}</p><p className="text-xs text-muted-foreground">Step {d.currentStep} · {d.customerType}</p></div>
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
            <button onClick={() => setShowDraftPicker(false)} className="w-full px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted">Start Fresh</button>
          </div>
        </div>
      )}

      {/* Confirm submit */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-label="Confirm submission">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowConfirmSubmit(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <h3 className="font-semibold">Confirm Submission</h3>
            <p className="text-sm text-muted-foreground">This will create a new customer record in the system. This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirmSubmit(false)} className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => { submit(); setShowConfirmSubmit(false); }} disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
