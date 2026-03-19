import { useState } from 'react';
import { Edit2, RefreshCw, AlertTriangle, CheckCircle2, X, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RetentionPolicy, RetentionClass } from '../../api/documentApi';

interface RetentionPolicyTableProps {
  policies: RetentionPolicy[];
  onUpdate: (id: string, data: Partial<RetentionPolicy>) => void;
  onRunCheck: () => void;
}

interface EditState {
  retentionYears: number;
  autoDelete: boolean;
  archiveAfterYears: number | undefined;
  regulatoryBasis: string;
}

const CATEGORY_COLORS: Record<RetentionClass, string> = {
  KYC: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  TRANSACTION: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  LOAN: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  INTERNAL: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  REGULATORY: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  CORRESPONDENCE: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
};

interface RetentionCheckResult {
  expiredCount: number;
  archivedCount: number;
  message: string;
}

export function RetentionPolicyTable({ policies, onUpdate, onRunCheck }: RetentionPolicyTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkResult, setCheckResult] = useState<RetentionCheckResult | null>(null);

  function startEdit(policy: RetentionPolicy) {
    setEditingId(policy.id);
    setEditState({
      retentionYears: policy.retentionYears,
      autoDelete: policy.autoDelete,
      archiveAfterYears: policy.archiveAfterYears,
      regulatoryBasis: policy.regulatoryBasis,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  async function saveEdit(id: string) {
    if (!editState) return;
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      onUpdate(id, {
        retentionYears: editState.retentionYears,
        autoDelete: editState.autoDelete,
        archiveAfterYears: editState.archiveAfterYears,
        regulatoryBasis: editState.regulatoryBasis,
      });
      setEditingId(null);
      setEditState(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleRunCheck() {
    setRunningCheck(true);
    try {
      await new Promise((r) => setTimeout(r, 2000));
      onRunCheck();
      setCheckResult({
        expiredCount: 3,
        archivedCount: 12,
        message: '3 documents past retention period identified. 12 documents archived automatically.',
      });
    } finally {
      setRunningCheck(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {policies.length} retention policies configured
        </p>
        <button
          onClick={handleRunCheck}
          disabled={runningCheck}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            runningCheck
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {runningCheck ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running Check…
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Run Retention Check
            </>
          )}
        </button>
      </div>

      {/* Check Result Banner */}
      {checkResult && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              Retention Check Complete
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{checkResult.message}</p>
          </div>
          <button
            onClick={() => setCheckResult(null)}
            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-blue-600" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Document Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Retention Period
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Auto-Delete
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Archive After
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Regulatory Basis
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Documents
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Expiring Soon
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {policies.map((policy) => {
              const isEditing = editingId === policy.id;

              return (
                <tr key={policy.id} className={cn('hover:bg-muted/20 transition-colors', isEditing && 'bg-primary/5')}>
                  {/* Category */}
                  <td className="px-4 py-3">
                    <div>
                      <span
                        className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded',
                          CATEGORY_COLORS[policy.category],
                        )}
                      >
                        {policy.category}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                        {policy.description}
                      </p>
                    </div>
                  </td>

                  {/* Retention Period */}
                  <td className="px-4 py-3">
                    {isEditing && editState ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={editState.retentionYears}
                          onChange={(e) =>
                            setEditState((prev) =>
                              prev ? { ...prev, retentionYears: Number(e.target.value) } : prev,
                            )
                          }
                          className="w-16 px-2 py-1 text-sm border border-primary/40 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <span className="text-xs text-muted-foreground">years</span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium">{policy.retentionYears} years</span>
                    )}
                  </td>

                  {/* Auto-Delete */}
                  <td className="px-4 py-3">
                    {isEditing && editState ? (
                      <button
                        onClick={() =>
                          setEditState((prev) =>
                            prev ? { ...prev, autoDelete: !prev.autoDelete } : prev,
                          )
                        }
                        className={cn(
                          'text-xs font-medium px-2.5 py-1 rounded-full border transition-colors',
                          editState.autoDelete
                            ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700'
                            : 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
                        )}
                      >
                        {editState.autoDelete ? 'Yes' : 'No'}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          'text-xs font-medium px-2.5 py-1 rounded-full',
                          policy.autoDelete
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                        )}
                      >
                        {policy.autoDelete ? 'Yes' : 'No'}
                      </span>
                    )}
                  </td>

                  {/* Archive After */}
                  <td className="px-4 py-3">
                    {isEditing && editState ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={editState.archiveAfterYears ?? ''}
                          onChange={(e) =>
                            setEditState((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    archiveAfterYears: e.target.value ? Number(e.target.value) : undefined,
                                  }
                                : prev,
                            )
                          }
                          placeholder="—"
                          className="w-16 px-2 py-1 text-sm border border-primary/40 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <span className="text-xs text-muted-foreground">yrs</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {policy.archiveAfterYears ? `${policy.archiveAfterYears} years` : '—'}
                      </span>
                    )}
                  </td>

                  {/* Regulatory Basis */}
                  <td className="px-4 py-3 max-w-[220px]">
                    {isEditing && editState ? (
                      <input
                        type="text"
                        value={editState.regulatoryBasis}
                        onChange={(e) =>
                          setEditState((prev) =>
                            prev ? { ...prev, regulatoryBasis: e.target.value } : prev,
                          )
                        }
                        className="w-full px-2 py-1 text-xs border border-primary/40 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        {policy.regulatoryBasis}
                      </span>
                    )}
                  </td>

                  {/* Document Count */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium">{policy.documentCount}</span>
                  </td>

                  {/* Expiring Soon */}
                  <td className="px-4 py-3 text-center">
                    {policy.expiringSoon > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        {policy.expiringSoon}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => saveEdit(policy.id)}
                          disabled={saving}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(policy)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {policies.reduce((sum, p) => sum + p.expiringSoon, 0)} document
            {policies.reduce((sum, p) => sum + p.expiringSoon, 0) !== 1 ? 's' : ''} expiring
            within 90 days across all categories
          </span>
        </div>
      </div>
    </div>
  );
}
