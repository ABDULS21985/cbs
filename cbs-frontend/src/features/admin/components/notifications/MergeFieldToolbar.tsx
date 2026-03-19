import { Tag } from 'lucide-react';

interface MergeFieldToolbarProps {
  onInsert: (field: string) => void;
}

const FIELD_GROUPS = [
  {
    label: 'Customer',
    fields: [
      { key: '{{customerName}}', label: 'Customer Name' },
      { key: '{{accountNumber}}', label: 'Account No.' },
      { key: '{{email}}', label: 'Email' },
    ],
  },
  {
    label: 'Transaction',
    fields: [
      { key: '{{amount}}', label: 'Amount' },
      { key: '{{currency}}', label: 'Currency' },
      { key: '{{transactionRef}}', label: 'Txn Ref' },
      { key: '{{transactionDate}}', label: 'Txn Date' },
      { key: '{{balance}}', label: 'Balance' },
      { key: '{{narration}}', label: 'Narration' },
    ],
  },
  {
    label: 'Bank',
    fields: [
      { key: '{{branchName}}', label: 'Branch' },
      { key: '{{supportPhone}}', label: 'Support Phone' },
      { key: '{{bankName}}', label: 'Bank Name' },
    ],
  },
];

export function MergeFieldToolbar({ onInsert }: MergeFieldToolbarProps) {
  return (
    <div className="border border-border rounded-md bg-muted/20 p-2 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Tag className="w-3.5 h-3.5" />
        <span>Merge Fields</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {FIELD_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 px-0.5">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-1">
              {group.fields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => onInsert(field.key)}
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
                  title={`Insert ${field.key}`}
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
