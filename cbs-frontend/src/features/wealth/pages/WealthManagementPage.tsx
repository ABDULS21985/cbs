import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, StatCard, TabsPage, InfoGrid } from '@/components/shared';
import { wealthApi, type WealthPlan, type TrustAccount, type Advisor } from '../api/wealthApi';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Landmark, Users, TrendingUp, Shield, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const planCols: ColumnDef<WealthPlan, any>[] = [
  { accessorKey: 'planCode', header: 'Plan #', cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.planCode}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'planType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.planType} /> },
  { accessorKey: 'totalInvestableAssets', header: 'AUM', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.totalInvestableAssets)}</span> },
  { accessorKey: 'riskProfile', header: 'Risk Profile' },
  { accessorKey: 'advisorName', header: 'Advisor' },
  { accessorKey: 'nextReviewDate', header: 'Next Review', cell: ({ row }) => row.original.nextReviewDate ? formatDate(row.original.nextReviewDate) : '—' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

const trustCols: ColumnDef<TrustAccount, any>[] = [
  { accessorKey: 'trustCode', header: 'Trust #', cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.trustCode}</span> },
  { accessorKey: 'trustType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.trustType} /> },
  { accessorKey: 'grantorName', header: 'Grantor' },
  { accessorKey: 'trusteeName', header: 'Trustee' },
  { accessorKey: 'corpusValue', header: 'Corpus', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.corpusValue)}</span> },
  { accessorKey: 'inceptionDate', header: 'Created', cell: ({ row }) => formatDate(row.original.inceptionDate) },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

const advisorCols: ColumnDef<Advisor, any>[] = [
  { accessorKey: 'name', header: 'Advisor', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: 'clientCount', header: 'Clients' },
  { accessorKey: 'aum', header: 'AUM', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.aum)}</span> },
  { accessorKey: 'revenue', header: 'Revenue', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.revenue)}</span> },
  { accessorKey: 'avgReturn', header: 'Avg Return', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.avgReturn)}</span> },
  { accessorKey: 'satisfaction', header: 'CSAT', cell: ({ row }) => <span className="font-mono text-sm">{row.original.satisfaction}/5</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

export function WealthManagementPage() {
  const navigate = useNavigate();
  const { data: plans = [], isLoading: plansLoading } = useQuery({ queryKey: ['wealth', 'plans'], queryFn: () => wealthApi.getPlans() });
  const { data: trusts = [], isLoading: trustsLoading } = useQuery({ queryKey: ['wealth', 'trusts'], queryFn: () => wealthApi.getTrusts() });
  const { data: advisors = [], isLoading: advisorsLoading } = useQuery({ queryKey: ['wealth', 'advisors'], queryFn: () => wealthApi.getAdvisors() });

  const totalAum = plans.reduce((s, p) => s + (p.totalInvestableAssets || 0), 0);
  const totalCorpus = trusts.reduce((s, t) => s + (t.corpusValue || 0), 0);

  return (
    <>
      <PageHeader title="Wealth & Trust Management" subtitle="Wealth plans, trust accounts, advisor management" />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Wealth Plans" value={plans.length} format="number" icon={TrendingUp} loading={plansLoading} />
          <StatCard label="Total AUM" value={totalAum} format="money" compact icon={Landmark} loading={plansLoading} />
          <StatCard label="Trust Accounts" value={trusts.length} format="number" icon={Shield} loading={trustsLoading} />
          <StatCard label="Trust Corpus" value={totalCorpus} format="money" compact loading={trustsLoading} />
          <StatCard label="Advisors" value={advisors.length} format="number" icon={Users} loading={advisorsLoading} />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'plans', label: 'Wealth Plans', badge: plans.length || undefined, content: (
            <div className="p-4"><DataTable columns={planCols} data={plans} isLoading={plansLoading} enableGlobalFilter enableExport exportFilename="wealth-plans" emptyMessage="No wealth plans found" /></div>
          )},
          { id: 'trusts', label: 'Trust Accounts', badge: trusts.length || undefined, content: (
            <div className="p-4"><DataTable columns={trustCols} data={trusts} isLoading={trustsLoading} enableGlobalFilter enableExport exportFilename="trust-accounts" emptyMessage="No trust accounts found" /></div>
          )},
          { id: 'advisors', label: 'Advisors', content: (
            <div className="p-4"><DataTable columns={advisorCols} data={advisors} isLoading={advisorsLoading} enableGlobalFilter emptyMessage="No advisors found" /></div>
          )},
        ]} />
      </div>
    </>
  );
}
