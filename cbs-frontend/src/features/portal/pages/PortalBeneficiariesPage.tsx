import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Edit2, Loader2, Plus, Search, Trash2, UserCheck, X } from 'lucide-react';

import { toast } from 'sonner';

import { PortalPageHero } from '../components/PortalPageHero';
import { portalApi, type PortalBeneficiary } from '../api/portalApi';

export function PortalBeneficiariesPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingBen, setEditingBen] = useState<PortalBeneficiary | null>(null);
  const [newBeneficiary, setNewBeneficiary] = useState({
    accountNumber: '',
    bankCode: '',
    bankName: '',
    name: '',
  });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [nameEnquiryLoading, setNameEnquiryLoading] = useState(false);

  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ['portal', 'beneficiaries'],
    queryFn: () => portalApi.getBeneficiaries(),
  });

  const addMutation = useMutation({
    mutationFn: () => portalApi.addBeneficiary(newBeneficiary),
    onSuccess: () => {
      toast.success('Beneficiary added');
      queryClient.invalidateQueries({ queryKey: ['portal', 'beneficiaries'] });
      closeForm();
    },
    onError: () => toast.error('Failed to add beneficiary'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => portalApi.removeBeneficiary(id),
    onSuccess: () => {
      toast.success('Beneficiary removed');
      queryClient.invalidateQueries({ queryKey: ['portal', 'beneficiaries'] });
      setConfirmDelete(null);
    },
    onError: () => toast.error('Failed to remove beneficiary'),
  });

  const closeForm = () => {
    setShowAdd(false);
    setEditingBen(null);
    setNewBeneficiary({ accountNumber: '', bankCode: '', bankName: '', name: '' });
  };

  const openEdit = (beneficiary: PortalBeneficiary) => {
    setEditingBen(beneficiary);
    setNewBeneficiary({
      accountNumber: beneficiary.accountNumber,
      bankCode: beneficiary.bankCode,
      bankName: beneficiary.bankName,
      name: beneficiary.name,
    });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (editingBen) {
      try {
        await portalApi.removeBeneficiary(editingBen.id);
        await portalApi.addBeneficiary(newBeneficiary);
        queryClient.invalidateQueries({ queryKey: ['portal', 'beneficiaries'] });
        toast.success('Beneficiary updated');
        closeForm();
      } catch {
        toast.error('Failed to update beneficiary');
      }

      return;
    }

    addMutation.mutate();
  };

  const handleNameEnquiry = async () => {
    if (newBeneficiary.accountNumber.length < 10) {
      return;
    }

    setNameEnquiryLoading(true);

    try {
      const result = await portalApi.validateTransfer(newBeneficiary.accountNumber, newBeneficiary.bankCode || '000');
      const data = result as Record<string, unknown>;

      if (data.found) {
        setNewBeneficiary((current) => ({ ...current, name: String(data.accountName ?? '') }));
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

  return (
    <div className="portal-page-shell">
      <PortalPageHero
        icon={UserCheck}
        eyebrow="Portal Transfers"
        title="Beneficiaries"
        description="Maintain your trusted recipients so repeat transfers can start with a validated beneficiary list."
        chips={[
          beneficiaries.length > 0 ? 'Saved recipients' : 'No saved recipients yet',
          editingBen ? `Editing ${editingBen.name}` : 'Ready for quick add',
        ]}
        metrics={[
          { label: 'Beneficiaries', value: String(beneficiaries.length || 0) },
          { label: 'Pending delete', value: confirmDelete ? '1' : '0' },
          { label: 'Mode', value: showAdd ? 'Form open' : 'List view' },
        ]}
        actions={
          <button
            onClick={() => {
              setEditingBen(null);
              setNewBeneficiary({ accountNumber: '', bankCode: '', bankName: '', name: '' });
              setShowAdd(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add New
          </button>
        }
      />

      <section className="portal-panel p-5">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : beneficiaries.length === 0 ? (
          <div className="portal-empty-state">
            <UserCheck className="h-10 w-10 text-muted-foreground/35" />
            <div>
              <p className="text-sm font-medium text-foreground">No saved beneficiaries</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add frequently used recipients for faster transfers.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {beneficiaries.map((beneficiary) => (
              <div key={beneficiary.id} className="portal-panel portal-panel-muted p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <UserCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{beneficiary.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {beneficiary.accountNumber} · {beneficiary.bankName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(beneficiary)} className="portal-action-button px-3 py-2" title="Edit beneficiary">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {confirmDelete === beneficiary.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeMutation.mutate(beneficiary.id)}
                          disabled={removeMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {removeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          Confirm
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="portal-action-button px-3 py-2">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(beneficiary.id)}
                        className="portal-action-button px-3 py-2 text-red-600"
                        title="Remove beneficiary"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="portal-modal-shell space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{editingBen ? 'Edit Beneficiary' : 'Add Beneficiary'}</h3>
              <button onClick={closeForm} className="portal-action-button px-3 py-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Account Number</label>
              <div className="flex gap-2">
                <input
                  value={newBeneficiary.accountNumber}
                  onChange={(event) =>
                    setNewBeneficiary({ ...newBeneficiary, accountNumber: event.target.value.replace(/\D/g, '') })
                  }
                  placeholder="0012345678"
                  maxLength={10}
                  className="portal-inline-input flex-1 font-mono"
                />
                <button
                  onClick={handleNameEnquiry}
                  disabled={newBeneficiary.accountNumber.length < 10 || nameEnquiryLoading}
                  className="portal-action-button disabled:cursor-not-allowed disabled:opacity-50"
                  title="Verify account"
                  aria-label="Verify beneficiary account"
                >
                  {nameEnquiryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Bank Name</label>
              <input
                value={newBeneficiary.bankName}
                onChange={(event) => setNewBeneficiary({ ...newBeneficiary, bankName: event.target.value })}
                placeholder="Bank name"
                className="portal-inline-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Account Holder Name</label>
              <div className="relative">
                <input
                  value={newBeneficiary.name}
                  onChange={(event) => setNewBeneficiary({ ...newBeneficiary, name: event.target.value })}
                  placeholder="Account holder name"
                  className="portal-inline-input"
                />
                {newBeneficiary.name ? (
                  <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                ) : null}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={closeForm} className="portal-action-button">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={addMutation.isPending || !newBeneficiary.name || !newBeneficiary.accountNumber}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingBen ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
