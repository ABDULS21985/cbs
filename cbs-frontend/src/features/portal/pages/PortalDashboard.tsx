import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Receipt, FileText, LifeBuoy, Landmark, Loader2 } from 'lucide-react';
import { formatMoney, formatRelative } from '@/lib/formatters';
import { portalApi } from '../api/portalApi';

const quickLinks = [
  { icon: ArrowLeftRight, label: 'Transfer', path: '/portal/transfer', color: 'bg-blue-100 text-blue-600' },
  { icon: Receipt, label: 'Pay Bills', path: '/portal/transfer', color: 'bg-green-100 text-green-600' },
  { icon: FileText, label: 'Statements', path: '/portal/accounts', color: 'bg-purple-100 text-purple-600' },
  { icon: LifeBuoy, label: 'Support', path: '/portal/requests', color: 'bg-amber-100 text-amber-600' },
];

export function PortalDashboard() {
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['portal', 'accounts'],
    queryFn: () => portalApi.getAccounts(),
  });

  const { data: recentTxns = [], isLoading: txnsLoading } = useQuery({
    queryKey: ['portal', 'recent-transactions'],
    queryFn: () => portalApi.getRecentTransactions(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Good morning!</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s your account overview</p>
      </div>

      {accountsLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {accounts.map((acct) => (
            <Link key={acct.accountNumber} to="/portal/accounts" className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <Landmark className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{acct.accountName}</span>
              </div>
              <div className="text-2xl font-bold font-mono">{formatMoney(acct.availableBalance, acct.currency)}</div>
              <div className="text-xs text-muted-foreground mt-1 font-mono">{acct.accountNumber}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickLinks.map((link) => (
          <Link key={link.label} to={link.path} className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${link.color}`}>
              <link.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Transactions</h3>
          <Link to="/portal/accounts" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        {txnsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : recentTxns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recent transactions</p>
        ) : (
          <div className="divide-y">
            {recentTxns.slice(0, 5).map((tx) => (
              <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(tx.date)}</p>
                </div>
                <span className={`font-mono text-sm font-medium ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-foreground'}`}>
                  {tx.type === 'CREDIT' ? '+' : '-'}{formatMoney(tx.amount, 'NGN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
