import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { parameterApi } from '../../api/parameterApi';
import { RateTierEditor } from './RateTierEditor';
import type { RateTable } from '../../api/parameterApi';

const STATUS_STYLES: Record<RateTable['status'], string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SUPERSEDED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const TYPE_STYLES: Record<RateTable['type'], string> = {
  SAVINGS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  FD: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  LENDING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  PENALTY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface RateTableEditorProps {
  rateTables: RateTable[];
}

interface NewRateTableForm {
  name: string;
  type: RateTable['type'];
  effectiveDate: string;
}

export function RateTableEditor({ rateTables }: RateTableEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadedTables, setLoadedTables] = useState<Record<string, RateTable>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewRateTableForm>({
    name: '',
    type: 'SAVINGS',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: ({ id, table }: { id: string; table: RateTable }) =>
      parameterApi.updateRateTable(id, { tiers: table.tiers, effectiveDate: table.effectiveDate }),
    onSuccess: () => {
      toast.success('Rate table saved successfully');
      queryClient.invalidateQueries({ queryKey: ['rate-tables'] });
    },
    onError: () => {
      toast.error('Failed to save rate table');
    },
  });

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!loadedTables[id]) {
      const full = await parameterApi.getRateTable(id);
      setLoadedTables((prev) => ({ ...prev, [id]: full }));
    }
  };

  const handleTableChange = (id: string, updated: RateTable) => {
    setLoadedTables((prev) => ({ ...prev, [id]: updated }));
  };

  const handleSave = (id: string) => {
    const table = loadedTables[id];
    if (!table) return;
    saveMutation.mutate({ id, table });
  };

  const handleCreateTable = () => {
    if (!newForm.name.trim()) {
      toast.error('Please enter a table name');
      return;
    }
    toast.success('Rate table created (demo mode — not persisted)');
    setShowNewForm(false);
    setNewForm({ name: '', type: 'SAVINGS', effectiveDate: new Date().toISOString().split('T')[0] });
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
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h4 className="text-sm font-semibold">New Rate Table</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide">Table Name</label>
              <input
                type="text"
                value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Premium Savings Rates Q2 2025"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide">Type</label>
              <select
                value={newForm.type}
                onChange={(e) => setNewForm((f) => ({ ...f, type: e.target.value as RateTable['type'] }))}
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
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Create Table
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rateTables.map((rt) => {
          const isExpanded = expandedId === rt.id;
          const loaded = loadedTables[rt.id];

          return (
            <div key={rt.id} className="rounded-xl border bg-card overflow-hidden">
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
                    <p className="text-sm font-semibold">{rt.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Effective: {formatDate(rt.effectiveDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      TYPE_STYLES[rt.type],
                    )}
                  >
                    {rt.type}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      STATUS_STYLES[rt.status],
                    )}
                  >
                    {rt.status}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t pt-4">
                  {!loaded ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Loading rate tiers…</div>
                  ) : (
                    <RateTierEditor
                      rateTable={loaded}
                      onChange={(updated) => handleTableChange(rt.id, updated)}
                      onSave={() => handleSave(rt.id)}
                      isSaving={saveMutation.isPending}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
