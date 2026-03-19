import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormSection } from '@/components/shared';
import { useCreateAgreement, useAgreementTemplates } from '../hooks/useAgreementsExt';
import { AgreementForm } from '../components/AgreementForm';
import type { CreateCustomerAgreementPayload, AgreementTemplate } from '../types/agreementExt';
import { cn } from '@/lib/utils';

export function AgreementCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<AgreementTemplate | null>(null);
  const [formData, setFormData] = useState<CreateCustomerAgreementPayload | null>(null);

  const { data: templates = [], isLoading: templatesLoading } = useAgreementTemplates();
  const createMutation = useCreateAgreement();

  const handleTemplateSelect = (template: AgreementTemplate | null) => {
    setSelectedTemplate(template);
    setStep(2);
  };

  const handleFormSubmit = (data: CreateCustomerAgreementPayload) => {
    setFormData(data);
    setStep(3);
  };

  const handleCreate = () => {
    if (!formData) return;
    createMutation.mutate(formData, {
      onSuccess: (created) => {
        toast.success('Agreement created successfully');
        navigate(`/agreements/${created.id}`);
      },
      onError: () => toast.error('Failed to create agreement'),
    });
  };

  const templateInitialData = selectedTemplate
    ? {
        agreementType: selectedTemplate.type,
        title: selectedTemplate.name,
        description: selectedTemplate.description || '',
      }
    : undefined;

  return (
    <>
      <PageHeader
        title="New Agreement"
        subtitle="Create a new customer agreement"
        backTo="/agreements"
        actions={
          <button
            onClick={() => navigate('/agreements')}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />
      <div className="page-container max-w-4xl space-y-6">
        {/* Stepper */}
        <div className="flex items-center gap-0">
          {[
            { num: 1, label: 'Template' },
            { num: 2, label: 'Details' },
            { num: 3, label: 'Review' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                  step > s.num && 'bg-primary border-primary text-primary-foreground',
                  step === s.num && 'border-primary text-primary',
                  step < s.num && 'border-muted-foreground/30 text-muted-foreground',
                )}>
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={cn('text-sm font-medium', step === s.num ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.label}
                </span>
              </div>
              {i < 2 && <div className={cn('flex-1 h-px mx-3', step > s.num ? 'bg-primary' : 'bg-border')} />}
            </div>
          ))}
        </div>

        {/* Step 1: Template Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <FormSection title="Choose a Template" description="Optionally start from a template to pre-fill agreement details">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Start from scratch */}
                <button
                  onClick={() => handleTemplateSelect(null)}
                  className="flex flex-col items-start gap-3 rounded-xl border-2 border-dashed p-4 text-left hover:bg-muted/50 hover:border-primary/50 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Start from Scratch</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Create a blank agreement</p>
                  </div>
                </button>

                {/* Template cards */}
                {templatesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-4 animate-pulse">
                      <div className="h-10 w-10 bg-muted rounded-lg mb-3" />
                      <div className="h-4 w-24 bg-muted rounded mb-1" />
                      <div className="h-3 w-32 bg-muted rounded" />
                    </div>
                  ))
                ) : (
                  templates.filter(t => t.isActive).map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="flex flex-col items-start gap-3 rounded-xl border p-4 text-left hover:bg-muted/50 hover:border-primary/50 hover:shadow-sm transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{template.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.type.replace(/_/g, ' ')}
                        </p>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </FormSection>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip to form <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Agreement Form */}
        {step === 2 && (
          <div className="space-y-4">
            {selectedTemplate && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Pre-filled from template: <strong>{selectedTemplate.name}</strong></span>
                <button
                  onClick={() => { setSelectedTemplate(null); setStep(1); }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Change template
                </button>
              </div>
            )}

            <AgreementForm
              initialData={templateInitialData}
              onSubmit={handleFormSubmit}
              isLoading={false}
              submitLabel="Continue to Review"
            />

            <div className="flex justify-start">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Templates
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && formData && (
          <div className="space-y-6">
            <FormSection title="Review Agreement" description="Confirm the details before creating">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReviewItem label="Agreement Type" value={formData.agreementType.replace(/_/g, ' ')} />
                <ReviewItem label="Title" value={formData.title} />
                <ReviewItem label="Customer ID" value={String(formData.customerId)} />
                <ReviewItem label="Document Ref" value={formData.documentRef || '—'} />
                <ReviewItem label="Effective From" value={formData.effectiveFrom} />
                <ReviewItem label="Effective To" value={formData.effectiveTo || '—'} />
                <ReviewItem label="Auto-Renew" value={formData.autoRenew ? `Yes (${formData.renewalTermMonths || 12} months)` : 'No'} />
                <ReviewItem label="Notice Period" value={`${formData.noticePeriodDays || 0} days`} />
                {formData.description && (
                  <div className="md:col-span-2">
                    <ReviewItem label="Description" value={formData.description} />
                  </div>
                )}
              </div>
            </FormSection>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Edit Details
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Create Agreement
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
