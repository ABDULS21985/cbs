const MERGE_FIELDS = [
  { key: 'customerName', label: 'Customer Name', desc: "Customer's full name" },
  { key: 'accountNumber', label: 'Account Number', desc: 'Account number' },
  { key: 'amount', label: 'Amount', desc: 'Monetary amount (formatted)' },
  { key: 'date', label: 'Date', desc: 'Current/relevant date' },
  { key: 'branchName', label: 'Branch Name', desc: 'Branch name' },
  { key: 'transactionRef', label: 'Transaction Ref', desc: 'Transaction reference' },
  { key: 'otp', label: 'OTP', desc: 'One-time password' },
  { key: 'productName', label: 'Product Name', desc: 'Product name' },
  { key: 'loanId', label: 'Loan ID', desc: 'Loan reference' },
  { key: 'cardNumber', label: 'Card Number', desc: 'Masked card number' },
];

interface MergeFieldToolbarProps {
  onInsert: (field: string) => void;
}

export function MergeFieldToolbar({ onInsert }: MergeFieldToolbarProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Merge Fields</label>
      <div className="flex flex-wrap gap-1.5">
        {MERGE_FIELDS.map((field) => (
          <button
            key={field.key}
            type="button"
            onClick={() => onInsert(`{{${field.key}}}`)}
            title={field.desc}
            className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono font-medium hover:bg-primary/20 transition-colors cursor-pointer"
          >
            {`{{${field.key}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

export { MERGE_FIELDS };
