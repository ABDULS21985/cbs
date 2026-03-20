import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { X, Wallet, Calendar, Receipt, DollarSign } from 'lucide-react';
import type { CustodyAccount } from '../../api/custodyApi';

interface CustodyAccountDetailProps {
  account: CustodyAccount;
  onClose: () => void;
}

export function CustodyAccountDetail({ account, onClose }: CustodyAccountDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-background border-l shadow-xl overflow-auto">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{account.code}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{account.customerName} — {account.accountType}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Account Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <StatusBadge status={account.status} dot />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Assets</p>
              <p className="text-sm font-bold tabular-nums">{formatMoney(account.totalAssets, account.baseCurrency)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Securities</p>
              <p className="text-sm font-bold tabular-nums">{account.securitiesCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Custodian</p>
              <p className="text-sm">{account.custodian}</p>
            </div>
          </div>

          {/* Holdings Grid */}
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Asset Holdings
            </p>
            {account.holdings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No holdings</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {account.holdings.map((h) => (
                  <div key={h.instrumentCode} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{h.instrumentCode}</span>
                      <span className="text-xs text-muted-foreground">{h.isin}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{h.instrumentName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs">Qty: <span className="tabular-nums font-medium">{h.quantity.toLocaleString()}</span></span>
                      <span className="text-sm tabular-nums font-bold">{formatMoney(h.marketValue, h.currency)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Last priced: {formatDate(h.lastPriced)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Corporate Actions */}
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Corporate Actions Pending
            </p>
            {account.corporateActions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pending corporate actions</p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Instrument</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Ex-Date</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {account.corporateActions.map((ca) => (
                      <tr key={ca.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium">{ca.instrumentCode}</td>
                        <td className="px-4 py-2.5">{ca.actionType}</td>
                        <td className="px-4 py-2.5 tabular-nums">{formatDate(ca.exDate)}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={ca.status} dot /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Income Received */}
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Income Received
            </p>
            {account.incomeReceived.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No income records</p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Instrument</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {account.incomeReceived.map((inc) => (
                      <tr key={inc.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium">{inc.instrumentCode}</td>
                        <td className="px-4 py-2.5">{inc.incomeType}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(inc.amount, inc.currency)}</td>
                        <td className="px-4 py-2.5 tabular-nums">{formatDate(inc.paymentDate)}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={inc.status} dot /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Fee Schedule */}
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Fee Schedule
            </p>
            {account.feeSchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No fee schedule configured</p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Fee Type</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Rate</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Frequency</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Last Charged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {account.feeSchedule.map((fee, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium">{fee.feeType}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fee.rate.toFixed(4)}%</td>
                        <td className="px-4 py-2.5">{fee.frequency}</td>
                        <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                          {fee.lastCharged ? formatDate(fee.lastCharged) : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
