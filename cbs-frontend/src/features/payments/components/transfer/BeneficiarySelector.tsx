import { useState } from 'react';
import { Search, Plus, UserCheck } from 'lucide-react';
import type { Beneficiary } from '../../api/paymentApi';

interface Props {
  beneficiaries: Beneficiary[];
  onSelect: (b: Beneficiary) => void;
  onAddNew: () => void;
}

export function BeneficiarySelector({ beneficiaries, onSelect, onAddNew }: Props) {
  const [search, setSearch] = useState('');

  const filtered = beneficiaries.filter(
    (b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.accountNumber.includes(search)
  );

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-muted-foreground">Beneficiary</label>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saved beneficiaries..."
          className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
        />
      </div>

      {search && filtered.length > 0 && (
        <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
          {filtered.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { onSelect(b); setSearch(''); }}
              className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{b.accountNumber} · {b.bankName}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <button type="button" onClick={onAddNew} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
        <Plus className="w-3 h-3" /> Add New Beneficiary
      </button>
    </div>
  );
}
