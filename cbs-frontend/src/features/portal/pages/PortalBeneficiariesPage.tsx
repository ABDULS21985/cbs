import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { portalApi } from '../api/portalApi';

export function PortalBeneficiariesPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newBeneficiary, setNewBeneficiary] = useState({ accountNumber: '', bankCode: '', bankName: '', name: '' });

  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ['portal', 'beneficiaries'],
    queryFn: () => portalApi.getBeneficiaries(),
  });

  const addMutation = useMutation({
    mutationFn: () => portalApi.addBeneficiary(newBeneficiary),
    onSuccess: () => { toast.success('Beneficiary added'); queryClient.invalidateQueries({ queryKey: ['portal', 'beneficiaries'] }); setShowAdd(false); setNewBeneficiary({ accountNumber: '', bankCode: '', bankName: '', name: '' }); },
    onError: () => toast.error('Failed to add beneficiary'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => portalApi.removeBeneficiary(id),
    onSuccess: () => { toast.success('Beneficiary removed'); queryClient.invalidateQueries({ queryKey: ['portal', 'beneficiaries'] }); },
    onError: () => toast.error('Failed to remove beneficiary'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Beneficiaries</h1>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> Add New</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : beneficiaries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No saved beneficiaries</p>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {beneficiaries.map((ben) => (
            <div key={ben.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"><UserCheck className="w-4 h-4 text-primary" /></div>
                <div><p className="text-sm font-medium">{ben.name}</p><p className="text-xs text-muted-foreground font-mono">{ben.accountNumber} · {ben.bankName}</p></div>
              </div>
              <div className="flex gap-1">
                <button className="p-2 hover:bg-muted rounded-md"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => removeMutation.mutate(ben.id)} className="p-2 hover:bg-muted rounded-md text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            <h3 className="font-semibold">Add Beneficiary</h3>
            <input value={newBeneficiary.accountNumber} onChange={(e) => setNewBeneficiary({ ...newBeneficiary, accountNumber: e.target.value })} placeholder="Account number" className="w-full px-3 py-2 border rounded-md text-sm" />
            <input value={newBeneficiary.bankName} onChange={(e) => setNewBeneficiary({ ...newBeneficiary, bankName: e.target.value })} placeholder="Bank name" className="w-full px-3 py-2 border rounded-md text-sm" />
            <input value={newBeneficiary.name} onChange={(e) => setNewBeneficiary({ ...newBeneficiary, name: e.target.value })} placeholder="Account holder name" className="w-full px-3 py-2 border rounded-md text-sm" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !newBeneficiary.name} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">{addMutation.isPending ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
