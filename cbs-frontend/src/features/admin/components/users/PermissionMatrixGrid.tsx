import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Save, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { userAdminApi, type Role, type Permission } from '../../api/userAdminApi';
import { cn } from '@/lib/utils';

interface PermissionMatrixGridProps {
  roles: Role[];
  permissions: Permission[];
}

const MODULES = ['Customers', 'Accounts', 'Lending', 'Payments', 'Treasury', 'Risk', 'Compliance', 'Operations', 'Reports', 'Admin'];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'] as const;

export function PermissionMatrixGrid({ roles, permissions }: PermissionMatrixGridProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || '');
  const [editMode, setEditMode] = useState(false);
  const [pendingPerms, setPendingPerms] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [roleSelectOpen, setRoleSelectOpen] = useState(false);

  const qc = useQueryClient();

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const originalPermSet = new Set(selectedRole?.permissions || []);
  const activePermSet = editMode ? pendingPerms : originalPermSet;

  const updateMutation = useMutation({
    mutationFn: (perms: string[]) => userAdminApi.updateRolePermissions(selectedRoleId, perms),
    onSuccess: () => {
      toast.success('Permissions saved');
      qc.invalidateQueries({ queryKey: ['admin', 'roles'] });
      setEditMode(false);
      setHasChanges(false);
    },
    onError: () => toast.error('Failed to save permissions'),
  });

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    setEditMode(false);
    setHasChanges(false);
    setRoleSelectOpen(false);
  };

  const handleEnterEditMode = () => {
    setPendingPerms(new Set(originalPermSet));
    setEditMode(true);
    setHasChanges(false);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setHasChanges(false);
    setPendingPerms(new Set());
  };

  const toggleCell = (permId: string) => {
    if (!editMode) return;
    const next = new Set(pendingPerms);
    if (next.has(permId)) {
      next.delete(permId);
    } else {
      next.add(permId);
    }
    setPendingPerms(next);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(Array.from(pendingPerms));
  };

  const permExists = (mod: string, action: string) => {
    return !!permissions.find(p => p.module === mod.toLowerCase() && p.action === action);
  };

  const isGranted = (mod: string, action: string) => {
    const permId = `${mod.toLowerCase()}:${action}`;
    return activePermSet.has(permId);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Viewing permissions for:</span>
          <div className="relative">
            <button
              onClick={() => setRoleSelectOpen(!roleSelectOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors min-w-[180px]"
            >
              <span className="flex-1 text-left">{selectedRole?.displayName || 'Select role'}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
            {roleSelectOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRoleSelectOpen(false)} />
                <div className="absolute top-full mt-1 w-full min-w-[220px] rounded-lg border bg-popover shadow-lg z-20 py-1">
                  {roles.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleRoleChange(r.id)}
                      className={cn('w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors', r.id === selectedRoleId && 'bg-primary/5 font-medium')}
                    >
                      {r.displayName}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {selectedRole && (
            <span className="text-xs text-muted-foreground">
              {selectedRole.permissionCount} permissions assigned
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleEnterEditMode}
              disabled={!selectedRole || selectedRole.isSystem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={selectedRole?.isSystem ? 'System roles cannot be edited' : 'Edit permissions'}
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Mode
            </button>
          )}
        </div>
      </div>

      {selectedRole?.isSystem && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
          <span>System roles are protected and cannot be modified.</span>
        </div>
      )}

      {editMode && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-400">
          <Edit2 className="w-4 h-4 flex-shrink-0" />
          <span>Edit mode active. Click checkboxes to toggle permissions. Click Save Changes when done.</span>
        </div>
      )}

      {/* Grid */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-40">Module</th>
                {ACTIONS.map(action => (
                  <th key={action} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider capitalize">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod, idx) => (
                <tr key={mod} className={cn('border-b last:border-0', idx % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">{mod}</span>
                  </td>
                  {ACTIONS.map(action => {
                    const permId = `${mod.toLowerCase()}:${action}`;
                    const exists = permExists(mod, action);
                    const granted = isGranted(mod, action);
                    return (
                      <td key={action} className="px-3 py-3">
                        <div className="flex justify-center">
                          {exists ? (
                            <button
                              type="button"
                              onClick={() => toggleCell(permId)}
                              disabled={!editMode}
                              className={cn(
                                'w-6 h-6 rounded flex items-center justify-center text-sm transition-all',
                                editMode ? 'cursor-pointer hover:scale-110' : 'cursor-default',
                                granted
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                  : 'bg-muted/50 text-muted-foreground',
                              )}
                              title={`${mod} — ${action}: ${granted ? 'Granted' : 'Denied'}`}
                            >
                              {granted ? '✓' : '✗'}
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-xs">✓</span>
          <span>Granted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-muted/50 text-muted-foreground flex items-center justify-center text-xs">✗</span>
          <span>Denied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-base">—</span>
          <span>Not applicable</span>
        </div>
      </div>
    </div>
  );
}
