import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Landmark, BarChart3, Wallet, Tags, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { cn } from '@/lib/utils';
import { useAgreements, useTdFrameworks, useCommissionAgreements, useActiveDiscounts, useSpecialPricingAgreements } from '../hooks/useAgreementsExt';
import type { LucideIcon } from 'lucide-react';

interface HubCard {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  count?: number;
  loading?: boolean;
  color: string;
}

export function AgreementsHubPage() {
  useEffect(() => { document.title = 'Agreements & Pricing | CBS'; }, []);
  const navigate = useNavigate();

  const { data: agreements = [], isLoading: agLoading } = useAgreements();
  const { data: tdFrameworks = [], isLoading: tdLoading } = useTdFrameworks();
  const { data: commissions = [], isLoading: cmLoading } = useCommissionAgreements();
  const { data: activeDiscounts = [], isLoading: adLoading } = useActiveDiscounts();
  const { data: specialPricing = [], isLoading: spLoading } = useSpecialPricingAgreements();

  const activeAgreements = agreements.filter(a => a.status === 'ACTIVE');
  const activeTd = tdFrameworks.filter(t => t.status === 'ACTIVE');
  const activeCommissions = commissions.filter((c: { status: string }) => c.status === 'ACTIVE');

  const today = new Date().toISOString().split('T')[0];
  const upcomingRenewals = agreements.filter(a => a.effectiveTo && a.effectiveTo >= today && a.effectiveTo <= new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]).length;
  const overdueReviews = specialPricing.filter(sp => sp.nextReviewDate && sp.nextReviewDate < today).length;

  const cards: HubCard[] = [
    {
      title: 'Customer Agreements',
      description: 'Manage customer service agreements, renewals, and terminations',
      icon: FileText,
      path: '/agreements/list',
      count: activeAgreements.length,
      loading: agLoading,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      title: 'TD Frameworks',
      description: 'Term deposit framework agreements with rate structures and maturity policies',
      icon: Landmark,
      path: '/agreements/td-frameworks',
      count: activeTd.length,
      loading: tdLoading,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      title: 'TD Portfolio Analytics',
      description: 'Maturity ladder, rollover forecasts, and large deposit reporting',
      icon: BarChart3,
      path: '/agreements/td-summary',
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      title: 'Commission Management',
      description: 'Commission agreements, payout calculation, and agent/broker management',
      icon: Wallet,
      path: '/agreements/commissions',
      count: activeCommissions.length,
      loading: cmLoading,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      title: 'Pricing & Discounts',
      description: 'Discount schemes, special pricing agreements, and fee evaluations',
      icon: Tags,
      path: '/agreements/pricing',
      count: activeDiscounts.length,
      loading: adLoading,
      color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    },
  ];

  const totalActive = activeAgreements.length + activeTd.length + activeCommissions.length + activeDiscounts.length;
  const anyLoading = agLoading || tdLoading || cmLoading || adLoading || spLoading;

  return (
    <>
      <PageHeader title="Agreements & Pricing" subtitle="Central hub for all agreement and pricing management" />

      <div className="page-container space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Active" value={totalActive} format="number" loading={anyLoading} />
          <StatCard label="Upcoming Renewals" value={upcomingRenewals} format="number" loading={agLoading} />
          <StatCard label="Overdue Reviews" value={overdueReviews} format="number" loading={spLoading} />
          <StatCard label="Active Discounts" value={activeDiscounts.length} format="number" loading={adLoading} />
        </div>

        {/* Navigation cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <button
                key={card.path}
                onClick={() => navigate(card.path)}
                className="text-left bg-card rounded-lg border p-5 hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('p-2.5 rounded-lg', card.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {card.count !== undefined && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      {card.loading ? '...' : card.count}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1">{card.title}</h3>
                <p className="text-xs text-muted-foreground mb-3">{card.description}</p>
                <div className="flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                  Open <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
