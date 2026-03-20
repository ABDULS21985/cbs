import { CheckCircle, Printer, Download, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import type { TransferResponse } from '../../api/paymentApi';

interface Props {
  transfer: TransferResponse;
  onNewTransfer: () => void;
}

export function TransferReceipt({ transfer, onNewTransfer }: Props) {
  return (
    <div id="receipt-print-area" className="max-w-lg mx-auto text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>

      <div>
        <h2 className="text-xl font-semibold">
          {transfer.status === 'SCHEDULED' ? 'Transfer Scheduled' :
           transfer.status === 'PENDING_APPROVAL' ? 'Transfer Submitted for Approval' :
           'Transfer Successful'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Reference: {transfer.transactionRef}</p>
      </div>

      <div className="rounded-lg border bg-card p-5 text-left space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">From</span><span className="font-mono">{transfer.fromAccount}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">To</span><span className="font-mono">{transfer.toAccount}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Beneficiary</span><span>{transfer.toAccountName}</span></div>
        {transfer.toBankName && <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span>{transfer.toBankName}</span></div>}
        <hr />
        <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-mono font-semibold">{formatMoney(transfer.amount, transfer.currency)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Fee + VAT</span><span className="font-mono">{formatMoney(transfer.fee + transfer.vat, transfer.currency)}</span></div>
        <div className="flex justify-between font-semibold"><span>Total Debit</span><span className="font-mono">{formatMoney(transfer.totalDebit, transfer.currency)}</span></div>
        <hr />
        <div className="flex justify-between"><span className="text-muted-foreground">Narration</span><span>{transfer.narration}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDateTime(transfer.createdAt)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{transfer.transactionRef}</span></div>
      </div>

      <div className="flex gap-2 justify-center">
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm hover:bg-muted"><Printer className="w-4 h-4" /> Print</button>
        <button onClick={() => { toast('Use browser Print dialog to save as PDF'); window.print(); }} className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm hover:bg-muted"><Download className="w-4 h-4" /> PDF</button>
        <button onClick={() => { const subject = encodeURIComponent(`Transfer Receipt - ${transfer.transactionRef}`); const body = encodeURIComponent(`Transfer Receipt\n\nReference: ${transfer.transactionRef}\nFrom: ${transfer.fromAccount}\nTo: ${transfer.toAccount} (${transfer.toAccountName})\nAmount: ${formatMoney(transfer.amount, transfer.currency)}\nTotal Debit: ${formatMoney(transfer.totalDebit, transfer.currency)}\nDate: ${formatDateTime(transfer.createdAt)}\nNarration: ${transfer.narration}`); window.location.href = `mailto:?subject=${subject}&body=${body}`; }} className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm hover:bg-muted"><Mail className="w-4 h-4" /> Email</button>
      </div>

      <button onClick={onNewTransfer} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
        Make Another Transfer <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
