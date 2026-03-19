import { useQuery } from '@tanstack/react-query';
import { accountDetailApi, type Account } from '../api/accountDetailApi';

export function useAccountDetail(id: string) {
  const { data: account, isLoading, error, refetch } = useQuery<Account, Error>({
    queryKey: ['accounts', 'detail', id],
    queryFn: () => accountDetailApi.getAccount(id),
    enabled: !!id,
    staleTime: 30_000,
  });

  return { account, isLoading, error, refetch };
}
