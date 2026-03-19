import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { accountDetailApi, type Transaction, type TransactionQueryParams } from '../api/accountDetailApi';

interface DateRange { from?: Date; to?: Date; }

export function useTransactions(accountId: string) {
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [type, setType] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  const params: TransactionQueryParams = useMemo(() => ({
    dateFrom: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    dateTo: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    type: type === 'ALL' ? undefined : type,
    minAmount: minAmount ? parseFloat(minAmount) : undefined,
    maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    search: searchText || undefined,
  }), [dateRange, type, minAmount, maxAmount, searchText]);

  const { data: transactions = [], isLoading, refetch } = useQuery<Transaction[], Error>({
    queryKey: ['accounts', accountId, 'transactions', params],
    queryFn: () => accountDetailApi.getTransactions(accountId, params),
    enabled: !!accountId,
    staleTime: 20_000,
  });

  const summary = useMemo(() => {
    const totalDebits = transactions.reduce((sum, t) => sum + (t.debitAmount ?? 0), 0);
    const totalCredits = transactions.reduce((sum, t) => sum + (t.creditAmount ?? 0), 0);
    const netAmount = totalCredits - totalDebits;
    return { totalDebits, totalCredits, netAmount };
  }, [transactions]);

  return {
    transactions,
    isLoading,
    refetch,
    // Filters
    dateRange,
    setDateRange,
    type,
    setType,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    searchText,
    setSearchText,
    summary,
  };
}
