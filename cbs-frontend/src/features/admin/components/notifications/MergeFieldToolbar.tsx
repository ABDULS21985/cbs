import { Tag } from 'lucide-react';

interface MergeFieldToolbarProps {
  onInsert: (field: string) => void;
}

const MERGE_FIELDS = [
  { group: 'Customer', fields: ['customerName', 'accountNumber', 'email', 'phone'] },
  { group: 'Transaction', fields: ['amount', 'date', 'reference', 'balance'] },
  { group: 'Bank', fields: ['branchName', 'bankName', 'supportPhone'] },
];

export function MergeFieldToolbar({ onInsert }: MergeFieldToolbarProps) {
  return (
    <div className="flex flex-wrap gap-1 p-2 rounded-md border bg-muted/30">
      <span className="flex items-center gap-1 text-xs text-muted-foreground mr-1"><Tag className="w-3 h-3" /> Fields:</span>
      {MERGE_FIELDS.map(group => (
        <span key={group.group} className="flex items-center gap-1">
          {group.fields.map(f => (
            <button key={f} type="button" onClick={() => onInsert(f)}
              className="px-2 py-0.5 rounded text-xs font-mono bg-background border hover:bg-primary/10 hover:text-primary transition-colors">
              {`{{${f}}}`}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-1" />
        </span>
      ))}
    </div>
  );
}
