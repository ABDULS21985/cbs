import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { customerApi } from '../api/customerApi';
import type { OnboardingFormData } from '../types/customer';
import { queryKeys } from '@/lib/queryKeys';

const TOTAL_STEPS = 8;
const AUTO_SAVE_MS = 30_000;

export function useOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>({});
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([1]));
  const [draftId, setDraftId] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Existing drafts
  const { data: existingDrafts = [] } = useQuery({
    queryKey: ['onboarding-drafts'],
    queryFn: () => customerApi.listDrafts(),
    staleTime: 60_000,
  });

  // Submit
  const submitMutation = useMutation({
    mutationFn: (data: OnboardingFormData) => customerApi.submitOnboarding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success('Customer created successfully');
    },
    onError: (error) => {
      const msg = axios.isAxiosError(error) ? (error.response?.data?.message as string | undefined) : error instanceof Error ? error.message : undefined;
      toast.error(msg || 'Failed to submit application');
    },
  });

  // Draft save
  const draftMutation = useMutation({
    mutationFn: () => {
      const label = formData.customerType === 'INDIVIDUAL'
        ? `${formData.firstName ?? ''} ${formData.lastName ?? ''}`.trim()
        : formData.registeredName ?? formData.tradingName ?? '';
      return customerApi.saveDraft({
        formData: formData as unknown as Record<string, unknown>,
        currentStep,
        customerType: formData.customerType,
        displayLabel: label || 'Untitled Draft',
        id: draftId ?? undefined,
      });
    },
    onSuccess: (data) => {
      if (data?.id) setDraftId(data.id);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['onboarding-drafts'] });
    },
  });

  // Auto-save
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (isDirty && currentStep > 1) draftMutation.mutate();
    }, AUTO_SAVE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isDirty, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const resumeDraft = useCallback(async (id: number) => {
    try {
      const draft = await customerApi.getDraft(id);
      setFormData(draft.formData as unknown as OnboardingFormData);
      setCurrentStep(draft.currentStep);
      setDraftId(draft.id);
      setLastSavedAt('Resumed');
      toast.success('Draft resumed');
    } catch { toast.error('Failed to load draft'); }
  }, []);

  const updateStep = useCallback((data: Partial<OnboardingFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    setIsDirty(true);
  }, []);

  const nextStep = useCallback((stepData: Partial<OnboardingFormData>) => {
    updateStep(stepData);
    setCurrentStep(s => {
      const next = Math.min(s + 1, TOTAL_STEPS);
      setVisitedSteps(prev => new Set([...prev, next]));
      return next;
    });
  }, [updateStep]);

  const prevStep = useCallback(() => setCurrentStep(s => Math.max(s - 1, 1)), []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
      setVisitedSteps(prev => new Set([...prev, step]));
    }
  }, []);

  const submit = useCallback(() => submitMutation.mutate(formData), [formData, submitMutation]);

  const saveDraft = useCallback(() => {
    draftMutation.mutate();
    toast.success('Draft saved');
  }, [draftMutation]);

  // Step validation
  const getStepValidation = useCallback((step: number): 'complete' | 'error' | 'unvisited' => {
    if (!visitedSteps.has(step)) return 'unvisited';
    const isCorp = formData.customerType === 'CORPORATE' || formData.customerType === 'SME';
    switch (step) {
      case 1: return formData.customerType ? 'complete' : 'error';
      case 2: return isCorp ? (formData.registeredName ? 'complete' : 'error') : (formData.firstName && formData.lastName ? 'complete' : 'error');
      case 3: return formData.email && formData.phone ? 'complete' : 'error';
      case 4: return isCorp ? 'complete' : (formData.idType && formData.idNumber ? 'complete' : 'error');
      case 5: return isCorp ? 'complete' : (formData.bvn?.length === 11 ? 'complete' : 'error');
      case 6: return 'complete';
      case 7: return formData.accountProduct && formData.acceptTerms ? 'complete' : 'error';
      case 8: return 'complete';
      default: return 'unvisited';
    }
  }, [formData, visitedSteps]);

  const getValidationIssues = useCallback((): { step: number; label: string; message: string }[] => {
    const issues: { step: number; label: string; message: string }[] = [];
    if (!formData.customerType) issues.push({ step: 1, label: 'Type', message: 'Customer type not selected' });
    const isCorp = formData.customerType === 'CORPORATE' || formData.customerType === 'SME';
    if (isCorp) { if (!formData.registeredName) issues.push({ step: 2, label: 'Personal', message: 'Registered name required' }); }
    else { if (!formData.firstName) issues.push({ step: 2, label: 'Personal', message: 'First name required' }); if (!formData.lastName) issues.push({ step: 2, label: 'Personal', message: 'Last name required' }); }
    if (!formData.email) issues.push({ step: 3, label: 'Address', message: 'Email required' });
    if (!formData.phone) issues.push({ step: 3, label: 'Address', message: 'Phone required' });
    if (!isCorp && !formData.idType) issues.push({ step: 4, label: 'ID/KYC', message: 'ID type required' });
    if (!formData.accountProduct) issues.push({ step: 7, label: 'Account', message: 'Product not selected' });
    if (!formData.acceptTerms) issues.push({ step: 7, label: 'Account', message: 'Terms must be accepted' });
    return issues;
  }, [formData]);

  return {
    currentStep, totalSteps: TOTAL_STEPS, formData, visitedSteps,
    nextStep, prevStep, goToStep, updateStep, submit, saveDraft, resumeDraft,
    isSubmitting: submitMutation.isPending, isSubmitSuccess: submitMutation.isSuccess,
    submittedCustomer: submitMutation.data,
    isSavingDraft: draftMutation.isPending, draftId, lastSavedAt, existingDrafts,
    getStepValidation, getValidationIssues,
  };
}
