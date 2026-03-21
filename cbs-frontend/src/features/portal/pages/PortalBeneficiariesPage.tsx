import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, UserCheck, Loader2, Search, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { portalApi, type PortalBeneficiary } from '../api/portalApi';

export function PortalBeneficiariesPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingBen, setEditingBen] = useState<PortalBeneficiary | null>(null);
  const [newBeneficiary, setNewBeneficiary] = useState({ accountNumber: '', bankCode: '', bankName: '', name: '' });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [nameEnquiryLoading, setNameEnquiryLoading] = useState(false);

  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ['portal', 'beneficiaries'],
    queryFn: () => portalApi.getBeneficiaries(),
  });

  const addMutation = useMutation({
    mutationFn: () => portalApi.addBeneficiary(newBeneficiary),
    onSuccess: () => { toast.success('Beneficiary added'); queryClient.invalidateQueries({ queryKey: ['portal', 'beneficiaries'] }); closeForm(); },
    onError: () => toast.error('Failed to add beneficiary'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => portalApi.removeBeneficiary(id),
    onSuccess: () => { toast.success('Beneficiary removed'); queryClient.invalidateQueries({ queryKey: ['portal', 'beneficiaries'] }); setConfirmDelete(null); },
    onError: () => toast.error('Failed to remove beneficiary'),
  });

  const closeForm = () => {
    setShowAdd(false);
    setEditingBen(null);
    setNewBeneficiary({ accountNumber: '', bankCode: '', bankName: '', name: '' });
  };

  const openEdit = (ben: PortalBeneficiary) => {
    setEditingBen(ben);
    setNewBeneficiary({ accountNumber: ben.accountNumber, bankCode: ben.bankCode, bankName: ben.bankName, name: ben.name });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (editingBen) {
      // Backend doesn't support PATCH for beneficiaries - remove old and add new
      try {
        await portalApi.removeBeneficiary(editingBen.id);
        await portalApi.addBeneficiary(newBeneficiary);
        queryClient.invalidateQueries({ queryKey: ['portal', 'beneficiaries'] });
        toast.success('Beneficiary updated');
        closeForm();
      } catch {
        toast.error('Failed to update beneficiary');
      }
    } else {
      addMutation.mutate();
    }
  };

  const handleNameEnquiry = async () => {
    if (newBeneficiary.accountNumber.length < 10) return;
    setNameEnquiryLoading(true);
    try {
      const result = await portalApi.validateTransfer(newBeneficiary.accountNumber, newBeneficiary.bankCode || '000');
      const data = result as Record<string, unknown>;
      if (data.found) {
        setNewBeneficiary(prev => ({ ...prev, name: String(data.accountName ?? '') }));
        toast.success(`Account: ${data.accountName}`);
      } else {
        toast.error('Account not found');
      }
    } catch {
      toast.error('Name enquiry failed');
    } finally {
      setNameEnquiryLoading(false);
    }
  };

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Beneficiaries</h1>
        <button onClick={() => { setEditingBen(null); setNewBeneficiary({ accountNumber: '', bankCode: '', bankName: '', name: '' }); setShowAdd(true); }}
          className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : beneficiaries.length === 0 ? (
        <div className="text-center py-12">
          <UserCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No saved beneficiaries</p>
          <p className="text-xs text-muted-foreground mt-1">Add frequently used recipients for faster transfers</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {beneficiaries.map((ben) => (
            <div key={ben.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{ben.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{ben.accountNumber} · {ben.bankName}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(ben)} className="p-2 hover:bg-muted rounded-md" title="Edit beneficiary">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {confirmDelete === ben.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => removeMutation.mutate(ben.id)} disabled={removeMutation.isPending}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                      {removeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="p-1 hover:bg-muted rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(ben.id)} className="p-2 hover:bg-muted rounded-md text-red-500" title="Remove beneficiary">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editingBen ? 'Edit Beneficiary' : 'Add Beneficiary'}</h3>
              <button onClick={closeForm} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            {/* Account Number with Name Enquiry */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Account Number</label>
              <div className="flex gap-2">
                <input value={newBeneficiary.accountNumber}
                  onChange={(e) => setNewBeneficiary({ ...newBeneficiary, accountNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="0012345678" maxLength={10} className={`flex-1 ${fc} font-mono`} />
                <button onClick={handleNameEnquiry} disabled={newBeneficiary.accountNumber.length < 10 || nameEnquiryLoading}
                  className="px-3 py-2 border rounded-md text-sm hover:bg-muted disabled:opacity-50" title="Verify account">
                  {nameEnquiryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Bank Name</label>
              <input value={newBeneficiary.bankName}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, bankName: e.target.value })}
                placeholder="Bank name" className={fc} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Account Holder Name</label>
              <div className="relative">
                <input value={newBeneficiary.name}
                  onChange={(e) => setNewBeneficiary({ ...newBeneficiary, name: e.target.value })}
                  placeholder="Account holder name" className={fc} />
                {newBeneficiary.name && (
                  <CheckCircle className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={closeForm} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
              <button onClick={handleSave}
                disabled={addMutation.isPending || !newBeneficiary.name || !newBeneficiary.accountNumber}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {addMutation.isPending ? 'Saving...' : editingBen ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
