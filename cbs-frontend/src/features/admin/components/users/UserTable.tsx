import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Plus, UserX, UserCheck, Key, LogOut, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, StatusBadge, ConfirmDialog } from '@/components/shared';
import { userAdminApi, type CbsUser } from '../../api/userAdminApi';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { UserForm } from './UserForm';
import { PasswordResetDialog } from './PasswordResetDialog';

interface DisableDialogState {
  open: boolean;
  user: CbsUser | null;
  reason: string;
}

export function UserTable() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<CbsUser | undefined>();
  const [resetUser, setResetUser] = useState<CbsUser | null>(null);
  const [disableDialog, setDisableDialog] = useState<DisableDialogState>({ open: false, user: null, reason: '' });
  const [confirmForceLogout, setConfirmForceLogout] = useState<CbsUser | null>(null);
  const [selectedRows, setSelectedRows] = useState<CbsUser[]>([]);
  const [bulkDisableOpen, setBulkDisableOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userAdminApi.getUsers(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });

  const disableMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => userAdminApi.disableUser(id, reason),
    onSuccess: () => { toast.success('User disabled'); invalidate(); setDisableDialog({ open: false, user: null, reason: '' }); },
    onError: () => toast.error('Failed to disable user'),
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => userAdminApi.enableUser(id),
    onSuccess: () => { toast.success('User enabled'); invalidate(); },
    onError: () => toast.error('Failed to enable user'),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: (id: string) => userAdminApi.forceLogout(id),
    onSuccess: () => { toast.success('User sessions terminated'); setConfirmForceLogout(null); },
    onError: () => toast.error('Failed to force logout'),
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => userAdminApi.unlockUser(id),
    onSuccess: () => { toast.success('User unlocked'); invalidate(); },
    onError: () => toast.error('Failed to unlock user'),
  });

  const bulkDisableMutation = useMutation({
    mutationFn: async (userList: CbsUser[]) => {
      for (const u of userList) await userAdminApi.disableUser(u.id, 'Bulk disable');
    },
    onSuccess: () => { toast.success(`${selectedRows.length} users disabled`); invalidate(); setBulkDisableOpen(false); setSelectedRows([]); },
    onError: () => toast.error('Bulk disable failed'),
  });

  const columns: ColumnDef<CbsUser>[] = [
    {
      accessorKey: 'username',
      header: 'Username',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.username}</span>
      ),
    },
    {
      accessorKey: 'fullName',
      header: 'Full Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
    },
    {
      id: 'roles',
      header: 'Roles',
      cell: ({ row }) => {
        const roles = row.original.roles;
        const visible = roles.slice(0, 2);
        const extra = roles.length - 2;
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map(r => (
              <span key={r} className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
                {r.replace(/_/g, ' ')}
              </span>
            ))}
            {extra > 0 && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground font-medium">
                +{extra} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'branchName',
      header: 'Branch',
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }) =>
        row.original.lastLogin ? (
          <span className="text-sm text-muted-foreground">{formatDateTime(row.original.lastLogin)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Never</span>
        ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <UserActionsDropdown user={row.original} onEdit={() => { setEditUser(row.original); setFormOpen(true); }} onDisable={() => setDisableDialog({ open: true, user: row.original, reason: '' })} onEnable={() => enableMutation.mutate(row.original.id)} onReset={() => setResetUser(row.original)} onForceLogout={() => setConfirmForceLogout(row.original)} onUnlock={() => unlockMutation.mutate(row.original.id)} />,
    },
  ];

  const handleNewUser = () => {
    setEditUser(undefined);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} users total</p>
        <button
          onClick={handleNewUser}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New User
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        enableRowSelection
        onRowSelectionChange={setSelectedRows}
        enableGlobalFilter
        enableColumnVisibility
        onRowClick={(user) => { setEditUser(user); setFormOpen(true); }}
        emptyMessage="No users found"
        bulkActions={
          selectedRows.length > 0 ? (
            <button
              onClick={() => setBulkDisableOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <UserX className="w-4 h-4" />
              Disable Selected ({selectedRows.length})
            </button>
          ) : null
        }
      />

      <UserForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditUser(undefined); }}
        user={editUser}
        onSuccess={() => { setFormOpen(false); setEditUser(undefined); invalidate(); }}
      />

      <PasswordResetDialog
        user={resetUser}
        open={!!resetUser}
        onClose={() => setResetUser(null)}
      />

      {/* Disable dialog */}
      {disableDialog.open && disableDialog.user && (
        <DisableUserDialog
          user={disableDialog.user}
          reason={disableDialog.reason}
          onReasonChange={(r) => setDisableDialog(s => ({ ...s, reason: r }))}
          onClose={() => setDisableDialog({ open: false, user: null, reason: '' })}
          onConfirm={() => disableMutation.mutate({ id: disableDialog.user!.id, reason: disableDialog.reason })}
          isLoading={disableMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!confirmForceLogout}
        onClose={() => setConfirmForceLogout(null)}
        onConfirm={() => forceLogoutMutation.mutate(confirmForceLogout!.id)}
        title="Force Logout User"
        description={`This will immediately terminate all active sessions for ${confirmForceLogout?.fullName}. They will need to log in again.`}
        confirmLabel="Force Logout"
        variant="destructive"
        isLoading={forceLogoutMutation.isPending}
      />

      <ConfirmDialog
        open={bulkDisableOpen}
        onClose={() => setBulkDisableOpen(false)}
        onConfirm={() => bulkDisableMutation.mutate(selectedRows)}
        title="Disable Selected Users"
        description={`This will disable ${selectedRows.length} selected users. They will not be able to log in until re-enabled.`}
        confirmLabel="Disable All"
        variant="destructive"
        isLoading={bulkDisableMutation.isPending}
      />
    </div>
  );
}

// ─── Actions Dropdown ─────────────────────────────────────────────────────

interface UserActionsDropdownProps {
  user: CbsUser;
  onEdit: () => void;
  onDisable: () => void;
  onEnable: () => void;
  onReset: () => void;
  onForceLogout: () => void;
  onUnlock: () => void;
}

function UserActionsDropdown({ user, onEdit, onDisable, onEnable, onReset, onForceLogout, onUnlock }: UserActionsDropdownProps) {
  const [open, setOpen] = useState(false);

  const handle = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    fn();
  };

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded hover:bg-muted transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 rounded-lg border bg-popover shadow-lg z-20 py-1">
            <DropdownItem icon={<UserCheck className="w-4 h-4" />} label="Edit User" onClick={handle(onEdit)} />
            {user.status === 'DISABLED' ? (
              <DropdownItem icon={<UserCheck className="w-4 h-4" />} label="Enable User" onClick={handle(onEnable)} />
            ) : (
              <DropdownItem icon={<UserX className="w-4 h-4" />} label="Disable User" onClick={handle(onDisable)} className="text-amber-600" />
            )}
            <DropdownItem icon={<Key className="w-4 h-4" />} label="Reset Password" onClick={handle(onReset)} />
            <DropdownItem icon={<LogOut className="w-4 h-4" />} label="Force Logout" onClick={handle(onForceLogout)} className="text-amber-600" />
            {user.status === 'LOCKED' && (
              <DropdownItem icon={<Unlock className="w-4 h-4" />} label="Unlock Account" onClick={handle(onUnlock)} className="text-green-600" />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DropdownItem({ icon, label, onClick, className }: { icon: React.ReactNode; label: string; onClick: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors', className)}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Disable Dialog ───────────────────────────────────────────────────────

interface DisableUserDialogProps {
  user: CbsUser;
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function DisableUserDialog({ user, reason, onReasonChange, onClose, onConfirm, isLoading }: DisableUserDialogProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Disable User Account</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Disable <strong>{user.fullName}</strong>'s account. Provide a reason for audit purposes.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Reason <span className="text-red-500">*</span></label>
            <textarea
              value={reason}
              onChange={e => onReasonChange(e.target.value)}
              rows={3}
              placeholder="Enter reason for disabling this account..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} disabled={isLoading} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading || !reason.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Disable Account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
