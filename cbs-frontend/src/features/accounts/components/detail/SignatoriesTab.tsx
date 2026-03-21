import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2, Loader2, Users, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { apiGet, apiPost, apiDelete, apiPatch } from '@/lib/api';

interface Signatory {
  id: number;
  customerId: number;
  customerCifNumber?: string;
  customerDisplayName: string;
  signatoryType: string;
  signingRule?: string;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

interface SignatoriesTabProps {
  accountId: string;
}

const SIGNATORY_TYPES = ['PRIMARY', 'JOINT', 'MANDATE', 'AUTHORISED'] as const;
const SIGNING_RULES = ['ANY', 'ANY_ONE', 'ANY_TWO', 'ALL', 'SEQUENTIAL'] as const;

export function SignatoriesTab({ accountId }: SignatoriesTabProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [signatoryToRemove, setSignatoryToRemove] = useState<Signatory | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [selectedRule, setSelectedRule] = useState('');

  const [addForm, setAddForm] = useState({
    customerId: '',
    role: 'AUTHORISED' as string,
    signingRule: '',
  });

  const { data: signatories = [], isLoading } = useQuery<Signatory[]>({
    queryKey: ['accounts', accountId, 'signatories'],
    queryFn: () => apiGet<Signatory[]>(`/api/v1/accounts/${accountId}/signatories`),
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiPost(`/api/v1/accounts/${accountId}/signatories`, {
        customerId: Number(addForm.customerId),
        role: addForm.role,
        signingRule: addForm.signingRule || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'signatories'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', 'detail', accountId] });
      toast.success('Signatory added successfully');
      setShowAddForm(false);
      setAddForm({ customerId: '', role: 'AUTHORISED', signingRule: '' });
    },
    onError: () => toast.error('Failed to add signatory'),
  });

  const removeMutation = useMutation({
    mutationFn: ({ signatoryId, reason }: { signatoryId: number; reason: string }) =>
      apiDelete(`/api/v1/accounts/${accountId}/signatories/${signatoryId}?reason=${encodeURIComponent(reason)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'signatories'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', 'detail', accountId] });
      toast.success('Signatory removed successfully');
      setSignatoryToRemove(null);
      setRemoveReason('');
    },
    onError: () => toast.error('Failed to remove signatory'),
  });

  const updateRuleMutation = useMutation({
    mutationFn: (rule: string) =>
      apiPatch(`/api/v1/accounts/${accountId}/signing-rule`, { rule }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'signatories'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', 'detail', accountId] });
      toast.success('Signing rule updated');
      setShowRuleEditor(false);
    },
    onError: () => toast.error('Failed to update signing rule'),
  });

  const currentSigningRule = signatories.find((s) => s.signingRule)?.signingRule ?? 'ANY';
  const activeSignatories = signatories.filter((s) => s.isActive);

  const columns: ColumnDef<Signatory, unknown>[] = [
    {
      accessorKey: 'customerDisplayName',
      header: 'Name',
      cell: ({ getValue }) => (
        <span className="text-sm font-medium">{String(getValue() ?? 'Unknown')}</span>
      ),
    },
    {
      accessorKey: 'customerCifNumber',
      header: 'CIF',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">{String(getValue() ?? '—')}</span>
      ),
    },
    {
      accessorKey: 'signatoryType',
      header: 'Role',
      cell: ({ getValue }) => <StatusBadge status={String(getValue() ?? 'AUTHORISED')} />,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ getValue }) => (
        <StatusBadge status={getValue() ? 'ACTIVE' : 'INACTIVE'} dot />
      ),
    },
    {
      accessorKey: 'effectiveFrom',
      header: 'Effective From',
      cell: ({ getValue }) => {
        const v = getValue<string | undefined>();
        return v ? <span className="text-sm">{formatDate(v)}</span> : <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'effectiveTo',
      header: 'Effective To',
      cell: ({ getValue }) => {
        const v = getValue<string | undefined>();
        return v ? <span className="text-sm">{formatDate(v)}</span> : <span className="text-xs text-muted-foreground">Open-ended</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.isActive ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSignatoryToRemove(row.original);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 transition-colors border border-red-200 dark:border-red-700"
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
        ) : null,
    },
  ];

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="p-4 space-y-4">
      {/* Signing rule banner */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Signing Rule</p>
            <p className="text-xs text-muted-foreground">
              Current rule: <span className="font-semibold">{currentSigningRule}</span>
              {' · '}{activeSignatories.length} active signator{activeSignatories.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setSelectedRule(currentSigningRule); setShowRuleEditor(true); }}
          className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
        >
          Change Rule
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Add Signatory
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={signatories}
        isLoading={isLoading}
        emptyMessage="No signatories on this account"
        pageSize={10}
      />

      {/* Add Signatory Dialog */}
      {showAddForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddForm(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Add Signatory</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Add a new authorized signatory to this account.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Customer ID *</label>
                  <input
                    value={addForm.customerId}
                    onChange={(e) => setAddForm((p) => ({ ...p, customerId: e.target.value }))}
                    className={fc}
                    placeholder="Enter customer ID"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Signatory Role *</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}
                    className={fc}
                  >
                    {SIGNATORY_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Signing Rule (optional)</label>
                  <select
                    value={addForm.signingRule}
                    onChange={(e) => setAddForm((p) => ({ ...p, signingRule: e.target.value }))}
                    className={fc}
                  >
                    <option value="">Use account default</option>
                    {SIGNING_RULES.map((rule) => (
                      <option key={rule} value={rule}>{rule}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
                <button
                  onClick={() => addMutation.mutate()}
                  disabled={!addForm.customerId || addMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Signatory
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Remove Signatory Confirmation */}
      {signatoryToRemove && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Remove Signatory</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Remove <span className="font-medium">{signatoryToRemove.customerDisplayName}</span> ({signatoryToRemove.signatoryType}) from this account.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Reason for Removal *</label>
                <textarea
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  placeholder="Provide reason for removing this signatory..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setSignatoryToRemove(null); setRemoveReason(''); }}
                  disabled={removeMutation.isPending}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeMutation.mutate({ signatoryId: signatoryToRemove.id, reason: removeReason })}
                  disabled={removeMutation.isPending || !removeReason.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Remove Signatory
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Signing Rule Editor */}
      {showRuleEditor && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowRuleEditor(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Update Signing Rule</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Change how signatory authorization works for this account.
                </p>
              </div>
              <div className="space-y-2">
                {SIGNING_RULES.map((rule) => (
                  <label
                    key={rule}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRule === rule ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="signingRule"
                      value={rule}
                      checked={selectedRule === rule}
                      onChange={() => setSelectedRule(rule)}
                      className="accent-primary"
                    />
                    <div>
                      <p className="text-sm font-medium">{rule}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule === 'ANY' && 'Any single signatory can authorize'}
                        {rule === 'ANY_ONE' && 'Any one signatory can authorize'}
                        {rule === 'ANY_TWO' && 'Any two signatories must authorize together'}
                        {rule === 'ALL' && 'All signatories must authorize'}
                        {rule === 'SEQUENTIAL' && 'Signatories must authorize in sequence'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowRuleEditor(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
                <button
                  onClick={() => updateRuleMutation.mutate(selectedRule)}
                  disabled={selectedRule === currentSigningRule || updateRuleMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {updateRuleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Rule
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
