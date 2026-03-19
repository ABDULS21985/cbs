import { useState } from 'react';
import { Download } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/formatters';

const mockAccounts = [
  { id: 1, name: 'Savings Account', number: '0123456789', balance: 2450000, currency: 'NGN', status: 'ACTIVE' },
  { id: 2, name: 'Current Account', number: '0987654321', balance: 890000, currency: 'NGN', status: 'ACTIVE' },
];

const mockTransactions = [
  { id: 1, date: '2026-03-18', description: 'Transfer to John Doe', type: 'DEBIT', amount: 50000, balance: 2400000 },
  { id: 2, date: '2026-03-17', description: 'Salary Credit', type: 'CREDIT', amount: 450000, balance: 2450000 },
  { id: 3, date: '2026-03-15', description: 'DSTV Subscription', type: 'DEBIT', amount: 21000, balance: 2000000 },
  { id: 4, date: '2026-03-14', description: 'POS Purchase - Shoprite', type: 'DEBIT', amount: 8500, balance: 2021000 },
  { id: 5, date: '2026-03-12', description: 'ATM Withdrawal', type: 'DEBIT', amount: 100000, balance: 2029500 },
];

export function PortalAccountsPage() {
  const [selectedAccount, setSelectedAccount] = useState(mockAccounts[0]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Accounts</h1>

      {/* Account selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mockAccounts.map((acct) => (
          <button
            key={acct.id}
            onClick={() => setSelectedAccount(acct)}
            className={`text-left rounded-lg border p-4 transition-colors ${selectedAccount.id === acct.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
          >
            <p className="text-sm font-medium">{acct.name}</p>
            <p className="text-lg font-bold font-mono mt-1">{formatMoney(acct.balance, acct.currency)}</p>
            <p className="text-xs text-muted-foreground font-mono">{acct.number}</p>
          </button>
        ))}
      </div>

      {/* Statement controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-1.5 border rounded-md text-sm" />
        <span className="text-sm text-muted-foreground">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-1.5 border rounded-md text-sm" />
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-muted">
          <Download className="w-3.5 h-3.5" /> PDF
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-muted">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>

      {/* Transactions */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockTransactions.map((tx) => (
              <tr key={tx.id}>
                <td className="px-4 py-3 text-sm">{formatDate(tx.date)}</td>
                <td className="px-4 py-3 text-sm">{tx.description}</td>
                <td className={`px-4 py-3 text-sm text-right font-mono ${tx.type === 'CREDIT' ? 'text-green-600' : ''}`}>
                  {tx.type === 'CREDIT' ? '+' : '-'}{formatMoney(tx.amount, 'NGN')}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">{formatMoney(tx.balance, 'NGN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
