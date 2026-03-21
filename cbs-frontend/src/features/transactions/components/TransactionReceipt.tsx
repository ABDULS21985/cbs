import { formatMoney, formatDateTime, formatDate } from '@/lib/formatters';
import type { Transaction } from '../api/transactionApi';

interface TransactionReceiptProps {
  transaction: Transaction;
}

export function TransactionReceipt({ transaction }: TransactionReceiptProps) {
  return (
    <>
      <style>{`
        @media print {
          body > *:not(#txn-receipt-root) { display: none !important; }
          #txn-receipt-root { display: block !important; }
          .receipt-container { box-shadow: none !important; border: none !important; }
        }
        #txn-receipt-root { display: none; }
      `}</style>

      <div id="txn-receipt-root">
        <div
          className="receipt-container"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            maxWidth: '420px',
            margin: '0 auto',
            padding: '32px 24px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            backgroundColor: '#fff',
            color: '#111',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                backgroundColor: '#1d4ed8',
                color: '#fff',
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              CBS
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              CBS BANK
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
              Transaction Receipt
            </div>
          </div>

          <div style={{ borderTop: '2px dashed #d1d5db', marginBottom: '16px' }} />

          {/* Reference & Status */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Transaction Reference</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.08em' }}>
              {transaction.reference}
            </div>
            <div
              style={{
                display: 'inline-block',
                marginTop: '6px',
                padding: '2px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor:
                  transaction.status === 'COMPLETED'
                    ? '#dcfce7'
                    : transaction.status === 'PENDING'
                    ? '#fef9c3'
                    : transaction.status === 'FAILED'
                    ? '#fee2e2'
                    : '#f3f4f6',
                color:
                  transaction.status === 'COMPLETED'
                    ? '#15803d'
                    : transaction.status === 'PENDING'
                    ? '#a16207'
                    : transaction.status === 'FAILED'
                    ? '#dc2626'
                    : '#374151',
              }}
            >
              {transaction.status}
            </div>
          </div>

          {/* Amount */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Amount</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
              {formatMoney(transaction.debitAmount ?? transaction.creditAmount ?? 0)}
            </div>
            {transaction.fee !== undefined && transaction.fee > 0 && (
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                Fee: {formatMoney(transaction.fee)}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px dashed #d1d5db', marginBottom: '16px' }} />

          {/* Details */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <tbody>
              <ReceiptRow label="Type" value={transaction.type} />
              <ReceiptRow label="Channel" value={transaction.channel} />
              <ReceiptRow label="Date & Time" value={formatDateTime(transaction.dateTime)} />
              <ReceiptRow label="Value Date" value={formatDate(transaction.valueDate)} />
              <ReceiptRow label="Posting Date" value={formatDate(transaction.postingDate)} />
              {transaction.fromAccount && (
                <ReceiptRow
                  label="From Account"
                  value={`${transaction.fromAccount}${transaction.fromAccountName ? '\n' + transaction.fromAccountName : ''}`}
                />
              )}
              {transaction.toAccount && (
                <ReceiptRow
                  label="To Account"
                  value={`${transaction.toAccount}${transaction.toAccountName ? '\n' + transaction.toAccountName : ''}`}
                />
              )}
              <ReceiptRow label="Narration" value={transaction.narration} />
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #d1d5db', marginTop: '16px', marginBottom: '16px' }} />

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                background: 'repeating-linear-gradient(90deg, #111 0px, #111 2px, #fff 2px, #fff 5px)',
                width: '200px',
                height: '40px',
                marginBottom: '6px',
              }}
            />
            <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.15em' }}>
              {String(transaction.id).toUpperCase()}
            </div>
          </div>

          <div style={{ borderTop: '2px dashed #d1d5db', marginTop: '16px' }} />

          <div style={{ textAlign: 'center', fontSize: '10px', color: '#9ca3af', marginTop: '12px' }}>
            <div>This is a computer-generated receipt and requires no signature.</div>
            <div style={{ marginTop: '4px' }}>
              Printed on {new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
            <div style={{ marginTop: '4px' }}>
              For enquiries call: 0800-222-0001 or visit any branch.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: '4px 0', color: '#6b7280', width: '40%', verticalAlign: 'top' }}>{label}</td>
      <td style={{ padding: '4px 0', fontWeight: '500', whiteSpace: 'pre-line', textAlign: 'right' }}>{value}</td>
    </tr>
  );
}
