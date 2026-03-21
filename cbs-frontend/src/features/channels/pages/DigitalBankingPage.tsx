import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Shield,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  Layers,
  DollarSign,
  AlertTriangle,
  Plus,
  X,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, StatCard, DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useIbLoginInfo,
  useIbIdleStatus,
  useExpireIdleSessions,
  useUssdMenus,
  useCreateUssdMenu,
  useUpdateUssdMenu,
  useDeleteUssdMenu,
  useChannelActivitySummaries,
  useCreateActivitySummary,
  useLogChannelActivity,
} from '../hooks/useDigitalBanking';
import type { UssdMenu, ChannelActivitySummary } from '../api/digitalBankingApi';

// ─── Internet Banking Overview Tab ───────────────────────────────────────────

function InternetBankingTab() {
  const { data: loginInfo, isLoading: loginLoading } = useIbLoginInfo();
  const { data: idleStatus, isLoading: idleLoading } = useIbIdleStatus();
  const { mutate: expireIdle, isPending: expiring } = useExpireIdleSessions();

  const handleExpireIdle = () => {
    expireIdle(undefined, {
      onSuccess: (data) => {
        toast.success(`${data.expired} idle sessions expired`);
      },
      onError: () => toast.error('Failed to expire idle sessions'),
    });
  };

  const loginMethods = loginInfo?.methods?.split(',') ?? [];

  return (
    <div className="space-y-6">
      {/* Status Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Portal Status</p>
              {loginLoading ? (
                <div className="h-4 w-16 bg-muted rounded animate-pulse mt-0.5" />
              ) : (
                <p className={cn('text-sm font-semibold', loginInfo?.status === 'READY' ? 'text-green-600' : 'text-red-500')}>
                  {loginInfo?.status ?? 'Unknown'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Auth Methods</p>
              {loginLoading ? (
                <div className="h-4 w-24 bg-muted rounded animate-pulse mt-0.5" />
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {loginMethods.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {m.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Idle Sessions</p>
              {idleLoading ? (
                <div className="h-4 w-10 bg-muted rounded animate-pulse mt-0.5" />
              ) : (
                <p className="text-sm font-semibold">{idleStatus?.expired ?? 0} expired</p>
              )}
            </div>
          </div>
          <button
            onClick={handleExpireIdle}
            disabled={expiring}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50 w-full justify-center mt-2"
          >
            {expiring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Expire Idle Sessions
          </button>
        </div>
      </div>

      {/* IB Architecture Overview */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">Internet Banking Session Architecture</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[
            {
              label: 'Idle Timeout',
              value: '15 min',
              icon: AlertTriangle,
              color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            },
            {
              label: 'Absolute Timeout',
              value: '480 min',
              icon: Lock,
              color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            },
            {
              label: 'MFA Required',
              value: 'Configurable',
              icon: Shield,
              color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            },
            {
              label: 'SCA Support',
              value: 'PSD2 Compliant',
              icon: CheckCircle2,
              color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium text-sm">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── USSD Menu Management Tab ────────────────────────────────────────────────

interface CreateMenuDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    menuCode: string;
    parentMenuCode?: string;
    displayOrder: number;
    title: string;
    shortcode?: string;
    actionType: string;
    serviceCode?: string;
    requiresPin: boolean;
    isActive: boolean;
  }) => void;
  isPending: boolean;
}

function CreateMenuDialog({ open, onClose, onSubmit, isPending }: CreateMenuDialogProps) {
  const [form, setForm] = useState({
    menuCode: '',
    parentMenuCode: '',
    displayOrder: '0',
    title: '',
    shortcode: '',
    actionType: 'MENU',
    serviceCode: '',
    requiresPin: false,
    isActive: true,
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      menuCode: form.menuCode,
      parentMenuCode: form.parentMenuCode || undefined,
      displayOrder: parseInt(form.displayOrder, 10) || 0,
      title: form.title,
      shortcode: form.shortcode || undefined,
      actionType: form.actionType,
      serviceCode: form.serviceCode || undefined,
      requiresPin: form.requiresPin,
      isActive: form.isActive,
    });
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card">
            <h2 className="text-base font-semibold">Create USSD Menu</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Menu Code *</label>
                <input
                  required
                  className={inputCls}
                  value={form.menuCode}
                  onChange={(e) => setForm((f) => ({ ...f, menuCode: e.target.value }))}
                  placeholder="e.g. BALANCE"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Order</label>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={form.displayOrder}
                  onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
              <input
                required
                className={inputCls}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Check Balance"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Parent Menu Code</label>
                <input
                  className={inputCls}
                  value={form.parentMenuCode}
                  onChange={(e) => setForm((f) => ({ ...f, parentMenuCode: e.target.value }))}
                  placeholder="e.g. MAIN"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Short Code</label>
                <input
                  className={inputCls}
                  value={form.shortcode}
                  onChange={(e) => setForm((f) => ({ ...f, shortcode: e.target.value }))}
                  placeholder="e.g. *123#"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Action Type *</label>
                <select
                  className={inputCls}
                  value={form.actionType}
                  onChange={(e) => setForm((f) => ({ ...f, actionType: e.target.value }))}
                >
                  <option value="MENU">Menu</option>
                  <option value="SERVICE">Service</option>
                  <option value="INPUT">Input</option>
                  <option value="DISPLAY">Display</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Service Code</label>
                <input
                  className={inputCls}
                  value={form.serviceCode}
                  onChange={(e) => setForm((f) => ({ ...f, serviceCode: e.target.value }))}
                  placeholder="e.g. BALANCE_INQUIRY"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiresPin}
                  onChange={(e) => setForm((f) => ({ ...f, requiresPin: e.target.checked }))}
                  className="rounded border-muted-foreground"
                />
                Requires PIN
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-muted-foreground"
                />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Menu
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Edit Menu Dialog ─────────────────────────────────────────────────────────

interface EditMenuDialogProps {
  menu: UssdMenu;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<UssdMenu>) => void;
  isPending: boolean;
}

function EditMenuDialog({ menu, open, onClose, onSave, isPending }: EditMenuDialogProps) {
  const [form, setForm] = useState({
    menuCode: menu.menuCode,
    parentMenuCode: menu.parentMenuCode ?? '',
    displayOrder: String(menu.displayOrder),
    title: menu.title,
    shortcode: menu.shortcode ?? '',
    actionType: menu.actionType,
    serviceCode: menu.serviceCode ?? '',
    requiresPin: menu.requiresPin,
    isActive: menu.isActive,
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      menuCode: form.menuCode,
      parentMenuCode: form.parentMenuCode || null,
      displayOrder: parseInt(form.displayOrder, 10) || 0,
      title: form.title,
      shortcode: form.shortcode || null,
      actionType: form.actionType,
      serviceCode: form.serviceCode || null,
      requiresPin: form.requiresPin,
      isActive: form.isActive,
    });
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card">
            <h2 className="text-base font-semibold">Edit USSD Menu</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Menu Code *</label>
                <input required className={inputCls} value={form.menuCode} onChange={(e) => setForm((f) => ({ ...f, menuCode: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Order</label>
                <input type="number" min={0} className={inputCls} value={form.displayOrder} onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
              <input required className={inputCls} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Parent Menu Code</label>
                <input className={inputCls} value={form.parentMenuCode} onChange={(e) => setForm((f) => ({ ...f, parentMenuCode: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Short Code</label>
                <input className={inputCls} value={form.shortcode} onChange={(e) => setForm((f) => ({ ...f, shortcode: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Action Type *</label>
                <select className={inputCls} value={form.actionType} onChange={(e) => setForm((f) => ({ ...f, actionType: e.target.value }))}>
                  <option value="MENU">Menu</option>
                  <option value="SERVICE">Service</option>
                  <option value="INPUT">Input</option>
                  <option value="DISPLAY">Display</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Service Code</label>
                <input className={inputCls} value={form.serviceCode} onChange={(e) => setForm((f) => ({ ...f, serviceCode: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.requiresPin} onChange={(e) => setForm((f) => ({ ...f, requiresPin: e.target.checked }))} />
                Requires PIN
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── USSD Menu Management Tab ─────────────────────────────────────────────────

function UssdMenuTab() {
  const { data: menus = [], isLoading } = useUssdMenus();
  const { mutate: createMenu, isPending } = useCreateUssdMenu();
  const { mutate: updateMenu, isPending: isUpdating } = useUpdateUssdMenu();
  const { mutate: deleteMenu, isPending: isDeleting } = useDeleteUssdMenu();
  const [showCreate, setShowCreate] = useState(false);
  const [editingMenu, setEditingMenu] = useState<UssdMenu | null>(null);
  const [deletingMenu, setDeletingMenu] = useState<UssdMenu | null>(null);

  const rootMenus = menus.filter((m) => !m.parentMenuCode);
  const subMenus = menus.filter((m) => !!m.parentMenuCode);

  const handleCreate = (data: Parameters<typeof createMenu>[0]) => {
    createMenu(data, {
      onSuccess: () => {
        toast.success('USSD menu created');
        setShowCreate(false);
      },
      onError: () => toast.error('Failed to create USSD menu'),
    });
  };

  const handleUpdate = (data: Partial<UssdMenu>) => {
    if (!editingMenu) return;
    updateMenu(
      { id: editingMenu.id, menu: data },
      {
        onSuccess: () => {
          toast.success('USSD menu updated');
          setEditingMenu(null);
        },
        onError: () => toast.error('Failed to update USSD menu'),
      },
    );
  };

  const handleDelete = () => {
    if (!deletingMenu) return;
    deleteMenu(deletingMenu.id, {
      onSuccess: () => {
        toast.success('USSD menu deleted');
        setDeletingMenu(null);
      },
      onError: () => toast.error('Failed to delete USSD menu'),
    });
  };

  const ussdMenuColumns: ColumnDef<UssdMenu, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'menuCode',
        header: 'Menu Code',
        cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.menuCode}</span>,
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.title}</span>,
      },
      {
        accessorKey: 'parentMenuCode',
        header: 'Parent',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.parentMenuCode ?? '—'}</span>,
      },
      {
        accessorKey: 'actionType',
        header: 'Action',
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
            {row.original.actionType}
          </span>
        ),
      },
      {
        accessorKey: 'displayOrder',
        header: 'Order',
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.displayOrder}</span>,
      },
      {
        accessorKey: 'requiresPin',
        header: 'PIN',
        cell: ({ row }) =>
          row.original.requiresPin ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-muted-foreground" />
          ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingMenu(row.original);
              }}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingMenu(row.original);
              }}
              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Menus" value={menus.length} format="number" icon={Layers} loading={isLoading} />
        <StatCard label="Root Menus" value={rootMenus.length} format="number" icon={Globe} loading={isLoading} />
        <StatCard label="Sub Menus" value={subMenus.length} format="number" icon={Layers} loading={isLoading} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">USSD Menu Tree</h3>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Menu
          </button>
        </div>
        <div className="p-4">
          <DataTable
            columns={ussdMenuColumns}
            data={menus}
            isLoading={isLoading}
            enableGlobalFilter
            emptyMessage="No USSD menus configured"
            pageSize={15}
          />
        </div>
      </div>

      <CreateMenuDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        isPending={isPending}
      />

      {editingMenu && (
        <EditMenuDialog
          menu={editingMenu}
          open={!!editingMenu}
          onClose={() => setEditingMenu(null)}
          onSave={handleUpdate}
          isPending={isUpdating}
        />
      )}

      {deletingMenu && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDeletingMenu(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm">
              <div className="px-6 py-4 border-b">
                <h2 className="text-base font-semibold text-red-600">Delete USSD Menu</h2>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete menu <span className="font-semibold text-foreground">{deletingMenu.title}</span> ({deletingMenu.menuCode})?
                </p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setDeletingMenu(null)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Channel Activity Summaries Tab ──────────────────────────────────────────

const summaryColumns: ColumnDef<ChannelActivitySummary, unknown>[] = [
  {
    accessorKey: 'customerId',
    header: 'Customer ID',
    cell: ({ row }) => <span className="text-sm font-mono">{row.original.customerId}</span>,
  },
  {
    accessorKey: 'channel',
    header: 'Channel',
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        {row.original.channel}
      </span>
    ),
  },
  {
    accessorKey: 'periodType',
    header: 'Period',
    cell: ({ row }) => <span className="text-sm">{row.original.periodType}</span>,
  },
  {
    accessorKey: 'periodDate',
    header: 'Date',
    cell: ({ row }) => <span className="text-sm">{row.original.periodDate}</span>,
  },
  {
    accessorKey: 'totalSessions',
    header: 'Sessions',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.totalSessions}</span>,
  },
  {
    accessorKey: 'totalTransactions',
    header: 'Transactions',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.totalTransactions}</span>,
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total Amount',
    cell: ({ row }) => (
      <span className="text-sm font-semibold tabular-nums">
        {formatMoney(row.original.totalAmount)}
      </span>
    ),
  },
  {
    accessorKey: 'avgResponseTimeMs',
    header: 'Avg Resp (ms)',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">{row.original.avgResponseTimeMs.toFixed(0)}</span>
    ),
  },
  {
    accessorKey: 'failureCount',
    header: 'Failures',
    cell: ({ row }) => (
      <span className={cn('text-sm tabular-nums', row.original.failureCount > 0 ? 'text-red-600 font-semibold' : '')}>
        {row.original.failureCount}
      </span>
    ),
  },
];

function ActivitySummariesTab() {
  const navigate = useNavigate();
  const { data: summaries = [], isLoading } = useChannelActivitySummaries();
  const { mutate: createSummary, isPending } = useCreateActivitySummary();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    channel: 'WEB',
    periodType: 'DAILY',
    periodDate: new Date().toISOString().slice(0, 10),
  });

  const totalTransactions = useMemo(
    () => summaries.reduce((s, r) => s + r.totalTransactions, 0),
    [summaries],
  );
  const totalAmount = useMemo(
    () => summaries.reduce((s, r) => s + r.totalAmount, 0),
    [summaries],
  );

  const handleCreateSummary = (e: React.FormEvent) => {
    e.preventDefault();
    createSummary(
      {
        customerId: parseInt(form.customerId, 10),
        channel: form.channel,
        periodType: form.periodType,
        periodDate: form.periodDate,
      },
      {
        onSuccess: () => {
          toast.success('Activity summary generated');
          setShowForm(false);
        },
        onError: () => toast.error('Failed to generate summary'),
      },
    );
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Summary Records" value={summaries.length} format="number" icon={Layers} loading={isLoading} />
        <StatCard label="Total Transactions" value={totalTransactions} format="number" icon={RefreshCw} loading={isLoading} />
        <StatCard label="Total Amount" value={totalAmount} format="money" icon={DollarSign} loading={isLoading} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Activity Summaries</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/channels/activity-logs')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View Raw Logs
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
            >
              <Plus className="w-3 h-3" />
              Generate Summary
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleCreateSummary} className="p-4 border-b bg-muted/30">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer ID</label>
                <input
                  required
                  type="number"
                  className={inputCls}
                  value={form.customerId}
                  onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                  placeholder="123"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel</label>
                <select
                  className={inputCls}
                  value={form.channel}
                  onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                >
                  {['WEB', 'MOBILE', 'ATM', 'BRANCH', 'USSD', 'IVR'].map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Period Type</label>
                <select
                  className={inputCls}
                  value={form.periodType}
                  onChange={(e) => setForm((f) => ({ ...f, periodType: e.target.value }))}
                >
                  {['DAILY', 'WEEKLY', 'MONTHLY'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Period Date</label>
                <input
                  type="date"
                  required
                  className={inputCls}
                  value={form.periodDate}
                  onChange={(e) => setForm((f) => ({ ...f, periodDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Generate
              </button>
            </div>
          </form>
        )}

        <div className="p-4">
          <DataTable
            columns={summaryColumns}
            data={summaries}
            isLoading={isLoading}
            enableGlobalFilter
            emptyMessage="No activity summaries found"
            pageSize={15}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DigitalBankingPage() {
  const tabs = useMemo(
    () => [
      {
        id: 'internet-banking',
        label: 'Internet Banking',
        icon: Globe,
        content: <InternetBankingTab />,
      },
      {
        id: 'ussd',
        label: 'USSD Management',
        icon: Layers,
        content: <UssdMenuTab />,
      },
      {
        id: 'activity',
        label: 'Activity Analytics',
        icon: Shield,
        content: <ActivitySummariesTab />,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Digital Banking"
        subtitle="Internet banking portal management, USSD menu configuration, and channel activity analytics."
      />
      <div className="page-container space-y-6">
        <TabsPage tabs={tabs} defaultTab="internet-banking" />
      </div>
    </>
  );
}
