import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Check, AlertTriangle } from 'lucide-react';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';

interface DocumentsStepProps {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface DocRequirement {
  name: string;
  required: boolean;
  category: string;
}

function getRequiredDocuments(productType: string): DocRequirement[] {
  const base: DocRequirement[] = [
    { name: 'Government-issued ID', required: true, category: 'Identity' },
    { name: 'Proof of Address', required: true, category: 'Identity' },
    { name: 'Bank Statements (3 months)', required: true, category: 'Financial' },
  ];

  if (productType === 'MORTGAGE') {
    base.push(
      { name: 'Property Valuation Report', required: true, category: 'Property' },
      { name: 'Title Deed / C of O', required: true, category: 'Property' },
      { name: 'Sale Agreement', required: true, category: 'Property' },
    );
  }

  if (productType === 'POS_LOAN') {
    base.push(
      { name: 'Vehicle Registration', required: true, category: 'Vehicle' },
      { name: 'Comprehensive Insurance', required: true, category: 'Vehicle' },
      { name: 'Proforma Invoice', required: true, category: 'Vehicle' },
    );
  }

  if (['SME_WORKING_CAPITAL', 'SME_ASSET'].includes(productType)) {
    base.push(
      { name: 'Audited Financial Statements', required: true, category: 'Business' },
      { name: 'Tax Clearance Certificate', required: true, category: 'Business' },
      { name: 'Business Registration (CAC)', required: true, category: 'Business' },
    );
  }

  return base;
}

export function DocumentsStep({ state, updateField, onNext, onBack }: DocumentsStepProps) {
  const productType = state.product?.productType ?? 'PERSONAL';
  const requiredDocs = useMemo(() => getRequiredDocuments(productType), [productType]);

  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(() => {
    const set = new Set<string>();
    state.documents.forEach((d) => { if (d.uploaded) set.add(d.name); });
    return set;
  });

  const toggleDoc = (name: string) => {
    setCheckedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      // Update state
      updateField('documents', requiredDocs.map((d) => ({
        name: d.name,
        required: d.required,
        uploaded: next.has(d.name),
      })));
      return next;
    });
  };

  const receivedCount = checkedDocs.size;
  const totalRequired = requiredDocs.filter((d) => d.required).length;
  const allRequiredReceived = requiredDocs.filter((d) => d.required).every((d) => checkedDocs.has(d.name));
  const completionPct = totalRequired > 0 ? (receivedCount / totalRequired) * 100 : 100;

  // Group by category
  const categories = useMemo(() => {
    const map = new Map<string, DocRequirement[]>();
    requiredDocs.forEach((d) => {
      const list = map.get(d.category) ?? [];
      list.push(d);
      map.set(d.category, list);
    });
    return Array.from(map.entries());
  }, [requiredDocs]);

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Document Checklist</h3>
        <p className="text-sm text-muted-foreground">Verify required documents have been received</p>
      </div>

      {/* Progress */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Document Completeness</p>
          <span className={cn('text-sm font-bold', allRequiredReceived ? 'text-green-600' : 'text-amber-600')}>
            {receivedCount}/{totalRequired} received
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', allRequiredReceived ? 'bg-green-500' : 'bg-amber-500')} style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      {/* Document List by Category */}
      {categories.map(([category, docs]) => (
        <div key={category}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{category}</p>
          <div className="space-y-1">
            {docs.map((doc) => {
              const isChecked = checkedDocs.has(doc.name);
              return (
                <div key={doc.name} className={cn('flex items-center justify-between rounded-lg border p-3 transition-colors', isChecked && 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800')}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleDoc(doc.name)}
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        isChecked ? 'bg-green-500 border-green-500 text-white' : 'border-muted-foreground/30',
                      )}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                    </button>
                    <div>
                      <span className={cn('text-sm', isChecked && 'line-through text-muted-foreground')}>{doc.name}</span>
                      {doc.required && !isChecked && <span className="text-red-500 text-xs ml-1">*</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isChecked ? 'Received' : 'Awaiting document'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Warning if incomplete */}
      {!allRequiredReceived && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Not all required documents have been received. You may continue, but the application may be flagged for incomplete documentation.
          </p>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        <button onClick={onNext} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          {allRequiredReceived ? 'Continue' : 'Continue with Warning'}
        </button>
      </div>
    </div>
  );
}
