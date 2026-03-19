import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, CheckCircle } from 'lucide-react';
import { WizardStepper } from '../components/onboarding/WizardStepper';
import { useOnboardingWizard } from '../hooks/useOnboardingWizard';
import { customerApi } from '../api/customerApi';
import type { OnboardingFormData } from '../types/customer';

const STEP_LABELS = ['Type', 'Personal', 'Address', 'ID/KYC', 'BVN', 'Employment', 'Account', 'Review'];

// ── BVN Verification sub-component ──────────────────────────────────────────
function BvnVerificationStep({
  formData,
  onNext,
  onBack,
}: {
  formData: OnboardingFormData;
  onNext: (data: Partial<OnboardingFormData>) => void;
  onBack: () => void;
}) {
  const [bvn, setBvn] = useState(formData.bvn ?? '');
  const [result, setResult] = useState<{ matched: boolean; status?: string; failureReason?: string | null; verificationProvider?: string | null } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (bvn.length !== 11) return;
    setVerifying(true);
    try {
      const data = await customerApi.verifyBvn(bvn, undefined, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
      });
      setResult({
        matched: data.status === 'VERIFIED',
        status: data.status,
        failureReason: data.failureReason ?? null,
        verificationProvider: data.verificationProvider ?? null,
      });
    } catch (error) {
      setResult({
        matched: false,
        status: 'FAILED',
        failureReason: error instanceof Error ? error.message : 'BVN verification failed',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          BVN (11 digits)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={11}
            value={bvn}
            onChange={e => setBvn(e.target.value.replace(/\D/g, ''))}
            placeholder="00000000000"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleVerify}
            disabled={bvn.length !== 11 || verifying}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {verifying ? 'Verifying…' : 'Verify BVN'}
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`p-4 rounded-lg text-sm ${
            result.matched
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {result.matched ? (
            <div>
              <div className="font-semibold mb-1 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" /> BVN Verified Successfully
              </div>
              {result.verificationProvider && <div>Provider: {result.verificationProvider}</div>}
            </div>
          ) : (
            <div>{result.failureReason || `BVN verification failed${result.status ? ` (${result.status})` : ''}`}</div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          onClick={() => onNext({ bvn, bvnVerified: result?.matched ?? false })}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {result?.matched ? 'Next' : 'Skip'} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Review section helper ────────────────────────────────────────────────────
function ReviewSection({
  title,
  items,
  onEdit,
}: {
  title: string;
  items: { label: string; value: string }[];
  onEdit: () => void;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Edit
        </button>
      </div>
      {items.map(({ label, value }) => (
        <div key={label} className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">{label}</span>
          <span className="text-gray-900 dark:text-gray-100 font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function OnboardingWizardPage() {
  const navigate = useNavigate();
  const wizard = useOnboardingWizard();

  useEffect(() => {
    if (wizard.isSubmitSuccess && wizard.submittedCustomer) {
      navigate(`/customers/${wizard.submittedCustomer.id}`);
    }
  }, [wizard.isSubmitSuccess, wizard.submittedCustomer, navigate]);

  const renderStep = () => {
    const { currentStep, formData, nextStep, prevStep, updateStep, goToStep, submit, saveDraft, isSubmitting } = wizard;

    switch (currentStep) {
      // ── Step 1: Customer Type ──────────────────────────────────────────────
      case 1:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['INDIVIDUAL', 'CORPORATE', 'SME'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => nextStep({ customerType: type })}
                className={`p-6 border-2 rounded-xl text-left transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                  formData.customerType === type
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{type}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {type === 'INDIVIDUAL' ? 'Personal banking for individuals' :
                   type === 'CORPORATE' ? 'Business accounts for companies' :
                   'Small & medium enterprise accounts'}
                </div>
              </button>
            ))}
          </div>
        );

      // ── Step 2: Personal Info ──────────────────────────────────────────────
      case 2:
        return (
          <form
            onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>);
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {[
              { name: 'firstName', label: 'First Name *', type: 'text', required: true },
              { name: 'lastName',  label: 'Last Name *',  type: 'text', required: true },
              { name: 'middleName', label: 'Middle Name', type: 'text' },
              { name: 'dateOfBirth', label: 'Date of Birth *', type: 'date', required: true },
              { name: 'nationality', label: 'Nationality *', type: 'text', required: true },
            ].map(f => (
              <div key={f.name} className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{f.label}</label>
                <input
                  name={f.name}
                  type={f.type}
                  required={f.required}
                  defaultValue={(formData as any)[f.name] ?? (f.name === 'nationality' ? 'NGA' : '')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="sm:col-span-2 flex justify-between pt-2">
              <button type="button" onClick={prevStep} className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button type="submit" className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        );

      // ── Step 3: Address & Contact ──────────────────────────────────────────
      case 3:
        return (
          <form
            onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>);
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Residential Address *</label>
              <input name="residentialAddress" required defaultValue={formData.residentialAddress}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number *</label>
              <input name="phone" type="tel" required placeholder="+234…" defaultValue={formData.phone}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address *</label>
              <input name="email" type="email" required defaultValue={formData.email}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2 flex justify-between pt-2">
              <button type="button" onClick={prevStep} className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button type="submit" className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        );

      // ── Step 4: ID / KYC Docs ─────────────────────────────────────────────
      case 4:
        return (
          <form
            onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>);
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID Type *</label>
              <select name="idType" required defaultValue={formData.idType ?? ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select ID type</option>
                {['NIN', "Driver's License", 'International Passport', "Voter's Card"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID Number *</label>
              <input name="idNumber" required defaultValue={formData.idNumber}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID Expiry Date</label>
              <input name="idExpiry" type="date" defaultValue={formData.idExpiry}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2 flex justify-between pt-2">
              <button type="button" onClick={prevStep} className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button type="submit" className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        );

      // ── Step 5: BVN ───────────────────────────────────────────────────────
      case 5:
        return (
          <BvnVerificationStep
            formData={formData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );

      // ── Step 6: Employment ────────────────────────────────────────────────
      case 6:
        return (
          <form
            onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              nextStep(Object.fromEntries(fd.entries()) as Partial<OnboardingFormData>);
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employment Status</label>
              <select name="employmentStatus" defaultValue={formData.employmentStatus ?? ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select status</option>
                {['EMPLOYED', 'SELF_EMPLOYED', 'RETIRED', 'STUDENT', 'UNEMPLOYED'].map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employer Name</label>
              <input name="employerName" defaultValue={formData.employerName}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Title</label>
              <input name="jobTitle" defaultValue={formData.jobTitle}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Income Range</label>
              <select name="monthlyIncomeRange" defaultValue={formData.monthlyIncomeRange ?? ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select range</option>
                {[
                  ['BELOW_50K', 'Below ₦50,000'],
                  ['50K_200K', '₦50,000 – ₦200,000'],
                  ['200K_500K', '₦200,000 – ₦500,000'],
                  ['500K_1M', '₦500,000 – ₦1,000,000'],
                  ['ABOVE_1M', 'Above ₦1,000,000'],
                ].map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-between pt-2">
              <button type="button" onClick={prevStep} className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button type="submit" className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        );

      // ── Step 7: Account Selection ─────────────────────────────────────────
      case 7: {
        const productSelected = !!formData.accountProduct;
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                ['SAVINGS', 'Earn interest on deposits, unlimited withdrawals'],
                ['CURRENT', 'Unlimited transactions, chequebook available'],
                ['DOMICILIARY', 'Hold foreign currencies (USD, GBP, EUR)'],
              ] as const).map(([product, desc]) => (
                <button
                  key={product}
                  type="button"
                  onClick={() => updateStep({ accountProduct: product })}
                  className={`p-5 border-2 rounded-xl text-left transition-all hover:border-blue-500 ${
                    formData.accountProduct === product
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{product}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{desc}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={!!formData.acceptTerms}
                onChange={e => updateStep({ acceptTerms: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-700 dark:text-gray-300">
                I accept the terms and conditions of account opening
              </label>
            </div>
            <div className="flex justify-between pt-2">
              <button type="button" onClick={prevStep} className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => productSelected && formData.acceptTerms && nextStep({})}
                disabled={!productSelected || !formData.acceptTerms}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      }

      // ── Step 8: Review & Submit ───────────────────────────────────────────
      case 8:
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Review Your Application</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <ReviewSection
                title="Personal"
                items={[
                  { label: 'Full Name', value: `${formData.firstName ?? ''} ${formData.lastName ?? ''}`.trim() || '—' },
                  { label: 'Date of Birth', value: formData.dateOfBirth ?? '—' },
                  { label: 'Nationality', value: formData.nationality ?? '—' },
                ]}
                onEdit={() => goToStep(2)}
              />
              <ReviewSection
                title="Contact"
                items={[
                  { label: 'Phone', value: formData.phone ?? '—' },
                  { label: 'Email', value: formData.email ?? '—' },
                  { label: 'Address', value: formData.residentialAddress ?? '—' },
                ]}
                onEdit={() => goToStep(3)}
              />
              <ReviewSection
                title="Identification"
                items={[
                  { label: 'ID Type', value: formData.idType ?? '—' },
                  { label: 'ID Number', value: formData.idNumber ?? '—' },
                  { label: 'BVN Verified', value: formData.bvnVerified ? 'Yes' : 'No' },
                ]}
                onEdit={() => goToStep(4)}
              />
              <ReviewSection
                title="Account"
                items={[
                  { label: 'Product', value: formData.accountProduct ?? '—' },
                  { label: 'Currency', value: formData.currency ?? 'NGN' },
                  { label: 'Employment', value: formData.employmentStatus ?? '—' },
                ]}
                onEdit={() => goToStep(7)}
              />
            </div>
            <div className="flex gap-3 justify-between pt-4 border-t">
              <button type="button" onClick={prevStep} className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled
                  className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Save className="h-4 w-4" /> Save Draft
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={isSubmitting}
                  className="flex items-center gap-1 px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Draft save is unavailable until the backend exposes a live draft endpoint.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">New Customer Onboarding</h1>
      </div>

      <WizardStepper
        steps={STEP_LABELS}
        currentStep={wizard.currentStep}
        onStepClick={wizard.goToStep}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Step {wizard.currentStep} of {STEP_LABELS.length}: {STEP_LABELS[wizard.currentStep - 1]}
          </h2>
        </div>
        <div className="p-6">{renderStep()}</div>
      </div>
    </div>
  );
}
