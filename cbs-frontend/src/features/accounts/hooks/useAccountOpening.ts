import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { accountOpeningApi, type ComplianceCheckResult, type CreatedAccount, type CustomerSearchResult, type Product } from '../api/accountOpeningApi';
import type { AccountOpeningFormData } from '../schemas/accountOpeningSchema';

const TOTAL_STEPS = 5;

const defaultFormData: Partial<AccountOpeningFormData> = {
  customerId: '',
  customerName: '',
  customerType: 'INDIVIDUAL',
  customerSegment: '',
  customerKycStatus: 'PENDING',
  customerPhone: '',
  customerEmail: '',
  productId: '',
  productName: '',
  productType: 'SAVINGS',
  currency: 'NGN',
  accountTitle: '',
  initialDeposit: 0,
  signatories: [],
  signingRule: 'ANY_ONE',
  requestDebitCard: false,
  smsAlerts: true,
  eStatement: true,
  complianceChecked: false,
  termsAccepted: false,
};

export function useAccountOpening() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<AccountOpeningFormData>>(defaultFormData);
  const [complianceResult, setComplianceResult] = useState<ComplianceCheckResult | null>(null);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
    }
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const updateFormData = useCallback((partial: Partial<AccountOpeningFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  }, []);

  const complianceMutation = useMutation({
    mutationFn: () =>
      accountOpeningApi.runComplianceCheck({
        customerId: formData.customerId!,
        productId: formData.productId!,
      }),
    onSuccess: (result) => {
      setComplianceResult(result);
      updateFormData({ complianceChecked: true });
    },
    onError: () => {
      toast.error('Compliance check failed. Please try again.');
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const data = formData as AccountOpeningFormData;
      return accountOpeningApi.createAccount({
        customerId: data.customerId,
        productId: data.productId,
        accountTitle: data.accountTitle,
        currency: data.currency,
        initialDeposit: data.initialDeposit,
        signatories: data.signatories?.map((s) => ({ customerId: s.customerId, role: s.role })),
        signingRule: data.signingRule,
        requestDebitCard: data.requestDebitCard,
        smsAlerts: data.smsAlerts,
        eStatement: data.eStatement,
      });
    },
    onSuccess: (account) => {
      setCreatedAccount(account);
      toast.success(`Account opened successfully! Account number: ${account.accountNumber}`);
    },
    onError: () => {
      toast.error('Failed to open account. Please try again.');
    },
  });

  const runComplianceCheck = useCallback(() => {
    setComplianceResult(null);
    complianceMutation.mutate();
  }, [complianceMutation]);

  const submitAccount = useCallback(() => {
    submitMutation.mutate();
  }, [submitMutation]);

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    goToStep,
    nextStep,
    prevStep,
    formData,
    updateFormData,
    selectedCustomer,
    setSelectedCustomer,
    selectedProduct,
    setSelectedProduct,
    complianceResult,
    runComplianceCheck,
    isCheckingCompliance: complianceMutation.isPending,
    submitAccount,
    isSubmitting: submitMutation.isPending,
    createdAccount,
  };
}
