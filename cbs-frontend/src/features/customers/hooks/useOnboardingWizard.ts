import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { customerApi } from '../api/customerApi';
import type { OnboardingFormData } from '../types/customer';
import { queryKeys } from '@/lib/queryKeys';

const TOTAL_STEPS = 8;
const AUTO_SAVE_MS = 30_000;
const DRAFT_STORAGE_KEY = 'cbs-onboarding-draft';

// ─── Draft Persistence (localStorage) ────────────────────────────────────────

interface LocalDraft {
  id: string;
  formData: OnboardingFormData;
  currentStep: number;
  customerType?: string;
  displayLabel: string;
  savedAt: string;
}

function saveDraftLocal(draft: LocalDraft): void {
  try {
    const existing = loadDraftsLocal();
    const idx = existing.findIndex((d) => d.id === draft.id);
    if (idx >= 0) existing[idx] = draft; else existing.push(draft);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(existing));
  } catch { /* storage full */ }
}

function loadDraftsLocal(): LocalDraft[] {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return [];
    const drafts = JSON.parse(raw) as LocalDraft[];
    // Expire drafts older than 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return drafts.filter((d) => new Date(d.savedAt).getTime() > cutoff);
  } catch { return []; }
}

function deleteDraftLocal(id: string): void {
  try {
    const drafts = loadDraftsLocal().filter((d) => d.id !== id);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch { /* ignore */ }
}

// ─── Validation Helpers ─────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  return /^\+?[0-9]{10,14}$/.test(phone.replace(/[\s-]/g, ''));
}

function validateName(name: string): boolean {
  return /^[a-zA-ZÀ-ÿ\s'-]{2,}$/.test(name);
}

function validateBvn(bvn: string): boolean {
  return /^\d{11}$/.test(bvn);
}

function validateIdNumber(idType: string, idNumber: string): boolean {
  if (!idNumber) return false;
  switch (idType) {
    case 'NIN': return /^\d{11}$/.test(idNumber);
    case 'INTERNATIONAL_PASSPORT':
    case 'International Passport': return /^[A-Z]\d{8}$/i.test(idNumber);
    default: return idNumber.length >= 4;
  }
}

function validateAge(dob: string): { valid: boolean; message?: string } {
  if (!dob) return { valid: false, message: 'Date of birth is required' };
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 18) return { valid: false, message: 'Must be at least 18 years old' };
  if (age > 120) return { valid: false, message: 'Invalid date of birth' };
  return { valid: true };
}

// ─── Main Hook ───────────────────────────────────────────────────────────────

export function useOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>({});
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([1]));
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load existing local drafts
  const existingDrafts = loadDraftsLocal().map((d) => ({
    id: d.id as unknown as number,
    displayLabel: d.displayLabel,
    currentStep: d.currentStep,
    customerType: d.customerType,
    formData: d.formData as unknown as Record<string, unknown>,
  }));

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: (data: OnboardingFormData) => customerApi.submitOnboarding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      if (draftId) deleteDraftLocal(draftId);
      toast.success('Customer created successfully');
    },
    onError: (error) => {
      const msg = axios.isAxiosError(error) ? ((error.response?.data as Record<string, unknown>)?.message as string | undefined) : error instanceof Error ? error.message : undefined;
      toast.error(msg || 'Failed to submit application');
    },
  });

  // Draft auto-save to localStorage
  const saveDraftFn = useCallback(() => {
    if (currentStep <= 1 && !formData.customerType) return;
    const id = draftId || `draft-${Date.now()}`;
    const label = formData.customerType === 'INDIVIDUAL'
      ? `${formData.firstName ?? ''} ${formData.lastName ?? ''}`.trim()
      : formData.registeredName ?? formData.tradingName ?? '';

    saveDraftLocal({
      id,
      formData,
      currentStep,
      customerType: formData.customerType,
      displayLabel: label || 'Untitled Draft',
      savedAt: new Date().toISOString(),
    });

    if (!draftId) setDraftId(id);
    setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setIsDirty(false);
  }, [currentStep, draftId, formData]);

  // Auto-save timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (isDirty && currentStep > 1) saveDraftFn();
    }, AUTO_SAVE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isDirty, currentStep, saveDraftFn]);

  // Save on step change
  useEffect(() => {
    if (isDirty && currentStep > 1) saveDraftFn();
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resume draft
  const resumeDraft = useCallback((id: number) => {
    const drafts = loadDraftsLocal();
    const draft = drafts.find((d) => d.id === String(id) || d.id === (id as unknown as string));
    if (draft) {
      setFormData(draft.formData);
      setCurrentStep(draft.currentStep);
      setDraftId(draft.id);
      setLastSavedAt('Resumed');
      // Mark all steps up to current as visited
      const visited = new Set<number>();
      for (let i = 1; i <= draft.currentStep; i++) visited.add(i);
      setVisitedSteps(visited);
      toast.success('Draft resumed');
    } else {
      toast.error('Draft not found');
    }
  }, []);

  // Field-level validation
  const validateField = useCallback((name: string, value: string): string | null => {
    switch (name) {
      case 'email': return value && !validateEmail(value) ? 'Invalid email format' : null;
      case 'phone': return value && !validatePhone(value) ? 'Invalid phone format (use +234...)' : null;
      case 'firstName':
      case 'lastName': return value && !validateName(value) ? 'Min 2 characters, letters only' : null;
      case 'bvn': return value && !validateBvn(value) ? 'BVN must be 11 digits' : null;
      case 'dateOfBirth': {
        const result = validateAge(value);
        return result.valid ? null : (result.message ?? 'Invalid date');
      }
      case 'idNumber': return value && formData.idType && !validateIdNumber(formData.idType, value) ? 'Invalid format for selected ID type' : null;
      default: return null;
    }
  }, [formData.idType]);

  const setFieldError = useCallback((name: string, error: string | null) => {
    setFieldErrors((prev) => {
      if (error) return { ...prev, [name]: error };
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const onFieldBlur = useCallback((name: string, value: string) => {
    const error = validateField(name, value);
    setFieldError(name, error);
  }, [validateField, setFieldError]);

  // Navigation
  const updateStep = useCallback((data: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setIsDirty(true);
  }, []);

  const nextStep = useCallback((stepData: Partial<OnboardingFormData>) => {
    updateStep(stepData);
    setCurrentStep((s) => {
      const next = Math.min(s + 1, TOTAL_STEPS);
      setVisitedSteps((prev) => new Set([...prev, next]));
      return next;
    });
  }, [updateStep]);

  const prevStep = useCallback(() => setCurrentStep((s) => Math.max(s - 1, 1)), []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
      setVisitedSteps((prev) => new Set([...prev, step]));
    }
  }, []);

  const submit = useCallback(() => submitMutation.mutate(formData), [formData, submitMutation]);

  const saveDraft = useCallback(() => {
    saveDraftFn();
    toast.success('Draft saved');
  }, [saveDraftFn]);

  // Step validation
  const getStepValidation = useCallback((step: number): 'complete' | 'error' | 'unvisited' => {
    if (!visitedSteps.has(step)) return 'unvisited';
    const isCorp = formData.customerType === 'CORPORATE' || formData.customerType === 'SME';
    switch (step) {
      case 1: return formData.customerType ? 'complete' : 'error';
      case 2: {
        if (isCorp) return formData.registeredName ? 'complete' : 'error';
        const nameValid = formData.firstName && formData.lastName && validateName(formData.firstName) && validateName(formData.lastName);
        const dobValid = formData.dateOfBirth ? validateAge(formData.dateOfBirth).valid : false;
        return nameValid && dobValid ? 'complete' : 'error';
      }
      case 3: {
        const emailValid = formData.email ? validateEmail(formData.email) : false;
        const phoneValid = formData.phone ? validatePhone(formData.phone) : false;
        return emailValid && phoneValid && formData.residentialAddress ? 'complete' : 'error';
      }
      case 4: return isCorp ? 'complete' : (formData.idType && formData.idNumber ? 'complete' : 'error');
      case 5: return isCorp ? 'complete' : (formData.bvn?.length === 11 ? 'complete' : (visitedSteps.has(5) ? 'complete' : 'unvisited'));
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
    if (isCorp) {
      if (!formData.registeredName) issues.push({ step: 2, label: 'Company', message: 'Registered name required' });
    } else {
      if (!formData.firstName) issues.push({ step: 2, label: 'Personal', message: 'First name required' });
      if (!formData.lastName) issues.push({ step: 2, label: 'Personal', message: 'Last name required' });
      if (formData.firstName && !validateName(formData.firstName)) issues.push({ step: 2, label: 'Personal', message: 'First name contains invalid characters' });
      if (formData.lastName && !validateName(formData.lastName)) issues.push({ step: 2, label: 'Personal', message: 'Last name contains invalid characters' });
      if (!formData.dateOfBirth) issues.push({ step: 2, label: 'Personal', message: 'Date of birth required' });
      if (formData.dateOfBirth && !validateAge(formData.dateOfBirth).valid) issues.push({ step: 2, label: 'Personal', message: validateAge(formData.dateOfBirth).message ?? 'Invalid DOB' });
    }
    if (!formData.email) issues.push({ step: 3, label: 'Contact', message: 'Email required' });
    if (formData.email && !validateEmail(formData.email)) issues.push({ step: 3, label: 'Contact', message: 'Invalid email format' });
    if (!formData.phone) issues.push({ step: 3, label: 'Contact', message: 'Phone required' });
    if (formData.phone && !validatePhone(formData.phone)) issues.push({ step: 3, label: 'Contact', message: 'Invalid phone format' });
    if (!formData.residentialAddress) issues.push({ step: 3, label: 'Contact', message: 'Address required' });
    if (!isCorp && !formData.idType) issues.push({ step: 4, label: 'ID/KYC', message: 'ID type required' });
    if (!isCorp && !formData.idNumber) issues.push({ step: 4, label: 'ID/KYC', message: 'ID number required' });
    if (!formData.accountProduct) issues.push({ step: 7, label: 'Account', message: 'Product not selected' });
    if (!formData.acceptTerms) issues.push({ step: 7, label: 'Account', message: 'Terms must be accepted' });
    return issues;
  }, [formData]);

  return {
    currentStep, totalSteps: TOTAL_STEPS, formData, visitedSteps,
    nextStep, prevStep, goToStep, updateStep, submit, saveDraft, resumeDraft,
    isSubmitting: submitMutation.isPending, isSubmitSuccess: submitMutation.isSuccess,
    submittedCustomer: submitMutation.data,
    isSavingDraft: false, draftId, lastSavedAt, existingDrafts,
    getStepValidation, getValidationIssues,
    fieldErrors, onFieldBlur, setFieldError, validateField,
  };
}
