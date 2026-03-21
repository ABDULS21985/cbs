import { useState } from 'react';
import { Search } from 'lucide-react';
import type { AuditSearchParams } from '../../api/auditApi';

interface Props {
  onSearch: (params: AuditSearchParams) => void;
}

export function AuditSearchForm({ onSearch }: Props) {
  const [form, setForm] = useState<AuditSearchParams>({});
  const update = (field: keyof AuditSearchParams, value: string) =>
    setForm((p) => ({ ...p, [field]: value || undefined }));

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Entity Type</label>
          <select
            value={form.entityType || ''}
            onChange={(e) => update('entityType', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All</option>
            {['Customer', 'Account', 'Loan', 'Payment', 'Card', 'User', 'System'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Action</label>
          <select
            value={form.action || ''}
            onChange={(e) => update('action', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All</option>
            {['CREATE', 'UPDATE', 'DELETE', 'READ', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT'].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Performed By</label>
          <input
            value={form.performedBy || ''}
            onChange={(e) => update('performedBy', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Staff name or ID"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Event Type</label>
          <input
            value={form.eventType || ''}
            onChange={(e) => update('eventType', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="e.g. Account, Loan"
          />
        </div>
      </div>
      <div className="mt-3">
        <button
          onClick={() => onSearch(form)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
        >
          <Search className="w-4 h-4" /> Search
        </button>
      </div>
    </div>
  );
}
