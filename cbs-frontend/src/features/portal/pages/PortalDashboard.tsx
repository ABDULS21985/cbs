import { Link } from 'react-router-dom';
import { ArrowLeftRight, Receipt, FileText, LifeBuoy, CreditCard, Landmark } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';

const quickLinks = [
  { icon: ArrowLeftRight, label: 'Transfer', path: '/portal/transfer', color: 'bg-blue-100 text-blue-600' },
  { icon: Receipt, label: 'Pay Bills', path: '/portal/transfer', color: 'bg-green-100 text-green-600' },
  { icon: FileText, label: 'Statements', path: '/portal/accounts', color: 'bg-purple-100 text-purple-600' },
  { icon: LifeBuoy, label: 'Support', path: '/portal/requests', color: 'bg-amber-100 text-amber-600' },
];

const mockAccounts = [
  { name: 'Savings Account', number: '0123456789', balance: 2450000, currency: 'NGN' },
  { name: 'Current Account', number: '0987654321', balance: 890000, currency: 'NGN' },
];

export function PortalDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Good morning!</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s your account overview</p>
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mockAccounts.map((acct) => (
          <Link key={acct.number} to="/portal/accounts" className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{acct.name}</span>
            </div>
            <div className="text-2xl font-bold font-mono">{formatMoney(acct.balance, acct.currency)}</div>
            <div className="text-xs text-muted-foreground mt-1 font-mono">{acct.number}</div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
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

      {/* Recent transactions */}
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Transactions</h3>
          <Link to="/portal/accounts" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        <div className="divide-y">
          {[
            { desc: 'Transfer to John Doe', amount: -50000, date: 'Today, 2:30 PM' },
            { desc: 'Salary Credit', amount: 450000, date: 'Yesterday' },
            { desc: 'DSTV Subscription', amount: -21000, date: '15 Mar' },
            { desc: 'POS Purchase', amount: -8500, date: '14 Mar' },
          ].map((tx, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm">{tx.desc}</p>
                <p className="text-xs text-muted-foreground">{tx.date}</p>
              </div>
              <span className={`font-mono text-sm font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-foreground'}`}>
                {tx.amount >= 0 ? '+' : ''}{formatMoney(Math.abs(tx.amount), 'NGN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
