import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Lock, Plus, Users, Shield, X, ChevronRight } from 'lucide-react';
import { DataTable, StatusBadge, AuditTimeline } from '@/components/shared';
import { userAdminApi, type Role } from '../../api/userAdminApi';
import { cn } from '@/lib/utils';
import { RoleForm } from './RoleForm';

export function RoleTable() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | undefined>();
  const [detailRole, setDetailRole] = useState<Role | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => userAdminApi.getRoles(),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => userAdminApi.getPermissions(),
  });

  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] });

  const columns: ColumnDef<Role>[] = [
    {
      id: 'name',
      header: 'Role',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.isSystem && (
            <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-label="System role — cannot be deleted" />
          )}
          <div>
            <div className="text-sm font-medium">{row.original.displayName}</div>
            <div className="text-xs text-muted-foreground font-mono">{row.original.name}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1">{row.original.description}</span>
      ),
    },
    {
      id: 'userCount',
      header: 'Users',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm">{row.original.userCount}</span>
        </div>
      ),
    },
    {
      id: 'permissionCount',
      header: 'Permissions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm">{row.original.permissionCount}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'chevron',
      header: '',
      cell: () => <ChevronRight className="w-4 h-4 text-muted-foreground" />,
    },
  ];

  const handleRowClick = (role: Role) => {
    setDetailRole(role);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{roles.length} roles configured</p>
        <button
          onClick={() => { setEditRole(undefined); setFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      <DataTable
        columns={columns}
        data={roles}
        isLoading={isLoading}
        enableGlobalFilter
        onRowClick={handleRowClick}
        emptyMessage="No roles found"
      />

      <RoleForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditRole(undefined); }}
        role={editRole}
        onSuccess={() => { setFormOpen(false); setEditRole(undefined); invalidate(); }}
      />

      {detailRole && (
        <RoleDetailPanel
          role={detailRole}
          permissions={permissions}
          onClose={() => setDetailRole(null)}
          onEdit={() => { setEditRole(detailRole); setDetailRole(null); setFormOpen(true); }}
        />
      )}
    </div>
  );
}

// ─── Role Detail Panel ────────────────────────────────────────────────────

interface RoleDetailPanelProps {
  role: Role;
  permissions: { id: string; module: string; action: string; description: string }[];
  onClose: () => void;
  onEdit: () => void;
}

function RoleDetailPanel({ role, permissions, onClose, onEdit }: RoleDetailPanelProps) {
  const modules = [...new Set(permissions.map(p => p.module))];
  const rolePermSet = new Set(role.permissions || []);

  const auditEvents = [
    { id: 'ae1', action: 'Created', performedBy: 'System', performedAt: new Date(Date.now() - 86400000 * 180).toISOString(), details: `Role ${role.name} was created` },
    { id: 'ae2', action: 'Modified', performedBy: 'adaeze.obi', performedAt: new Date(Date.now() - 86400000 * 30).toISOString(), details: 'Permissions updated', changes: [{ field: 'permissions', from: `${role.permissionCount - 2} permissions`, to: `${role.permissionCount} permissions` }] },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-card border-l shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            {role.isSystem && <Lock className="w-4 h-4 text-muted-foreground" />}
            <div>
              <h3 className="font-semibold">{role.displayName}</h3>
              <p className="text-xs text-muted-foreground font-mono">{role.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!role.isSystem && (
              <button onClick={onEdit} className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors">
                Edit Permissions
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold">{role.userCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Users Assigned</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold">{role.permissionCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Permissions</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <StatusBadge status={role.status} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{role.description}</p>

          {/* Permissions by module */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Permissions by Module</h4>
            <div className="space-y-2">
              {modules.map(mod => {
                const modPerms = permissions.filter(p => p.module === mod);
                const grantedPerms = modPerms.filter(p => rolePermSet.has(p.id));
                if (grantedPerms.length === 0) return null;
                return (
                  <div key={mod} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{mod}</span>
                      <span className="text-xs text-muted-foreground">{grantedPerms.length}/{modPerms.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {modPerms.map(perm => (
                        <span
                          key={perm.id}
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium capitalize',
                            rolePermSet.has(perm.id)
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-muted text-muted-foreground line-through opacity-50',
                          )}
                        >
                          {perm.action}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Timeline */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Change History</h4>
            <AuditTimeline events={auditEvents} />
          </div>
        </div>
      </div>
    </>
  );
}
