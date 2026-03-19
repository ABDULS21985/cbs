import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fixedDepositApi, type FixedDeposit, type FdStats } from '../api/fixedDepositApi';

type ActiveTab = 'active' | 'maturing' | 'matured' | 'liquidated';

const TAB_STATUS_MAP: Record<ActiveTab, string> = {
  active: 'ACTIVE',
  maturing: 'ACTIVE',
  matured: 'MATURED',
  liquidated: 'LIQUIDATED',
};

function isMaturingSoon(fd: FixedDeposit): boolean {
  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);
  const mat = new Date(fd.maturityDate);
  return mat >= today && mat <= in30Days;
}

export function useFixedDeposits() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');

  const { data: allFds = [], isLoading: listLoading } = useQuery<FixedDeposit[]>({
    queryKey: ['fixed-deposits', 'list', TAB_STATUS_MAP[activeTab]],
    queryFn: () => fixedDepositApi.getFixedDeposits({ status: TAB_STATUS_MAP[activeTab] }),
    staleTime: 30_000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<FdStats>({
    queryKey: ['fixed-deposits', 'stats'],
    queryFn: () => fixedDepositApi.getStats(),
    staleTime: 60_000,
  });

  const list: FixedDeposit[] = activeTab === 'maturing'
    ? allFds.filter(isMaturingSoon)
    : allFds;

  const isLoading = listLoading || statsLoading;

  return { list, stats, isLoading, activeTab, setActiveTab };
}
