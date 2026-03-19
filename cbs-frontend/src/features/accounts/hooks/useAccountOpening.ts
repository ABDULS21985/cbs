import { useReducer, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { accountOpeningApi, type ComplianceCheckResult, type CreatedAccount, type CustomerSearchResult, type Product } from '../api/accountOpeningApi';
import type { AccountOpeningFormData } from '../schemas/accountOpeningSchema';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;
const DRAFT_STORAGE_KEY = 'cbs:account-opening-draft';

// ─── State & Action Types ─────────────────────────────────────────────────────

export interface AccountOpeningState {
  currentStep: number;
  formData: Partial<AccountOpeningFormData>;
  selectedCustomer: CustomerSearchResult | null;
  selectedProduct: Product | null;
  complianceResult: ComplianceCheckResult | null;
  createdAccount: CreatedAccount | null;
}

export type AccountOpeningAction =
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<AccountOpeningFormData> }
  | { type: 'SET_CUSTOMER'; customer: CustomerSearchResult | null }
  | { type: 'SET_PRODUCT'; product: Product | null }
  | { type: 'SET_COMPLIANCE_RESULT'; result: ComplianceCheckResult | null }
  | { type: 'SET_CREATED_ACCOUNT'; account: CreatedAccount }
  | { type: 'RESTORE_DRAFT'; state: Partial<AccountOpeningState> }
  | { type: 'CLEAR_DRAFT' };

// ─── Default State ────────────────────────────────────────────────────────────

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

const initialState: AccountOpeningState = {
  currentStep: 1,
  formData: defaultFormData,
  selectedCustomer: null,
  selectedProduct: null,
  complianceResult: null,
  createdAccount: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function accountOpeningReducer(state: AccountOpeningState, action: AccountOpeningAction): AccountOpeningState {
  switch (action.type) {
    case 'GO_TO_STEP':
      if (action.step >= 1 && action.step <= TOTAL_STEPS) {
        return { ...state, currentStep: action.step };
      }
      return state;

    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS) };

    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 1) };

    case 'UPDATE_FORM_DATA':
      return { ...state, formData: { ...state.formData, ...action.payload } };

    case 'SET_CUSTOMER':
      return { ...state, selectedCustomer: action.customer };

    case 'SET_PRODUCT':
      return { ...state, selectedProduct: action.product };

    case 'SET_COMPLIANCE_RESULT':
      return { ...state, complianceResult: action.result };

    case 'SET_CREATED_ACCOUNT':
      return { ...state, createdAccount: action.account };

    case 'RESTORE_DRAFT':
      return {
        ...state,
        currentStep: action.state.currentStep ?? state.currentStep,
        formData: action.state.formData ? { ...defaultFormData, ...action.state.formData } : state.formData,
        selectedCustomer: action.state.selectedCustomer ?? state.selectedCustomer,
        selectedProduct: action.state.selectedProduct ?? state.selectedProduct,
        complianceResult: action.state.complianceResult ?? state.complianceResult,
      };

    case 'CLEAR_DRAFT':
      return initialState;

    default:
      return state;
  }
}

// ─── Draft Persistence ────────────────────────────────────────────────────────

interface DraftData {
  currentStep: number;
  formData: Partial<AccountOpeningFormData>;
  selectedCustomer: CustomerSearchResult | null;
  selectedProduct: Product | null;
  complianceResult: ComplianceCheckResult | null;
  savedAt: string;
}

function saveDraft(state: AccountOpeningState): void {
  // Don't save if account was already created
  if (state.createdAccount) return;
  // Don't save if we're at step 1 with no data
  if (state.currentStep === 1 && !state.formData.customerId) return;

  const draft: DraftData = {
    currentStep: state.currentStep,
    formData: state.formData,
    selectedCustomer: state.selectedCustomer,
    selectedProduct: state.selectedProduct,
    complianceResult: state.complianceResult,
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

function loadDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw) as DraftData;

    // Expire drafts older than 24 hours
    const savedAt = new Date(draft.savedAt).getTime();
    if (Date.now() - savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }

    return draft;
  } catch {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAccountOpening() {
  const [state, dispatch] = useReducer(accountOpeningReducer, initialState, (init) => {
    const draft = loadDraft();
    if (draft) {
      return accountOpeningReducer(init, {
        type: 'RESTORE_DRAFT',
        state: {
          currentStep: draft.currentStep,
          formData: draft.formData,
          selectedCustomer: draft.selectedCustomer,
          selectedProduct: draft.selectedProduct,
          complianceResult: draft.complianceResult,
        },
      });
    }
    return init;
  });

  // Persist draft on every meaningful state change
  useEffect(() => {
    saveDraft(state);
  }, [state.currentStep, state.formData, state.selectedCustomer, state.selectedProduct, state.complianceResult]);

  // ── Action dispatchers ──────────────────────────────────────────────────────

  const goToStep = useCallback((step: number) => {
    dispatch({ type: 'GO_TO_STEP', step });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const updateFormData = useCallback((partial: Partial<AccountOpeningFormData>) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: partial });
  }, []);

  const setSelectedCustomer = useCallback((customer: CustomerSearchResult | null) => {
    dispatch({ type: 'SET_CUSTOMER', customer });
  }, []);

  const setSelectedProduct = useCallback((product: Product | null) => {
    dispatch({ type: 'SET_PRODUCT', product });
  }, []);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const complianceMutation = useMutation({
    mutationFn: () =>
      accountOpeningApi.runComplianceCheck({
        customerId: state.formData.customerId!,
        productId: state.formData.productId!,
      }),
    onSuccess: (result) => {
      dispatch({ type: 'SET_COMPLIANCE_RESULT', result });
      dispatch({ type: 'UPDATE_FORM_DATA', payload: { complianceChecked: true } });
    },
    onError: () => {
      toast.error('Compliance check failed. Please try again.');
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const data = state.formData as AccountOpeningFormData;
      return accountOpeningApi.createAccount({
        customerId: data.customerId,
        productId: data.productId,
        customerType: data.customerType,
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
      dispatch({ type: 'SET_CREATED_ACCOUNT', account });
      clearDraft();
      toast.success(`Account opened successfully! Account number: ${account.accountNumber}`);
    },
    onError: () => {
      toast.error('Failed to open account. Please try again.');
    },
  });

  const runComplianceCheck = useCallback(() => {
    dispatch({ type: 'SET_COMPLIANCE_RESULT', result: null });
    complianceMutation.mutate();
  }, [complianceMutation]);

  const submitAccount = useCallback(() => {
    submitMutation.mutate();
  }, [submitMutation]);

  const discardDraft = useCallback(() => {
    clearDraft();
    dispatch({ type: 'CLEAR_DRAFT' });
  }, []);

  return {
    currentStep: state.currentStep,
    totalSteps: TOTAL_STEPS,
    goToStep,
    nextStep,
    prevStep,
    formData: state.formData,
    updateFormData,
    selectedCustomer: state.selectedCustomer,
    setSelectedCustomer,
    selectedProduct: state.selectedProduct,
    setSelectedProduct,
    complianceResult: state.complianceResult,
    runComplianceCheck,
    isCheckingCompliance: complianceMutation.isPending,
    submitAccount,
    isSubmitting: submitMutation.isPending,
    createdAccount: state.createdAccount,
    hasDraft: Boolean(loadDraft()),
    discardDraft,
  };
}
