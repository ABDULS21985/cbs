import { useState } from 'react';
import { Search } from 'lucide-react';
import type { AuditSearchParams } from '../../api/auditApi';

interface Props {
  onSearch: (params: AuditSearchParams) => void;
}

export function AuditSearchForm({ onSearch }: Props) {
  const [form, setForm] = useState<AuditSearchParams>({});
  const update = (field: keyof AuditSearchParams, value: string) => setForm((p) => ({ ...p, [field]: value || undefined }));

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Entity Type</label>
          <select value={form.entityType || ''} onChange={(e) => update('entityType', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
            <option value="">All</option>
            {['Customer', 'Account', 'Loan', 'Payment', 'Card', 'User', 'System'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Entity ID</label>
          <input value={form.entityId || ''} onChange={(e) => update('entityId', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm font-mono" placeholder="ID" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Action</label>
          <select value={form.action || ''} onChange={(e) => update('action', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
            <option value="">All</option>
            {['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'VIEW', 'EXPORT'].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">User</label>
          <input value={form.userId || ''} onChange={(e) => update('userId', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Staff name/ID" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Date From</label>
          <input type="date" value={form.dateFrom || ''} onChange={(e) => update('dateFrom', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Date To</label>
          <input type="date" value={form.dateTo || ''} onChange={(e) => update('dateTo', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">IP Address</label>
          <input value={form.ipAddress || ''} onChange={(e) => update('ipAddress', e.target.value)} className="px-3 py-2 border rounded-md text-sm font-mono" placeholder="192.168.x.x" />
        </div>
        <button onClick={() => onSearch(form)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 mt-auto">
          <Search className="w-4 h-4" /> Search
        </button>
      </div>
    </div>
  );
}
