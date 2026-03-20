import { StatCard } from '@/components/shared';
import { Users, CheckCircle2, Ban, KeyRound, Activity } from 'lucide-react';

interface OpenBankingStatsRowProps {
  registeredTpps: number;
  activeTpps: number;
  suspendedTpps: number;
  totalConsents: number;
  apiCallsToday: number;
  loading?: boolean;
}

export function OpenBankingStatsRow({
  registeredTpps,
  activeTpps,
  suspendedTpps,
  totalConsents,
  apiCallsToday,
  loading,
}: OpenBankingStatsRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard label="Registered TPPs" value={registeredTpps} format="number" icon={Users} loading={loading} />
      <StatCard label="Active TPPs" value={activeTpps} format="number" icon={CheckCircle2} loading={loading} />
      <StatCard label="Suspended" value={suspendedTpps} format="number" icon={Ban} loading={loading} />
      <StatCard label="Total Consents" value={totalConsents} format="number" icon={KeyRound} loading={loading} />
      <StatCard label="API Calls Today" value={apiCallsToday} format="number" icon={Activity} loading={loading} />
    </div>
  );
}
