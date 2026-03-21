import { useState, useEffect } from 'react';
import { User, Users, Globe, X, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';

export type RecipientMode = 'individual' | 'segment' | 'broadcast';

export interface RecipientSelection {
  mode: RecipientMode;
  customerIds?: number[];
  customerNames?: Record<number, string>;
  customerEmails?: Record<number, string>;
  customerPhones?: Record<number, string>;
  segmentCode?: string;
  segmentName?: string;
  estimatedCount?: number;
  isBroadcast?: boolean;
  recipientList?: { address: string; name?: string }[];
}

interface CustomerResult { id: number; displayName: string; email?: string; phone?: string }
interface SegmentResult { code: string; name: string; description?: string; customerCount?: number }

export function RecipientSelector({ value, onChange }: { value: RecipientSelection; onChange: (v: RecipientSelection) => void }) {
  const [mode, setMode] = useState<RecipientMode>(value.mode);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [segments, setSegments] = useState<SegmentResult[]>([]);
  const [segmentsLoaded, setSegmentsLoaded] = useState(false);
  const [broadcastConfirmed, setBroadcastConfirmed] = useState(false);

  // Load segments when segment mode is selected
  useEffect(() => {
    if (mode === 'segment' && !segmentsLoaded) {
      apiGet<SegmentResult[]>('/api/v1/customers/segments').then((data) => {
        setSegments(data ?? []);
        setSegmentsLoaded(true);
      });
    }
  }, [mode, segmentsLoaded]);

  // Debounced customer search
  useEffect(() => {
    if (mode !== 'individual' || search.length < 2) { setResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      apiGet<any[]>('/api/v1/customers', { search, page: 0, size: 10 })
        .then((data) => {
          setResults((data ?? []).map((c: any) => ({
            id: c.id ?? c.customerId,
            displayName: c.displayName ?? c.customerName ?? c.fullName ?? `Customer #${c.id}`,
            email: c.email,
            phone: c.phone,
          })));
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, mode]);

  const handleModeChange = (newMode: RecipientMode) => {
    setMode(newMode);
    setBroadcastConfirmed(false);
    onChange({ mode: newMode, customerIds: newMode === 'individual' ? value.customerIds ?? [] : undefined, customerNames: value.customerNames });
  };

  const addCustomer = (customer: CustomerResult) => {
    const ids = [...(value.customerIds ?? [])];
    const names = { ...(value.customerNames ?? {}) };
    const emails = { ...(value.customerEmails ?? {}) };
    const phones = { ...(value.customerPhones ?? {}) };
    if (!ids.includes(customer.id)) {
      ids.push(customer.id);
      names[customer.id] = customer.displayName;
      if (customer.email) emails[customer.id] = customer.email;
      if (customer.phone) phones[customer.id] = customer.phone;
    }
    onChange({ ...value, mode: 'individual', customerIds: ids, customerNames: names, customerEmails: emails, customerPhones: phones });
    setSearch('');
    setResults([]);
  };

  const removeCustomer = (id: number) => {
    const ids = (value.customerIds ?? []).filter((i) => i !== id);
    const names = { ...(value.customerNames ?? {}) };
    delete names[id];
    onChange({ ...value, customerIds: ids, customerNames: names });
  };

  const selectSegment = (seg: SegmentResult) => {
    onChange({ mode: 'segment', segmentCode: seg.code, segmentName: seg.name, estimatedCount: seg.customerCount });
  };

  const toggleBroadcast = (confirmed: boolean) => {
    setBroadcastConfirmed(confirmed);
    onChange({ mode: 'broadcast', isBroadcast: confirmed });
  };

  const recipientCount = mode === 'individual' ? (value.customerIds?.length ?? 0) : mode === 'segment' ? (value.estimatedCount ?? 0) : (broadcastConfirmed ? 'All' : 0);

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {([
          { id: 'individual' as const, label: 'Individual', icon: User },
          { id: 'segment' as const, label: 'Segment', icon: Users },
          { id: 'broadcast' as const, label: 'Broadcast', icon: Globe },
        ]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => handleModeChange(id)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
              mode === id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Individual mode */}
      {mode === 'individual' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers by name, ID, or email..."
              className="w-full pl-10 pr-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
          {results.length > 0 && (
            <div className="rounded-md border bg-card shadow-lg max-h-40 overflow-y-auto">
              {results.map((c) => (
                <button key={c.id} onClick={() => addCustomer(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between">
                  <span><span className="font-medium">{c.displayName}</span> <span className="text-muted-foreground text-xs">#{c.id}</span></span>
                  {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                </button>
              ))}
            </div>
          )}
          {(value.customerIds?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {value.customerIds!.map((id) => (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {value.customerNames?.[id] ?? `#${id}`}
                  <button onClick={() => removeCustomer(id)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Segment mode */}
      {mode === 'segment' && (
        <div className="space-y-3">
          {segments.length === 0 && segmentsLoaded ? (
            <p className="text-sm text-muted-foreground">No customer segments available.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {segments.map((seg) => (
                <button key={seg.code} onClick={() => selectSegment(seg)}
                  className={cn('text-left rounded-lg border p-3 transition-colors',
                    value.segmentCode === seg.code ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted')}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{seg.name}</span>
                    {seg.customerCount != null && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{seg.customerCount} customers</span>}
                  </div>
                  {seg.description && <p className="text-xs text-muted-foreground mt-0.5">{seg.description}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Broadcast mode */}
      {mode === 'broadcast' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/40 p-4 space-y-3">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">This will send to ALL active customers.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={broadcastConfirmed} onChange={(e) => toggleBroadcast(e.target.checked)}
              className="rounded border-amber-300" />
            I understand this is a broadcast message
          </label>
        </div>
      )}

      {/* Recipient count */}
      <p className="text-xs text-muted-foreground">
        Will send to <span className="font-medium text-foreground">{recipientCount}</span> recipient{recipientCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
