import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Upload, Download, Pencil, Check, X, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared';
import { parameterApi } from '../../api/parameterApi';
import type { SystemParameter } from '../../api/parameterApi';

const CATEGORIES = ['ALL', 'GENDER', 'MARITAL_STATUS', 'ID_TYPE', 'OCCUPATION', 'NEXT_OF_KIN_RELATIONSHIP', 'ACCOUNT_CLOSURE_REASON'];

interface InlineEditState {
  id: number;
  code: string;
  description: string;
}

interface NewCodeState {
  code: string;
  description: string;
  category: string;
}

export function LookupCodeManager() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [editState, setEditState] = useState<InlineEditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemParameter | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState<NewCodeState>({ code: '', description: '', category: 'GENDER' });

  const queryClient = useQueryClient();

  const { data: codes = [], isLoading, isError } = useQuery({
    queryKey: ['lookup-codes', selectedCategory],
    queryFn: () =>
      parameterApi.getLookupCodes({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ code: string; description: string; status: string }> }) =>
      parameterApi.updateLookupCode(id, data),
    onSuccess: () => {
      toast.success('Lookup code updated');
      queryClient.invalidateQueries({ queryKey: ['lookup-codes'] });
      setEditState(null);
    },
    onError: () => toast.error('Failed to update lookup code'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { code: string; description: string; category: string }) =>
      parameterApi.createLookupCode(data),
    onSuccess: () => {
      toast.success('Lookup code created');
      queryClient.invalidateQueries({ queryKey: ['lookup-codes'] });
      setShowAddForm(false);
      setNewCode({ code: '', description: '', category: 'GENDER' });
    },
    onError: () => toast.error('Failed to create lookup code'),
  });

  const handleSaveEdit = () => {
    if (!editState) return;
    updateMutation.mutate({
      id: editState.id,
      data: { code: editState.code, description: editState.description },
    });
  };

  const handleToggleStatus = (lc: SystemParameter) => {
    updateMutation.mutate({
      id: lc.id,
      data: { status: lc.isActive ? 'INACTIVE' : 'ACTIVE' },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    updateMutation.mutate({ id: deleteTarget.id, data: { status: 'INACTIVE' } });
    setDeleteTarget(null);
  };

  const handleCreate = () => {
    if (!newCode.code.trim() || !newCode.description.trim()) {
      toast.error('Code and description are required');
      return;
    }
    createMutation.mutate({
      code: newCode.code.trim().toUpperCase(),
      description: newCode.description.trim(),
      category: newCode.category,
    });
  };

  const handleExport = () => {
    const headers = 'id,key,category,value,description\n';
    const rows = codes
      .map((c) => `${c.id},"${c.paramKey}","${c.paramCategory}","${c.paramValue}","${c.description ?? ''}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lookup-codes-${selectedCategory.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Export downloaded');
  };

  return (
    <div className="space-y-4">
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Lookup codes could not be loaded from the backend.
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {cat === 'ALL' ? 'All' : cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Code
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h4 className="text-sm font-semibold">New Lookup Code</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide">Code</label>
              <input
                type="text"
                value={newCode.code}
                onChange={(e) => setNewCode((n) => ({ ...n, code: e.target.value }))}
                placeholder="e.g. GEN_NONBINARY"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide">Description</label>
              <input
                type="text"
                value={newCode.description}
                onChange={(e) => setNewCode((n) => ({ ...n, description: e.target.value }))}
                placeholder="Human-readable label"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide">Category</label>
              <select
                value={newCode.category}
                onChange={(e) => setNewCode((n) => ({ ...n, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading lookup codes…</div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No codes found for this category.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Label</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {codes.map((lc) => {
                  const isEditing = editState?.id === lc.id;
                  return (
                    <tr key={lc.id} className={cn('transition-colors', isEditing ? 'bg-primary/5' : 'hover:bg-muted/20')}>
                      <td className="px-4 py-2.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editState.code}
                            onChange={(e) => setEditState((s) => s ? { ...s, code: e.target.value } : s)}
                            className="px-2 py-1 rounded border bg-background text-sm font-mono w-40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        ) : (
                          <code className="text-xs font-mono font-medium">{lc.paramKey}</code>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editState.description}
                            onChange={(e) => setEditState((s) => s ? { ...s, description: e.target.value } : s)}
                            className="px-2 py-1 rounded border bg-background text-sm w-52 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        ) : (
                          <span>{lc.description ?? lc.paramValue}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">{lc.paramCategory.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                            lc.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', lc.isActive ? 'bg-green-500' : 'bg-gray-400')} />
                          {lc.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                disabled={updateMutation.isPending}
                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditState(null)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  setEditState({
                                    id: lc.id,
                                    code: lc.paramKey,
                                    description: lc.description ?? lc.paramValue,
                                  })
                                }
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(lc)}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors',
                                  lc.isActive
                                    ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                    : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20',
                                )}
                                title={lc.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {lc.isActive ? (
                                  <ToggleRight className="w-4 h-4" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteTarget(lc)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Deactivate Lookup Code"
        description={`Are you sure you want to deactivate "${deleteTarget?.paramKey}"? This will not delete the record — other records may still reference it.`}
        confirmLabel="Deactivate"
        variant="destructive"
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
