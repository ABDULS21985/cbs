import { useState } from 'react';
import { Search } from 'lucide-react';

interface RecipientSearchProps {
  onSelect: (recipient: { customerId?: number; name: string; address: string }) => void;
}

export function RecipientSearch({ onSelect }: RecipientSearchProps) {
  const [mode, setMode] = useState<'search' | 'manual'>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualName, setManualName] = useState('');

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('manual')}
          className={`text-xs px-2 py-1 rounded ${mode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          Manual
        </button>
        <button type="button" onClick={() => setMode('search')}
          className={`text-xs px-2 py-1 rounded ${mode === 'search' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          Search Customer
        </button>
      </div>

      {mode === 'search' ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name or ID…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Type customer name or ID to search</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <input type="text" value={manualName}
              onChange={(e) => { setManualName(e.target.value); onSelect({ name: e.target.value, address: manualAddress }); }}
              placeholder="Recipient name"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email / Phone</label>
            <input type="text" value={manualAddress}
              onChange={(e) => { setManualAddress(e.target.value); onSelect({ name: manualName, address: e.target.value }); }}
              placeholder="email@example.com or +234..."
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>
      )}
    </div>
  );
}
