import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { parameterApi } from '../../api/parameterApi';
import { RateTierEditor } from './RateTierEditor';
import type { SystemParameter, RateTier } from '../../api/parameterApi';

interface RateTableEditorProps {
  rateTables: SystemParameter[];
}

interface NewRateTableForm {
  name: string;
  type: string;
  effectiveDate: string;
}

function parseTiers(param: SystemParameter): RateTier[] {
  try {
    const parsed = JSON.parse(param.paramValue);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function RateTableEditor({ rateTables }: RateTableEditorProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editedTiers, setEditedTiers] = useState<Record<number, RateTier[]>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewRateTableForm>({
    name: '',
    type: 'SAVINGS',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: ({ id, tiers }: { id: number; tiers: RateTier[] }) =>
      parameterApi.updateRateTable(id, { tiers }),
    onSuccess: () => {
      toast.success('Rate table saved successfully');
      queryClient.invalidateQueries({ queryKey: ['rate-tables'] });
    },
    onError: () => {
      toast.error('Failed to save rate table');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; type?: string; tiers?: RateTier[] }) =>
      parameterApi.createRateTable(data),
    onSuccess: () => {
      toast.success('Rate table created');
      queryClient.invalidateQueries({ queryKey: ['rate-tables'] });
      setShowNewForm(false);
      setNewForm({ name: '', type: 'SAVINGS', effectiveDate: new Date().toISOString().split('T')[0] });
    },
    onError: () => {
      toast.error('Failed to create rate table');
    },
  });

  const handleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    // Load tiers from paramValue if not already edited
    if (!editedTiers[id]) {
      const rt = rateTables.find((r) => r.id === id);
      if (rt) {
        setEditedTiers((prev) => ({ ...prev, [id]: parseTiers(rt) }));
      }
    }
  };

  const handleTiersChange = (id: number, tiers: RateTier[]) => {
    setEditedTiers((prev) => ({ ...prev, [id]: tiers }));
  };

  const handleSave = (id: number) => {
    const tiers = editedTiers[id];
    if (!tiers) return;
    saveMutation.mutate({ id, tiers });
  };

  const handleCreateTable = () => {
    if (!newForm.name.trim()) {
      toast.error('Please enter a table name');
      return;
    }
    createMutation.mutate({
      name: newForm.name,
      type: newForm.type,
      tiers: [{ id: `tier-${Date.now()}`, minValue: 0, rate: 0 }],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Rate Tables</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage interest and fee rate schedules</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Rate Table
        </button>
      </div>

      {showNewForm && (
        <div className="surface-card p-5 space-y-4">
          <h4 className="text-sm font-semibold">New Rate Table</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide">Table Name</label>
              <input
                type="text"
                value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Premium Savings Rates Q2"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide">Type</label>
              <select
                value={newForm.type}
                onChange={(e) => setNewForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="SAVINGS">Savings</option>
                <option value="FD">Fixed Deposit</option>
                <option value="LENDING">Lending</option>
                <option value="PENALTY">Penalty</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide">Effective Date</label>
              <input
                type="date"
                value={newForm.effectiveDate}
                onChange={(e) => setNewForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTable}
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                'Create Table'
              )}
            </button>
          </div>
        </div>
      )}

      {rateTables.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground rounded-xl border border-dashed">
          No rate tables configured. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {rateTables.map((rt) => {
            const isExpanded = expandedId === rt.id;
            const tiers = editedTiers[rt.id] ?? parseTiers(rt);

            return (
              <div key={rt.id} className="surface-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleExpand(rt.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="text-left">
                      <p className="text-sm font-semibold">{rt.paramKey}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tiers.length} tier{tiers.length !== 1 ? 's' : ''} &middot; Last updated: {formatDateTime(rt.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        rt.paramCategory === 'RATE_TABLE'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                      )}
                    >
                      {rt.paramCategory.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        rt.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                      )}
                    >
                      {rt.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t pt-4">
                    <RateTierEditor
                      tiers={tiers}
                      onChange={(updated) => handleTiersChange(rt.id, updated)}
                      onSave={() => handleSave(rt.id)}
                      isSaving={saveMutation.isPending}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
