import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, StatusBadge, TabsPage, DataTable, AuditTimeline } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cardApi } from '../api/cardApi';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { CardTransaction } from '../types/card';

const txnCols: ColumnDef<CardTransaction, any>[] = [
  { accessorKey: 'transactionDate', header: 'Date', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.transactionDate)}</span> },
  { accessorKey: 'merchantName', header: 'Merchant' },
  { accessorKey: 'mccDescription', header: 'MCC' },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount, row.original.currency)}</span> },
  { accessorKey: 'channel', header: 'Channel', cell: ({ row }) => <StatusBadge status={row.original.channel} /> },
  { accessorKey: 'responseCode', header: 'Response', cell: ({ row }) => (
    <span className={cn('font-mono text-xs font-medium', row.original.responseCode === '00' ? 'text-green-600' : 'text-red-600')}>
      {row.original.responseCode} — {row.original.responseDescription}
    </span>
  )},
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

export function CardDetailPage() {
  const { id } = useParams();
  const cardId = parseInt(id || '0');
  const { data: card } = useQuery({ queryKey: ['card', cardId], queryFn: () => cardApi.getCard(cardId), enabled: !!cardId });
  const { data: transactions = [] } = useQuery({ queryKey: ['card-transactions'], queryFn: () => cardApi.getTransactions() });

  const [controls, setControls] = useState(card?.controls ?? {
    posEnabled: false, atmEnabled: false, onlineEnabled: false,
    internationalEnabled: false, contactlessEnabled: false, recurringEnabled: false,
  });

  const toggleControl = (key: keyof typeof controls) => {
    setControls((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!card) {
    return <div className="page-container flex items-center justify-center h-64 text-muted-foreground">Loading card details…</div>;
  }

  const cardTxns = transactions.filter((t) => t.cardMasked === card.cardNumberMasked.slice(-8));

  return (
    <>
      <PageHeader title={`Card ${card.cardNumberMasked}`} subtitle={`${card.scheme} ${card.cardType} — ${card.customerName}`} backTo="/cards"
        actions={<div className="flex gap-2">
          {card.status === 'ACTIVE' && <button className="px-3 py-1.5 rounded-lg border text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">Block Card</button>}
          {card.status === 'PENDING_ACTIVATION' && <button className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">Activate</button>}
          <button className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted">Request Replacement</button>
        </div>}
      />
      <div className="page-container">
        {/* Card Visual */}
        <div className="flex gap-6 mb-6">
          <div className="w-80 h-48 rounded-2xl bg-gradient-to-br from-[#0B1A56] via-[#1E40AF] to-[#15308A] text-white p-6 flex flex-col justify-between shadow-xl">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold tracking-wider opacity-70">{card.scheme}</span>
              <span className="text-xs font-bold">BellBank</span>
            </div>
            <div className="font-mono text-lg tracking-[0.2em]">{card.cardNumberMasked}</div>
            <div className="flex justify-between items-end">
              <div><div className="text-[10px] opacity-60">CARD HOLDER</div><div className="text-sm font-medium">{card.nameOnCard}</div></div>
              <div><div className="text-[10px] opacity-60">VALID THRU</div><div className="text-sm font-mono">{card.expiryDate}</div></div>
            </div>
          </div>
          <div className="flex-1">
            <InfoGrid columns={3} items={[
              { label: 'Card Type', value: card.cardType },
              { label: 'Scheme', value: card.scheme },
              { label: 'Status', value: <StatusBadge status={card.status} dot /> },
              { label: 'Account', value: card.accountNumber, mono: true, copyable: true },
              { label: 'Issued', value: card.issuedDate, format: 'date' },
              { label: 'Delivery', value: card.deliveryMethod.replace(/_/g, ' ') },
            ]} />
          </div>
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'transactions', label: 'Transactions', content: (
            <div className="p-4"><DataTable columns={txnCols} data={cardTxns} enableGlobalFilter /></div>
          )},
          { id: 'controls', label: 'Controls', content: (
            <div className="p-6 max-w-lg space-y-4">
              <h3 className="text-sm font-semibold mb-4">Card Controls</h3>
              {([
                { key: 'posEnabled', label: 'POS Transactions' },
                { key: 'atmEnabled', label: 'ATM Withdrawals' },
                { key: 'onlineEnabled', label: 'Online / eCommerce' },
                { key: 'internationalEnabled', label: 'International' },
                { key: 'contactlessEnabled', label: 'Contactless' },
                { key: 'recurringEnabled', label: 'Recurring Payments' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">{label}</span>
                  <button onClick={() => toggleControl(key)} className={cn('relative w-11 h-6 rounded-full transition-colors', controls[key] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600')}>
                    <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', controls[key] ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                </div>
              ))}
            </div>
          )},
          { id: 'history', label: 'History', content: (
            <div className="p-6"><AuditTimeline events={[
              { id: '1', action: 'Card Issued', performedBy: 'System', performedAt: card.issuedDate + 'T10:00:00Z', details: `${card.scheme} ${card.cardType} card issued via ${card.deliveryMethod}` },
              { id: '2', action: 'Card Activated', performedBy: 'Branch Officer', performedAt: card.issuedDate + 'T14:00:00Z' },
            ]} /></div>
          )},
        ]} />
      </div>
    </>
  );
}
