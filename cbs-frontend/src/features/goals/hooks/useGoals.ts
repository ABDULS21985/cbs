import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalApi, type CreateGoalInput, type AutoDebitConfig, type SavingsGoal } from '../api/goalApi';

const KEYS = {
  all: ['goals'] as const,
  list: (params?: Record<string, unknown>) => ['goals', 'list', params] as const,
  customerGoals: (customerId: number) => ['goals', 'customer', customerId] as const,
  detail: (goalId: string) => ['goals', 'detail', goalId] as const,
  contributions: (goalId: string) => ['goals', goalId, 'contributions'] as const,
  recurringDeposits: ['goals', 'recurring-deposits'] as const,
  recurringDeposit: (id: string) => ['goals', 'recurring-deposits', id] as const,
};

export function useGoals(params?: { page?: number; size?: number; status?: string }) {
  return useQuery({
    queryKey: KEYS.list(params as Record<string, unknown>),
    queryFn: () => goalApi.getGoals(params),
    staleTime: 30_000,
  });
}

export function useCustomerGoals(customerId: number) {
  return useQuery({
    queryKey: KEYS.customerGoals(customerId),
    queryFn: () => goalApi.getCustomerGoals(customerId),
    enabled: customerId > 0,
    staleTime: 30_000,
  });
}

export function useGoalDetail(goalId: string) {
  return useQuery({
    queryKey: KEYS.detail(goalId),
    queryFn: () => goalApi.getGoalById(goalId),
    enabled: !!goalId,
    staleTime: 30_000,
  });
}

export function useGoalContributions(goalId: string) {
  return useQuery({
    queryKey: KEYS.contributions(goalId),
    queryFn: () => goalApi.getContributions(goalId),
    enabled: !!goalId,
    staleTime: 30_000,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalInput) => goalApi.createGoal(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useContribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, amount }: { goalId: string; amount: number }) =>
      goalApi.contribute(goalId, { amount }),
    onMutate: async ({ goalId, amount }) => {
      await qc.cancelQueries({ queryKey: KEYS.list() });
      const prev = qc.getQueryData<SavingsGoal[]>(KEYS.list());
      if (prev) {
        qc.setQueryData(KEYS.list(), prev.map((g) =>
          g.id === goalId
            ? { ...g, currentAmount: Math.min(g.currentAmount + amount, g.targetAmount), status: g.currentAmount + amount >= g.targetAmount ? 'COMPLETED' as const : g.status }
            : g,
        ));
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(KEYS.list(), context.prev);
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, amount }: { goalId: string; amount: number }) =>
      goalApi.withdraw(goalId, { amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useCancelGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => goalApi.cancel(goalId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useConfigureAutoDebit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, config }: { goalId: string; config: AutoDebitConfig }) =>
      goalApi.configureAutoDebit(goalId, config),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useRecurringDeposits() {
  return useQuery({
    queryKey: KEYS.recurringDeposits,
    queryFn: () => goalApi.getRecurringDeposits(),
    staleTime: 60_000,
  });
}

export function useRecurringDepositDetail(id: string) {
  return useQuery({
    queryKey: KEYS.recurringDeposit(id),
    queryFn: () => goalApi.getRecurringDepositById(id),
    enabled: !!id,
  });
}

export function useProcessAutoDebits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => goalApi.processAutoDebits(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}
