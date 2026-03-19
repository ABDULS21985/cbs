import { useState } from 'react';
import { X, Plus, Save, Link, Tag, ShieldCheck, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import type { DocumentFile, RetentionClass, DocumentFolder } from '../../api/documentApi';

interface MetadataPanelProps {
  document: DocumentFile;
  onSave: (updates: Partial<DocumentFile>) => void;
}

type EntityType = 'customer' | 'loan' | 'account';

const RETENTION_OPTIONS: { value: RetentionClass; label: string }[] = [
  { value: 'KYC', label: 'KYC (10 years)' },
  { value: 'TRANSACTION', label: 'Transaction (7 years)' },
  { value: 'LOAN', label: 'Loan (12 years)' },
  { value: 'INTERNAL', label: 'Internal (5 years)' },
  { value: 'REGULATORY', label: 'Regulatory (10 years)' },
  { value: 'CORRESPONDENCE', label: 'Correspondence (7 years)' },
];

const RETENTION_YEARS: Record<RetentionClass, number> = {
  KYC: 10,
  TRANSACTION: 7,
  LOAN: 12,
  INTERNAL: 5,
  REGULATORY: 10,
  CORRESPONDENCE: 7,
};

function computeRetentionUntil(uploadedAt: string, retentionClass: RetentionClass): string {
  const d = new Date(uploadedAt);
  d.setFullYear(d.getFullYear() + RETENTION_YEARS[retentionClass]);
  return d.toISOString().split('T')[0];
}

export function MetadataPanel({ document: doc, onSave }: MetadataPanelProps) {
  const [tags, setTags] = useState<string[]>(doc.tags);
  const [tagInput, setTagInput] = useState('');
  const [entityType, setEntityType] = useState<EntityType>((doc.entityType as EntityType) ?? 'customer');
  const [entityId, setEntityId] = useState(doc.entityId ?? '');
  const [retentionClass, setRetentionClass] = useState<RetentionClass>(doc.retentionClass);
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addTag() {
    const raw = tagInput.trim().toLowerCase();
    if (!raw) return;
    const newTags = raw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));
    if (newTags.length) setTags((prev) => [...prev, ...newTags]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function addCustomField() {
    if (!newFieldKey.trim()) return;
    setCustomFields((prev) => [...prev, { key: newFieldKey.trim(), value: newFieldValue.trim() }]);
    setNewFieldKey('');
    setNewFieldValue('');
  }

  function removeCustomField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      onSave({
        tags,
        entityType,
        entityId: entityId || undefined,
        retentionClass,
        retentionUntil: computeRetentionUntil(doc.uploadedAt, retentionClass),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const retentionUntil = computeRetentionUntil(doc.uploadedAt, retentionClass);

  return (
    <div className="space-y-6">
      {/* Tags */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          <Tag className="w-3.5 h-3.5" />
          Tags
        </label>
        <div className="flex flex-wrap items-center gap-1.5 p-2 border border-border rounded-lg bg-background min-h-[40px] focus-within:ring-2 focus-within:ring-primary/30">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-primary/60 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? 'Add tags...' : ''}
            className="flex-1 min-w-[100px] text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* Entity Link */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          <Link className="w-3.5 h-3.5" />
          Entity Link
        </label>

        {doc.entityId && doc.entityName && (
          <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400 capitalize">
              {doc.entityType}: {doc.entityName}
            </span>
            <span className="text-xs text-blue-500">({doc.entityId})</span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative">
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
              className="appearance-none pl-3 pr-7 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="customer">Customer</option>
              <option value="loan">Loan</option>
              <option value="account">Account</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          <input
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder={entityType === 'customer' ? 'CUS-000001' : entityType === 'loan' ? 'LN-20250001' : 'ACC-0001'}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 font-mono"
          />
        </div>
      </div>

      {/* Retention Classification */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Retention Classification
        </label>
        <div className="relative">
          <select
            value={retentionClass}
            onChange={(e) => setRetentionClass(e.target.value as RetentionClass)}
            className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {RETENTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Retain until:{' '}
          <span className="font-medium text-foreground">{formatDate(retentionUntil)}</span>
        </p>
      </div>

      {/* Custom Fields */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Custom Fields
        </label>

        {customFields.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {customFields.map((field, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-28 truncate">
                  {field.key}
                </span>
                <span className="flex-1 text-xs text-foreground truncate">{field.value}</span>
                <button
                  onClick={() => removeCustomField(i)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newFieldKey}
            onChange={(e) => setNewFieldKey(e.target.value)}
            placeholder="Field name"
            className="w-32 px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
          />
          <input
            type="text"
            value={newFieldValue}
            onChange={(e) => setNewFieldValue(e.target.value)}
            placeholder="Value"
            onKeyDown={(e) => e.key === 'Enter' && addCustomField()}
            className="flex-1 px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
          />
          <button
            onClick={addCustomField}
            disabled={!newFieldKey.trim()}
            className={cn(
              'p-1.5 rounded-lg border transition-colors',
              newFieldKey.trim()
                ? 'border-primary text-primary hover:bg-primary/5'
                : 'border-border text-muted-foreground cursor-not-allowed',
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
            saved
              ? 'bg-green-600 text-white'
              : saving
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Metadata'}
        </button>
      </div>
    </div>
  );
}
