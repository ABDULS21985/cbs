import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, MapPin, Globe, Plus, Pencil, XCircle, ChevronDown, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, ConfirmDialog, InfoGrid } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { branchOpsApi } from '../api/branchOpsApi';
import { branchesApi } from '../api/branchAdminApi';
import type { Branch } from '../types/branch';

// ─── Branch Type ────────────────────────────────────────────────────────────────

type BranchType = 'HEAD_OFFICE' | 'REGIONAL' | 'BRANCH' | 'SUB_BRANCH' | 'AGENCY' | 'DIGITAL';

const BRANCH_TYPES: BranchType[] = ['HEAD_OFFICE', 'REGIONAL', 'BRANCH', 'SUB_BRANCH', 'AGENCY', 'DIGITAL'];

const BRANCH_TYPE_COLORS: Record<BranchType, string> = {
  HEAD_OFFICE: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  REGIONAL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  BRANCH: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SUB_BRANCH: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  AGENCY: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DIGITAL: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function BranchTypeBadge({ type }: { type: string }) {
  const colorClass = BRANCH_TYPE_COLORS[type as BranchType] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colorClass)}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Form Initial State ─────────────────────────────────────────────────────────

interface BranchFormState {
  branchCode: string;
  branchName: string;
  branchType: BranchType;
  parentBranchCode: string;
  regionCode: string;
  city: string;
  stateProvince: string;
  countryCode: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  managerName: string;
  managerEmployeeId: string;
  operatingHours: string;
  currencyCode: string;
}

const INITIAL_FORM: BranchFormState = {
  branchCode: '',
  branchName: '',
  branchType: 'BRANCH',
  parentBranchCode: '',
  regionCode: '',
  city: '',
  stateProvince: '',
  countryCode: 'NG',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  phoneNumber: '',
  email: '',
  managerName: '',
  managerEmployeeId: '',
  operatingHours: '08:00-16:00',
  currencyCode: 'NGN',
};

// ─── Branch Detail Panel ────────────────────────────────────────────────────────

function BranchDetailPanel({ branch, allBranches }: { branch: Branch; allBranches: Branch[] }) {
  const childBranches = allBranches.filter((b) => b.parentBranchCode === branch.branchCode);

  const items = [
    { label: 'Branch Code', value: branch.branchCode, mono: true, copyable: true },
    { label: 'Branch Name', value: branch.branchName },
    { label: 'Type', value: <BranchTypeBadge type={branch.branchType} /> },
    { label: 'Parent Branch', value: branch.parentBranchCode || '-', mono: true },
    { label: 'Region', value: branch.regionCode },
    { label: 'Address', value: [branch.addressLine1, branch.addressLine2].filter(Boolean).join(', ') || '-' },
    { label: 'City', value: branch.city },
    { label: 'State/Province', value: branch.stateProvince },
    { label: 'Country', value: branch.countryCode },
    { label: 'Postal Code', value: branch.postalCode || '-' },
    { label: 'Phone', value: branch.phoneNumber || '-' },
    { label: 'Email', value: branch.email || '-' },
    { label: 'Manager', value: branch.managerName || '-' },
    { label: 'Manager ID', value: branch.managerEmployeeId || '-', mono: true },
    { label: 'Operating Hours', value: branch.operatingHours || '-' },
    { label: 'Currency', value: branch.currencyCode },
    { label: 'Opened', value: branch.openedDate ? formatDate(branch.openedDate) : '-' },
    { label: 'Status', value: branch.isActive ? 'Active' : 'Closed' },
  ];

  return (
    <div className="p-4 space-y-4">
      <InfoGrid items={items} columns={4} />
      {childBranches.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Child Branches ({childBranches.length})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {childBranches.map((child) => (
              <div key={child.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{child.branchCode}</span>
                <span className="font-medium">{child.branchName}</span>
                <BranchTypeBadge type={child.branchType} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Register / Edit Dialog ─────────────────────────────────────────────────────

function BranchFormDialog({
  open,
  onClose,
  initialData,
  onSubmit,
  isLoading,
  title,
}: {
  open: boolean;
  onClose: () => void;
  initialData: BranchFormState;
  onSubmit: (data: BranchFormState) => void;
  isLoading: boolean;
  title: string;
}) {
  const [form, setForm] = useState<BranchFormState>(initialData);

  const handleChange = (field: keyof BranchFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (!open) return null;

  const fields: { key: keyof BranchFormState; label: string; type?: 'select' | 'text'; options?: string[] }[] = [
    { key: 'branchCode', label: 'Branch Code' },
    { key: 'branchName', label: 'Branch Name' },
    { key: 'branchType', label: 'Branch Type', type: 'select', options: BRANCH_TYPES as unknown as string[] },
    { key: 'parentBranchCode', label: 'Parent Branch Code' },
    { key: 'regionCode', label: 'Region Code' },
    { key: 'city', label: 'City' },
    { key: 'stateProvince', label: 'State / Province' },
    { key: 'countryCode', label: 'Country Code' },
    { key: 'addressLine1', label: 'Address Line 1' },
    { key: 'addressLine2', label: 'Address Line 2' },
    { key: 'postalCode', label: 'Postal Code' },
    { key: 'phoneNumber', label: 'Phone Number' },
    { key: 'email', label: 'Email' },
    { key: 'managerName', label: 'Manager Name' },
    { key: 'managerEmployeeId', label: 'Manager Employee ID' },
    { key: 'operatingHours', label: 'Operating Hours' },
    { key: 'currencyCode', label: 'Currency Code' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={form[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {f.options?.map((o) => (
                      <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(form)}
              disabled={isLoading || !form.branchCode || !form.branchName}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function BranchNetworkPage() {
  const queryClient = useQueryClient();

  // State
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [closeBranch, setCloseBranch] = useState<Branch | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterRegion, setFilterRegion] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Data
  const { data: rawBranches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchOpsApi.getBranches(),
    staleTime: 30_000,
  });

  // Map branchOpsApi.Branch to the full Branch type for display
  const branches: Branch[] = useMemo(() =>
    rawBranches.map((b) => ({
      id: Number(b.id),
      branchCode: b.code,
      branchName: b.name,
      branchType: (b.status === 'HEAD_OFFICE' ? 'HEAD_OFFICE' : 'BRANCH') as BranchType,
      parentBranchCode: '',
      regionCode: b.state ?? '',
      addressLine1: '',
      addressLine2: '',
      city: b.city ?? '',
      stateProvince: b.state ?? '',
      postalCode: '',
      countryCode: 'NG',
      latitude: 0,
      longitude: 0,
      phoneNumber: '',
      email: '',
      managerName: '',
      managerEmployeeId: '',
      operatingHours: '',
      servicesOffered: [],
      currencyCode: 'NGN',
      isActive: b.status === 'ACTIVE' || b.status !== 'CLOSED',
      openedDate: '',
      metadata: {},
    })),
  [rawBranches]);

  // Filters
  const regions = useMemo(() => {
    const set = new Set(branches.map((b) => b.regionCode).filter(Boolean));
    return Array.from(set).sort();
  }, [branches]);

  const filtered = useMemo(() => {
    let list = branches;
    if (filterType !== 'ALL') list = list.filter((b) => b.branchType === filterType);
    if (filterRegion !== 'ALL') list = list.filter((b) => b.regionCode === filterRegion);
    if (filterStatus !== 'ALL') {
      list = list.filter((b) => (filterStatus === 'ACTIVE' ? b.isActive : !b.isActive));
    }
    return list;
  }, [branches, filterType, filterRegion, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    BRANCH_TYPES.forEach((t) => { byType[t] = 0; });
    let active = 0;
    let closed = 0;
    branches.forEach((b) => {
      byType[b.branchType] = (byType[b.branchType] ?? 0) + 1;
      if (b.isActive) active++;
      else closed++;
    });
    return { total: branches.length, byType, active, closed };
  }, [branches]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Branch> }) => branchesApi.update(id, data),
    onSuccess: () => {
      toast.success('Branch updated successfully');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setEditBranch(null);
    },
    onError: () => {
      toast.error('Failed to update branch');
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: number) => branchesApi.close(id),
    onSuccess: () => {
      toast.success('Branch closed successfully');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setCloseBranch(null);
    },
    onError: () => {
      toast.error('Failed to close branch');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: Partial<Branch>) => branchesApi.update(0, data),
    onSuccess: () => {
      toast.success('Branch registered successfully');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setRegisterOpen(false);
    },
    onError: () => {
      toast.error('Failed to register branch');
    },
  });

  // Columns
  const columns: ColumnDef<Branch, unknown>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedId(expandedId === row.original.id ? null : row.original.id);
          }}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          {expandedId === row.original.id ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      ),
      size: 40,
    },
    {
      accessorKey: 'branchCode',
      header: 'Branch Code',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.branchCode}</span>,
    },
    {
      accessorKey: 'branchName',
      header: 'Branch Name',
      cell: ({ row }) => <span className="font-semibold text-sm">{row.original.branchName}</span>,
    },
    {
      accessorKey: 'branchType',
      header: 'Type',
      cell: ({ row }) => <BranchTypeBadge type={row.original.branchType} />,
    },
    {
      accessorKey: 'parentBranchCode',
      header: 'Parent Branch',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.parentBranchCode || '-'}</span>
      ),
    },
    {
      accessorKey: 'regionCode',
      header: 'Region',
      cell: ({ row }) => <span className="text-sm">{row.original.regionCode || '-'}</span>,
    },
    {
      accessorKey: 'city',
      header: 'City',
      cell: ({ row }) => <span className="text-sm">{row.original.city || '-'}</span>,
    },
    {
      accessorKey: 'managerName',
      header: 'Manager',
      cell: ({ row }) => <span className="text-sm">{row.original.managerName || '-'}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'CLOSED'} dot />
      ),
    },
    {
      accessorKey: 'openedDate',
      header: 'Opened Date',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.openedDate ? formatDate(row.original.openedDate) : '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditBranch(row.original);
            }}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Edit Branch"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {row.original.isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCloseBranch(row.original);
              }}
              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-600"
              title="Close Branch"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
      size: 80,
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Branch Network"
        subtitle="Manage branch hierarchy, registrations, and network structure"
        actions={
          <button
            onClick={() => setRegisterOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Branch
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 px-6 mt-4">
        <StatCard label="Total Branches" value={stats.total} format="number" icon={Building2} loading={isLoading} />
        <StatCard label="Active" value={stats.active} format="number" icon={Globe} loading={isLoading} />
        <StatCard label="Closed" value={stats.closed} format="number" icon={XCircle} loading={isLoading} />
        <StatCard label="Regions" value={regions.length} format="number" icon={MapPin} loading={isLoading} />
        <StatCard
          label="Branch Types"
          value={BRANCH_TYPES.map((t) => `${t.replace(/_/g, ' ')}: ${stats.byType[t] ?? 0}`).join(', ')}
          loading={isLoading}
        />
      </div>

      {/* Type breakdown */}
      {!isLoading && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 px-6 mt-3">
          {BRANCH_TYPES.map((t) => (
            <div key={t} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <BranchTypeBadge type={t} />
              <span className="text-sm font-mono font-semibold">{stats.byType[t] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-6 mt-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="block rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Types</option>
            {BRANCH_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Region</label>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="block rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 mt-4">
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          enableGlobalFilter
          emptyMessage="No branches found"
          pageSize={15}
          onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
        />

        {/* Expanded detail panel */}
        {expandedId !== null && (
          <div className="mt-2 rounded-xl border bg-muted/20 overflow-hidden">
            {(() => {
              const branch = branches.find((b) => b.id === expandedId);
              if (!branch) return null;
              return <BranchDetailPanel branch={branch} allBranches={branches} />;
            })()}
          </div>
        )}
      </div>

      {/* Register Branch Dialog */}
      <BranchFormDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        initialData={INITIAL_FORM}
        onSubmit={(data) => registerMutation.mutate(data as unknown as Partial<Branch>)}
        isLoading={registerMutation.isPending}
        title="Register New Branch"
      />

      {/* Edit Branch Dialog */}
      {editBranch && (
        <BranchFormDialog
          open={!!editBranch}
          onClose={() => setEditBranch(null)}
          initialData={{
            branchCode: editBranch.branchCode,
            branchName: editBranch.branchName,
            branchType: editBranch.branchType as BranchType,
            parentBranchCode: editBranch.parentBranchCode,
            regionCode: editBranch.regionCode,
            city: editBranch.city,
            stateProvince: editBranch.stateProvince,
            countryCode: editBranch.countryCode,
            addressLine1: editBranch.addressLine1,
            addressLine2: editBranch.addressLine2,
            postalCode: editBranch.postalCode,
            phoneNumber: editBranch.phoneNumber,
            email: editBranch.email,
            managerName: editBranch.managerName,
            managerEmployeeId: editBranch.managerEmployeeId,
            operatingHours: editBranch.operatingHours,
            currencyCode: editBranch.currencyCode,
          }}
          onSubmit={(data) => updateMutation.mutate({ id: editBranch.id, data: data as unknown as Partial<Branch> })}
          isLoading={updateMutation.isPending}
          title={`Edit Branch: ${editBranch.branchName}`}
        />
      )}

      {/* Close Branch Confirm */}
      <ConfirmDialog
        open={!!closeBranch}
        onClose={() => setCloseBranch(null)}
        onConfirm={async () => {
          if (closeBranch) await closeMutation.mutateAsync(closeBranch.id);
        }}
        title="Close Branch"
        description={`Are you sure you want to close branch "${closeBranch?.branchName}" (${closeBranch?.branchCode})? This action cannot be undone.`}
        confirmLabel="Close Branch"
        variant="destructive"
        isLoading={closeMutation.isPending}
      />
    </div>
  );
}
