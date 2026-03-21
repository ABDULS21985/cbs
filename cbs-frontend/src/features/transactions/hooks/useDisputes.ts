import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { disputeApi, type RaiseDisputeRequest } from '../api/disputeApi';

export function useDisputes(status?: string) {
  const queryClient = useQueryClient();

  const disputesQuery = useQuery({
    queryKey: ['transaction-disputes', status ?? 'ALL'],
    queryFn: () => disputeApi.listDisputes({ status, page: 0, size: 100 }),
    staleTime: 30_000,
  });

  const dashboardQuery = useQuery({
    queryKey: ['transaction-disputes', 'dashboard'],
    queryFn: disputeApi.getDashboard,
    staleTime: 30_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['transaction-disputes'] });
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const raiseDisputeMutation = useMutation({
    mutationFn: ({ transactionId, payload }: { transactionId: string; payload: RaiseDisputeRequest }) =>
      disputeApi.raiseDispute(transactionId, payload),
    onSuccess: invalidate,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, response }: { id: number; response: string }) => disputeApi.respond(id, response),
    onSuccess: invalidate,
  });

  const escalateMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) => disputeApi.escalate(id, notes),
    onSuccess: invalidate,
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, response, notes }: { id: number; response: 'RESOLVED' | 'REJECTED'; notes: string }) =>
      disputeApi.close(id, response, notes),
    onSuccess: invalidate,
  });

  return {
    disputes: disputesQuery.data?.content ?? [],
    totalDisputes: disputesQuery.data?.totalElements ?? 0,
    dashboard: dashboardQuery.data,
    isLoading: disputesQuery.isLoading || dashboardQuery.isLoading,
    isError: disputesQuery.isError || dashboardQuery.isError,
    refetch: () => {
      void disputesQuery.refetch();
      void dashboardQuery.refetch();
    },
    raiseDisputeMutation,
    respondMutation,
    escalateMutation,
    closeMutation,
  };
}
