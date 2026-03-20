import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle, Loader2, AlertTriangle,
  FileText, Clock, Trash2, X, User, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { WizardStepper } from '../components/onboarding/WizardStepper';
import { useOnboardingWizard } from '../hooks/useOnboardingWizard';
import { customerApi } from '../api/customerApi';
import type { OnboardingFormData } from '../types/customer';

const STEP_LABELS = ['Type', 'Personal', 'Address', 'ID/KYC', 'BVN', 'Employment', 'Account', 'Review'];
const fc = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500';

// ── Nav Buttons ─────────────────────────────────────────────────────────────

function NavButtons({ onBack, onNext, nextLabel, nextDisabled, isFirst }: { onBack: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean; isFirst?: boolean }) {
  return (
    <div className="flex justify-between pt-4">
      {!isFirst ? (
        <button type="button" onClick={onBack} className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      ) : <div />}
      {onNext ? (
        <button type={onNext ? 'button' : 'submit'} onClick={onNext} disabled={nextDisabled}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {nextLabel || 'Next'} <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <button type="submit" disabled={nextDisabled}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {nextLabel || 'Next'} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ── Review Section ──────────────────────────────────────────────────────────

function ReviewSection({ title, items, onEdit }: { title: string; items: { label: string; value: string }[]; onEdit: () => void }) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <button type="button" onClick={onEdit} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
      </div>
      {items.map(({ label, value }) => (
        <div key={label} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{value || '—'}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

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

  // Redirect on success
  useEffect(() => {
    if (wizard.isSubmitSuccess && wizard.submittedCustomer) {
      if (returnUrl) {
        const sep = returnUrl.includes('?') ? '&' : '?';
        navigate(`${returnUrl}${sep}customerId=${wizard.submittedCustomer.id}`);
      }
    }
  }, [navigate, returnUrl, wizard.isSubmitSuccess, wizard.submittedCustomer]);

  // Show draft picker when drafts exist
  useEffect(() => {
    if (wizard.existingDrafts.length > 0 && wizard.currentStep === 1 && !wizard.draftId) {
      setShowDraftPicker(true);
    }
  }, [wizard.existingDrafts, wizard.currentStep, wizard.draftId]);

  const { currentStep, formData, nextStep, prevStep, updateStep, goToStep, submit, saveDraft, isSubmitting, getStepValidation, getValidationIssues } = wizard;
  const isCorp = formData.customerType === 'CORPORATE' || formData.customerType === 'SME';

  // BVN verification handler
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
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Customer Created Successfully!</h2>
          <p className="text-sm text-muted-foreground">Customer ID: <span className="font-mono font-semibold">{wizard.submittedCustomer.id}</span></p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link to={`/customers/${wizard.submittedCustomer.id}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">View Customer</Link>
          <Link to="/accounts/open" className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">Open Account</Link>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['INDIVIDUAL', 'CORPORATE', 'SME'] as const).map(type => (
              <button key={type} type="button" onClick={() => nextStep({ customerType: type })}
                className={cn('p-6 border-2 rounded-xl text-left transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20',
                  formData.customerType === type ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700')}>
                <div className="flex items-center gap-2 mb-1">
                  {type === 'INDIVIDUAL' ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                  <span className="text-base font-semibold">{type}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {type === 'INDIVIDUAL' ? 'Personal banking' : type === 'CORPORATE' ? 'Business accounts' : 'SME accounts'}
                </div>
              </button>
            ))}
          </div>
        );

      case 2:
        return (
          <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>); }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(isCorp ? [
              { name: 'registeredName', label: 'Registered Name *', type: 'text', required: true },
              { name: 'tradingName', label: 'Trading Name', type: 'text' },
              { name: 'registrationNumber', label: 'Registration Number *', type: 'text', required: true },
              { name: 'registrationDate', label: 'Registration Date', type: 'date' },
              { name: 'nationality', label: 'Country of Registration *', type: 'text', required: true },
            ] : [
              { name: 'firstName', label: 'First Name *', type: 'text', required: true },
              { name: 'lastName', label: 'Last Name *', type: 'text', required: true },
              { name: 'middleName', label: 'Middle Name', type: 'text' },
              { name: 'dateOfBirth', label: 'Date of Birth *', type: 'date', required: true },
              { name: 'nationality', label: 'Nationality *', type: 'text', required: true },
            ]).map(f => (
              <div key={f.name} className="space-y-1">
                <label htmlFor={f.name} className="block text-sm font-medium">{f.label}</label>
                <input id={f.name} name={f.name} type={f.type} required={f.required}
                  defaultValue={(formData[f.name as keyof OnboardingFormData] as string) ?? (f.name === 'nationality' ? 'NGA' : '')} className={fc} />
              </div>
            ))}
            <div className="sm:col-span-2"><NavButtons onBack={prevStep} /></div>
          </form>
        );

      case 3:
        return (
          <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>); }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1"><label className="block text-sm font-medium">Residential Address *</label>
              <input name="residentialAddress" required defaultValue={formData.residentialAddress} className={fc} /></div>
            <div className="space-y-1"><label className="block text-sm font-medium">Phone *</label>
              <input name="phone" type="tel" required placeholder="+234..." defaultValue={formData.phone} className={fc} /></div>
            <div className="space-y-1"><label className="block text-sm font-medium">Email *</label>
              <input name="email" type="email" required defaultValue={formData.email} className={fc} /></div>
            <div className="sm:col-span-2"><NavButtons onBack={prevStep} /></div>
          </form>
        );

      case 4:
        return (
          <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>); }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1"><label className="block text-sm font-medium">{isCorp ? 'Document Type' : 'ID Type *'}</label>
              <select name="idType" required={!isCorp} defaultValue={formData.idType ?? ''} className={fc}>
                <option value="">Select</option>
                {(isCorp ? ['Certificate of Incorporation', 'TIN Certificate', 'Board Resolution', 'Memorandum of Association']
                  : ['NIN', "Driver's License", 'International Passport', "Voter's Card"]).map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div className="space-y-1"><label className="block text-sm font-medium">{isCorp ? 'Document Number' : 'ID Number *'}</label>
              <input name="idNumber" required={!isCorp} defaultValue={formData.idNumber} className={fc} /></div>
            <div className="space-y-1"><label className="block text-sm font-medium">Expiry Date</label>
              <input name="idExpiry" type="date" defaultValue={formData.idExpiry} className={fc} /></div>
            <div className="sm:col-span-2"><NavButtons onBack={prevStep} /></div>
          </form>
        );

      case 5:
        if (isCorp) return (
          <div className="space-y-5">
            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
              BVN verification applies to individual customers only.
            </div>
            <NavButtons onBack={prevStep} onNext={() => nextStep({ bvn: undefined, bvnVerified: false })} />
          </div>
        );
        return (
          <div className="space-y-5">
            <div><label className="block text-sm font-medium mb-1">BVN (11 digits)</label>
              <div className="flex gap-2">
                <input type="text" maxLength={11} value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g, ''))} placeholder="00000000000" className={cn(fc, 'flex-1 font-mono')} />
                <button type="button" onClick={handleVerifyBvn} disabled={bvn.length !== 11 || bvnVerifying}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {bvnVerifying ? 'Verifying…' : 'Verify BVN'}
                </button>
              </div>
              {bvn.length > 0 && bvn.length !== 11 && <p className="text-xs text-red-600 mt-1">BVN must be exactly 11 digits ({bvn.length}/11)</p>}
            </div>
            {bvnResult && (
              <div className={cn('p-4 rounded-lg text-sm', bvnResult.matched ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
                {bvnResult.matched ? <div className="flex items-center gap-1.5 font-semibold"><CheckCircle className="h-4 w-4" /> BVN Verified</div>
                  : <div>{bvnResult.failureReason || 'BVN verification failed'}</div>}
              </div>
            )}
            <NavButtons onBack={prevStep} onNext={() => nextStep({ bvn, bvnVerified: bvnResult?.matched ?? false })} nextLabel={bvnResult?.matched ? 'Next' : 'Skip'} />
          </div>
        );

      case 6:
        if (isCorp) return (
          <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>); }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1"><label className="block text-sm font-medium">Business Activity</label>
              <textarea name="businessActivity" rows={2} defaultValue={(formData as Record<string, unknown>).businessActivity as string ?? ''} className={fc} /></div>
            <div className="space-y-1"><label className="block text-sm font-medium">Number of Employees</label>
              <select name="employeeRange" defaultValue={(formData as Record<string, unknown>).employeeRange as string ?? ''} className={fc}>
                <option value="">Select</option>{['1-10', '11-50', '51-200', '201-500', '500+'].map(r => <option key={r} value={r}>{r}</option>)}
              </select></div>
            <div className="space-y-1"><label className="block text-sm font-medium">Expected Monthly Turnover</label>
              <select name="monthlyIncomeRange" defaultValue={formData.monthlyIncomeRange ?? ''} className={fc}>
                <option value="">Select</option>{[['BELOW_50K', 'Below ₦50K'], ['50K_200K', '₦50K–₦200K'], ['200K_500K', '₦200K–₦500K'], ['500K_1M', '₦500K–₦1M'], ['ABOVE_1M', 'Above ₦1M']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div className="space-y-1"><label className="block text-sm font-medium">Source of Funds</label>
              <select name="sourceOfFunds" defaultValue={formData.sourceOfFunds ?? ''} className={fc}>
                <option value="">Select</option>{['BUSINESS_REVENUE', 'GRANTS', 'INVESTMENTS', 'LOANS'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select></div>
            <div className="sm:col-span-2"><NavButtons onBack={prevStep} /></div>
          </form>
        );
        return (
          <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>); }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1"><label className="block text-sm font-medium">Employment Status</label>
              <select name="employmentStatus" defaultValue={formData.employmentStatus ?? ''} className={fc}>
                <option value="">Select</option>{['EMPLOYED', 'SELF_EMPLOYED', 'RETIRED', 'STUDENT', 'UNEMPLOYED'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select></div>
            <div className="space-y-1"><label className="block text-sm font-medium">Employer Name</label>
              <input name="employerName" defaultValue={formData.employerName} className={fc} /></div>
            <div className="space-y-1"><label className="block text-sm font-medium">Job Title</label>
              <input name="jobTitle" defaultValue={formData.jobTitle} className={fc} /></div>
            <div className="space-y-1"><label className="block text-sm font-medium">Monthly Income Range</label>
              <select name="monthlyIncomeRange" defaultValue={formData.monthlyIncomeRange ?? ''} className={fc}>
                <option value="">Select</option>{[['BELOW_50K', 'Below ₦50K'], ['50K_200K', '₦50K–₦200K'], ['200K_500K', '₦200K–₦500K'], ['500K_1M', '₦500K–₦1M'], ['ABOVE_1M', 'Above ₦1M']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div className="sm:col-span-2"><NavButtons onBack={prevStep} /></div>
          </form>
        );

      case 7: {
        const hasProduct = !!formData.accountProduct;
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[['SAVINGS', 'Earn interest, unlimited withdrawals'], ['CURRENT', 'Unlimited transactions, chequebook'], ['DOMICILIARY', 'Hold foreign currencies']].map(([p, d]) => (
                <button key={p} type="button" onClick={() => updateStep({ accountProduct: p })}
                  className={cn('p-5 border-2 rounded-xl text-left transition-all hover:border-blue-500',
                    formData.accountProduct === p ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700')}>
                  <div className="font-semibold mb-1">{p}</div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!formData.acceptTerms} onChange={e => updateStep({ acceptTerms: e.target.checked })} className="w-4 h-4 rounded border-gray-300" />
              <span className="text-sm">I accept the terms and conditions *</span>
            </label>
            {!formData.acceptTerms && formData.accountProduct && <p className="text-xs text-red-600">You must accept terms to proceed.</p>}
            <NavButtons onBack={prevStep} onNext={() => hasProduct && formData.acceptTerms && nextStep({})} nextDisabled={!hasProduct || !formData.acceptTerms} />
          </div>
        );
      }

      case 8: {
        const issues = getValidationIssues();
        return (
          <div className="space-y-4">
            {/* Validation summary */}
            {issues.length > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-sm font-semibold text-red-700 dark:text-red-400">{issues.length} issue(s) found</span></div>
                <ul className="space-y-1">{issues.map((iss, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-center gap-2">
                    <span>Step {iss.step} ({iss.label}): {iss.message}</span>
                    <button onClick={() => goToStep(iss.step)} className="text-blue-600 hover:underline">Fix</button>
                  </li>
                ))}</ul>
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 p-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm font-semibold text-green-700 dark:text-green-400">All fields complete — ready to submit</span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <ReviewSection title={isCorp ? 'Company' : 'Personal'}
                items={isCorp ? [{ label: 'Name', value: formData.registeredName ?? '' }, { label: 'Reg #', value: formData.registrationNumber ?? '' }]
                  : [{ label: 'Name', value: `${formData.firstName ?? ''} ${formData.lastName ?? ''}`.trim() }, { label: 'DOB', value: formData.dateOfBirth ?? '' }, { label: 'Nationality', value: formData.nationality ?? '' }]}
                onEdit={() => goToStep(2)} />
              <ReviewSection title="Contact" items={[{ label: 'Phone', value: formData.phone ?? '' }, { label: 'Email', value: formData.email ?? '' }, { label: 'Address', value: formData.residentialAddress ?? '' }]} onEdit={() => goToStep(3)} />
              <ReviewSection title="ID" items={[{ label: 'Type', value: formData.idType ?? '' }, { label: 'Number', value: formData.idNumber ?? '' }, { label: 'BVN', value: isCorp ? 'N/A' : formData.bvnVerified ? 'Verified' : 'Not verified' }]} onEdit={() => goToStep(4)} />
              <ReviewSection title="Account" items={[{ label: 'Product', value: formData.accountProduct ?? '' }, { label: 'Employment', value: formData.employmentStatus ?? '' }, { label: 'Terms', value: formData.acceptTerms ? 'Accepted' : 'Not accepted' }]} onEdit={() => goToStep(7)} />
            </div>

            <div className="flex gap-3 justify-between pt-4 border-t">
              <button type="button" onClick={prevStep} className="flex items-center gap-1 px-4 py-2 text-sm border rounded-lg hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Back</button>
              <div className="flex gap-2">
                <button type="button" onClick={saveDraft} disabled={wizard.isSavingDraft}
                  className="flex items-center gap-1 px-4 py-2 text-sm border rounded-lg hover:bg-muted disabled:opacity-50">
                  {wizard.isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
                </button>
                <button type="button" onClick={() => setShowConfirmSubmit(true)} disabled={isSubmitting || issues.length > 0}
                  className="flex items-center gap-1 px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? 'Submitting…' : 'Submit Application'}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</button>
          <h1 className="text-xl font-semibold">New Customer Onboarding</h1>
        </div>
        {wizard.lastSavedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" /> Draft saved at {wizard.lastSavedAt}
          </div>
        )}
      </div>

      <WizardStepper steps={STEP_LABELS} currentStep={currentStep} onStepClick={goToStep} getStepValidation={getStepValidation} />

      <div className="bg-white dark:bg-gray-800 rounded-xl border">
        <div className="px-6 py-4 border-b"><h2 className="text-base font-semibold">Step {currentStep} of {STEP_LABELS.length}: {STEP_LABELS[currentStep - 1]}</h2></div>
        <div className="p-6">{renderStep()}</div>
      </div>

      {/* Draft picker */}
      {showDraftPicker && wizard.existingDrafts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDraftPicker(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Resume Draft?</h3><button onClick={() => setShowDraftPicker(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <p className="text-sm text-muted-foreground">You have saved drafts. Resume one or start fresh.</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {wizard.existingDrafts.map(d => (
                <button key={d.id} onClick={() => { wizard.resumeDraft(d.id); setShowDraftPicker(false); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 text-left">
                  <div><p className="text-sm font-medium">{d.displayLabel || `Draft #${d.id}`}</p><p className="text-xs text-muted-foreground">Step {d.currentStep} · {d.customerType}</p></div>
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
            <button onClick={() => setShowDraftPicker(false)} className="w-full px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Start Fresh</button>
          </div>
        </div>
      )}

      {/* Confirm submit */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirmSubmit(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <h3 className="font-semibold">Confirm Submission</h3>
            <p className="text-sm text-muted-foreground">This will create a new customer record. Continue?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirmSubmit(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => { submit(); setShowConfirmSubmit(false); }} disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {isSubmitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
