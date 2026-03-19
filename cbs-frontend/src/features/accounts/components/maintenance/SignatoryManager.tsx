import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2, UserPlus, Loader2, Users } from 'lucide-react';
import { accountMaintenanceApi, type Signatory } from '../../api/accountMaintenanceApi';

const SIGNING_RULES = [
  { value: 'ANY_ONE', label: 'Any One — any single signatory can authorise' },
  { value: 'ANY_TWO', label: 'Any Two — any two signatories must authorise' },
  { value: 'ALL', label: 'All — all signatories must authorise' },
];

const SIGNATORY_ROLES = [
  { value: 'PRIMARY', label: 'Primary' },
  { value: 'SECONDARY', label: 'Secondary' },
  { value: 'JOINT', label: 'Joint' },
  { value: 'AUTHORIZED', label: 'Authorised Signatory' },
];

interface SignatoryManagerProps {
  accountId: string;
  signatories: Signatory[];
  currentSigningRule: string;
  onSuccess: () => void;
}

export function SignatoryManager({ accountId, signatories: initialSignatories, currentSigningRule, onSuccess }: SignatoryManagerProps) {
  const [signatories, setSignatories] = useState<Signatory[]>(initialSignatories);
  const [signingRule, setSigningRule] = useState(currentSigningRule);
  const [addName, setAddName] = useState('');
  const [addCustomerId, setAddCustomerId] = useState('');
  const [addRole, setAddRole] = useState('SECONDARY');
  const [addReason, setAddReason] = useState('');
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const [removeTarget, setRemoveTarget] = useState<Signatory | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removeReasonError, setRemoveReasonError] = useState('');

  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingRemove, setSubmittingRemove] = useState(false);
  const [submittingRule, setSubmittingRule] = useState(false);

  const handleAddSignatory = async () => {
    const errs: Record<string, string> = {};
    if (!addCustomerId.trim()) errs.customerId = 'Customer ID is required';
    if (!addName.trim()) errs.name = 'Customer name is required';
    if (!addReason.trim()) errs.reason = 'Reason is required';
    if (Object.keys(errs).length > 0) { setAddErrors(errs); return; }
    setAddErrors({});
    setSubmittingAdd(true);
    try {
      await accountMaintenanceApi.addSignatory(accountId, {
        customerId: addCustomerId.trim(),
        role: addRole,
        signingRule,
      });
      const newSignatory: Signatory = {
        id: `sig-${Date.now()}`,
        customerId: addCustomerId.trim(),
        name: addName.trim(),
        role: addRole,
        addedAt: new Date().toISOString(),
      };
      setSignatories((prev) => [...prev, newSignatory]);
      setAddName('');
      setAddCustomerId('');
      setAddReason('');
      toast.success('Signatory added successfully');
      onSuccess();
    } catch {
      toast.error('Failed to add signatory');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    if (!removeReason.trim()) { setRemoveReasonError('Reason is required'); return; }
    setRemoveReasonError('');
    setSubmittingRemove(true);
    try {
      await accountMaintenanceApi.removeSignatory(accountId, removeTarget.id, removeReason);
      setSignatories((prev) => prev.filter((s) => s.id !== removeTarget.id));
      setRemoveTarget(null);
      setRemoveReason('');
      toast.success('Signatory removed successfully');
      onSuccess();
    } catch {
      toast.error('Failed to remove signatory');
    } finally {
      setSubmittingRemove(false);
    }
  };

  const handleUpdateSigningRule = async () => {
    if (signingRule === currentSigningRule) {
      toast.info('Signing rule is unchanged');
      return;
    }
    setSubmittingRule(true);
    try {
      await accountMaintenanceApi.updateSigningRule(accountId, signingRule);
      toast.success('Signing rule updated successfully');
      onSuccess();
    } catch {
      toast.error('Failed to update signing rule');
    } finally {
      setSubmittingRule(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current signatories table */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Current Signatories ({signatories.length})
        </h4>
        {signatories.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No signatories on this account.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Customer ID</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {signatories.map((sig) => (
                  <tr key={sig.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{sig.name}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{sig.customerId}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {sig.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setRemoveTarget(sig); setRemoveReason(''); setRemoveReasonError(''); }}
                        className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove signatory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add signatory */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Add Signatory
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Customer ID <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={addCustomerId}
              onChange={(e) => setAddCustomerId(e.target.value)}
              placeholder="e.g. cust-001"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {addErrors.customerId && <p className="text-xs text-red-500 mt-1">{addErrors.customerId}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Customer Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Full legal name"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {addErrors.name && <p className="text-xs text-red-500 mt-1">{addErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Role</label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SIGNATORY_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Reason <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={addReason}
              onChange={(e) => setAddReason(e.target.value)}
              placeholder="Reason for adding this signatory"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {addErrors.reason && <p className="text-xs text-red-500 mt-1">{addErrors.reason}</p>}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddSignatory}
            disabled={submittingAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submittingAdd && <Loader2 className="w-4 h-4 animate-spin" />}
            <UserPlus className="w-4 h-4" />
            Add Signatory
          </button>
        </div>
      </div>

      {/* Signing rule */}
      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="text-sm font-semibold">Signing Rule</h4>
        <div className="space-y-2">
          {SIGNING_RULES.map((rule) => (
            <label key={rule.value} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="radio"
                name="signingRule"
                value={rule.value}
                checked={signingRule === rule.value}
                onChange={() => setSigningRule(rule.value)}
                className="mt-0.5 accent-primary"
              />
              <div>
                <span className="text-sm font-medium">{rule.value.replace(/_/g, ' ')}</span>
                <p className="text-xs text-muted-foreground">{rule.label}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleUpdateSigningRule}
            disabled={submittingRule || signingRule === currentSigningRule}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submittingRule && <Loader2 className="w-4 h-4 animate-spin" />}
            Update Signing Rule
          </button>
        </div>
      </div>

      {/* Remove confirm dialog */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold">Remove Signatory</h3>
            <p className="text-sm text-muted-foreground">
              You are about to remove <strong>{removeTarget.name}</strong> ({removeTarget.role}) from this account's signatories.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1.5">Reason <span className="text-red-500">*</span></label>
              <textarea
                rows={3}
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder="Provide a reason for removing this signatory…"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              {removeReasonError && <p className="text-xs text-red-500 mt-1">{removeReasonError}</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setRemoveTarget(null); setRemoveReason(''); }}
                disabled={submittingRemove}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveConfirm}
                disabled={submittingRemove}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {submittingRemove && <Loader2 className="w-4 h-4 animate-spin" />}
                Remove Signatory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
