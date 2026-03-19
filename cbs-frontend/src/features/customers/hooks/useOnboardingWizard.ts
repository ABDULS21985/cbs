import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { customerApi } from '../api/customerApi';
import type { OnboardingFormData } from '../types/customer';
import { queryKeys } from '@/lib/queryKeys';

const TOTAL_STEPS = 8;

export function useOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>({});
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: (data: OnboardingFormData) => customerApi.submitOnboarding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success('Customer created successfully');
    },
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.message as string | undefined)
        : error instanceof Error
          ? error.message
          : undefined;
      toast.error(message || 'Failed to submit customer application');
    },
  });

  const updateStep = useCallback((data: Partial<OnboardingFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  const nextStep = useCallback((stepData: Partial<OnboardingFormData>) => {
    updateStep(stepData);
    setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
  }, [updateStep]);

  const prevStep = useCallback(() => {
    setCurrentStep(s => Math.max(s - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const submit = useCallback(() => {
    submitMutation.mutate(formData);
  }, [formData, submitMutation]);

  const saveDraft = useCallback(() => {
    toast.error('Draft save is unavailable until the backend exposes a live endpoint.');
  }, []);

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    formData,
    nextStep,
    prevStep,
    goToStep,
    updateStep,
    submit,
    saveDraft,
    isSubmitting: submitMutation.isPending,
    isSubmitSuccess: submitMutation.isSuccess,
    submittedCustomer: submitMutation.data,
  };
}
