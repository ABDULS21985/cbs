import { useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2, Search } from 'lucide-react';
import { useAddRelationship } from '../hooks/useCustomers';
import { customerApi } from '../api/customerApi';
import type { AddRelationshipPayload, RelationshipType } from '../types/customer';
import { useDebounce } from '@/hooks/useDebounce';

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'NEXT_OF_KIN', label: 'Next of Kin' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'PARENT_COMPANY', label: 'Parent Company' },
  { value: 'SUBSIDIARY', label: 'Subsidiary' },
  { value: 'GUARANTOR', label: 'Guarantor' },
  { value: 'BENEFICIAL_OWNER', label: 'Beneficial Owner' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'SIGNATORY', label: 'Signatory' },
  { value: 'OTHER', label: 'Other' },
];

interface AddRelationshipDialogProps {
  customerId: number;
  onClose: () => void;
}

export function AddRelationshipDialog({ customerId, onClose }: AddRelationshipDialogProps) {
  const addRelationship = useAddRelationship();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; customerNumber: string; fullName: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; customerNumber: string; fullName: string } | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [form, setForm] = useState<Omit<AddRelationshipPayload, 'relatedCustomerId'>>({
    relationshipType: 'NEXT_OF_KIN',
    ownershipPercentage: undefined,
    notes: '',
    effectiveFrom: '',
    effectiveTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSearch = async (query: string) => {
    setSearchTerm(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const result = await customerApi.list({ search: query, size: 10, page: 0 });
      setSearchResults(result.items.filter((c) => c.id !== customerId).map((c) => ({
        id: c.id,
        customerNumber: c.customerNumber,
        fullName: c.fullName,
      })));
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectCustomer = (c: { id: number; customerNumber: string; fullName: string }) => {
    setSelectedCustomer(c);
    setSearchTerm('');
    setSearchResults([]);
    if (errors.relatedCustomerId) setErrors((prev) => { const next = { ...prev }; delete next.relatedCustomerId; return next; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedCustomer) errs.relatedCustomerId = 'Please select a related customer';
    if (form.ownershipPercentage != null && (form.ownershipPercentage < 0 || form.ownershipPercentage > 100)) {
      errs.ownershipPercentage = 'Must be between 0 and 100';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !selectedCustomer) return;
    try {
      await addRelationship.mutateAsync({
        customerId,
        data: {
          ...form,
          relatedCustomerId: selectedCustomer.id,
          ownershipPercentage: form.ownershipPercentage || undefined,
          effectiveFrom: form.effectiveFrom || undefined,
          effectiveTo: form.effectiveTo || undefined,
        },
      });
      toast.success('Relationship added');
      onClose();
    } catch {
      toast.error('Failed to add relationship');
    }
  };

  const showOwnership = ['BENEFICIAL_OWNER', 'DIRECTOR', 'PARENT_COMPANY', 'SUBSIDIARY'].includes(form.relationshipType);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Add Relationship</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-3">
            {/* Customer Search */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Related Customer *</label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{selectedCustomer.fullName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{selectedCustomer.customerNumber}</p>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-1 rounded hover:bg-muted">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    className="w-full input text-sm pl-8"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by name, CIF, or phone..."
                  />
                  {(searchResults.length > 0 || isSearching) && (
                    <div className="absolute z-10 w-full mt-1 border rounded-lg bg-card shadow-lg max-h-48 overflow-auto">
                      {isSearching && <p className="text-xs text-muted-foreground p-3">Searching...</p>}
                      {searchResults.map((c) => (
                        <button key={c.id} onClick={() => selectCustomer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-muted transition-colors">
                          <p className="text-sm font-medium">{c.fullName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{c.customerNumber}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {errors.relatedCustomerId && <p className="text-xs text-red-600 mt-0.5">{errors.relatedCustomerId}</p>}
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Relationship Type *</label>
              <select className="w-full input text-sm" value={form.relationshipType}
                onChange={(e) => setForm((prev) => ({ ...prev, relationshipType: e.target.value as RelationshipType }))}>
                {RELATIONSHIP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {showOwnership && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Ownership %</label>
                <input type="number" min={0} max={100} step={0.01} className="w-full input text-sm"
                  value={form.ownershipPercentage ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, ownershipPercentage: e.target.value ? Number(e.target.value) : undefined }))} />
                {errors.ownershipPercentage && <p className="text-xs text-red-600 mt-0.5">{errors.ownershipPercentage}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Effective From</label>
                <input type="date" className="w-full input text-sm" value={form.effectiveFrom}
                  onChange={(e) => setForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Effective To</label>
                <input type="date" className="w-full input text-sm" value={form.effectiveTo}
                  onChange={(e) => setForm((prev) => ({ ...prev, effectiveTo: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <textarea className="w-full input text-sm min-h-[60px] resize-y" value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Additional details..." />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={addRelationship.isPending} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button onClick={handleSubmit} disabled={addRelationship.isPending} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {addRelationship.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add Relationship
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
