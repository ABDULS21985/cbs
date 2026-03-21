import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight, Receipt, FileText, Phone,
  Landmark, Loader2, ArrowUpRight, ArrowDownLeft,
  RefreshCw,
} from 'lucide-react';
import { formatMoney, formatRelative } from '@/lib/formatters';
import { useAuthStore } from '@/stores/authStore';
import { portalApi } from '../api/portalApi';
import type { EnhancedDashboard } from '../types/dashboard';
import { FinancialHealthWidget } from '../components/FinancialHealthWidget';
import { AccountSparkline } from '../components/AccountSparkline';
import { SpendingInsightsChart } from '../components/SpendingInsightsChart';
import { GoalProgressWidget } from '../components/GoalProgressWidget';
import { UpcomingEventsWidget } from '../components/UpcomingEventsWidget';

const quickActions = [
  { icon: ArrowLeftRight, label: 'Transfer', path: '/portal/transfer', color: 'bg-blue-100 text-blue-600' },
  { icon: Receipt, label: 'Pay Bills', path: '/portal/bills', color: 'bg-green-100 text-green-600' },
  { icon: Phone, label: 'Buy Airtime', path: '/portal/airtime', color: 'bg-purple-100 text-purple-600' },
  { icon: FileText, label: 'Statement', path: '/portal/accounts', color: 'bg-amber-100 text-amber-600' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function PortalDashboard() {
  const { user } = useAuthStore();
  const customerId = Number(user?.id) || 0;

  const { data, isLoading, error } = useQuery<EnhancedDashboard>({
    queryKey: ['portal', 'enhanced-dashboard', customerId],
    queryFn: () => portalApi.getEnhancedDashboard(customerId),
    enabled: customerId > 0,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <p className="text-sm">Unable to load dashboard</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {getGreeting()}, {data.displayName?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-sm text-muted-foreground">Here&apos;s your financial overview</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold font-mono">
            {formatMoney(data.totalAvailableBalance, data.accounts[0]?.currency || 'NGN')}
          </p>
        </div>
      </div>

      {/* ── Account Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.accounts.map((acct) => (
          <Link
            key={acct.accountNumber}
            to="/portal/accounts"
            className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{acct.accountName}</span>
              </div>
              {acct.sparkline && acct.sparkline.length > 0 && (
                <AccountSparkline data={acct.sparkline} color="auto" />
              )}
            </div>
            <div className="text-2xl font-bold font-mono">
              {formatMoney(acct.availableBalance, acct.currency)}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground font-mono">{acct.accountNumber}</span>
              {acct.lastTransactionDescription && (
                <span className="text-xs text-muted-foreground truncate max-w-[50%]">
                  {acct.lastTransactionDescription}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.path}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${action.color}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Financial Health + Spending Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FinancialHealthWidget health={data.financialHealth} />
        <SpendingInsightsChart
          spending={data.spendingBreakdown}
          currency={data.accounts[0]?.currency || 'NGN'}
        />
      </div>

      {/* ── Goals + Upcoming Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GoalProgressWidget goals={data.goals} />
        <UpcomingEventsWidget events={data.upcoming} />
      </div>

      {/* ── Recent Activity ── */}
      <div className="rounded-xl border bg-card">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          <Link to="/portal/accounts" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recent transactions</p>
        ) : (
          <div className="divide-y">
            {data.recentActivity.map((tx) => {
              const isCredit = tx.transactionType === 'CREDIT';
              const isTransfer = tx.narration?.toLowerCase().includes('transfer');
              return (
                <div key={tx.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isTransfer ? 'bg-blue-50' : isCredit ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {isTransfer ? (
                      <ArrowLeftRight className={`w-4 h-4 ${isCredit ? 'text-blue-500' : 'text-blue-500'}`} />
                    ) : isCredit ? (
                      <ArrowDownLeft className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{tx.narration || 'Transaction'}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.createdAt ? formatRelative(tx.createdAt) : ''}
                      {tx.accountNumber && ` · ${tx.accountNumber}`}
                    </p>
                  </div>
                  <span className={`font-mono text-sm font-medium flex-shrink-0 ${
                    isCredit ? 'text-green-600' : 'text-foreground'
                  }`}>
                    {isCredit ? '+' : '-'}
                    {formatMoney(tx.amount, tx.currencyCode || 'NGN')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
