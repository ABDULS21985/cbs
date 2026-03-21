import { useQuery } from '@tanstack/react-query';
import { Activity, Clock, AlertTriangle, Zap, CheckCircle } from 'lucide-react';
import { StatCard } from '@/components/shared';
import { gatewayApi } from '../api/gatewayApi';

export function GatewayLiveStats() {
  const { data, isLoading } = useQuery({
    queryKey: ['gateway', 'stats'],
    queryFn: () => gatewayApi.getLiveStats(),
    refetchInterval: 10_000,
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        label="Messages Today"
        value={data?.messagesToday ?? 0}
        format="number"
        icon={Activity}
        loading={isLoading}
      />
      <StatCard
        label="Pending"
        value={data?.pending ?? 0}
        format="number"
        icon={Clock}
        loading={isLoading}
      />
      <StatCard
        label="Failed"
        value={data?.failed ?? 0}
        format="number"
        icon={AlertTriangle}
        loading={isLoading}
      />
      <StatCard
        label="Avg Latency"
        value={data ? `${data.avgLatencyMs}ms` : '—'}
        icon={Zap}
        loading={isLoading}
      />
      <StatCard
        label="Acknowledged"
        value={data?.acknowledged ?? 0}
        format="number"
        icon={CheckCircle}
        loading={isLoading}
      />
    </div>
  );
}
