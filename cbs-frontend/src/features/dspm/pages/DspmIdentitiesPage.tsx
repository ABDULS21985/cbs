import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { useDspmIdentities, useCreateDspmIdentity } from '../hooks/useDspm';
import type { DspmIdentity } from '../types/dspm';
import { toRiskScore } from '../types/dspm';

const IDENTITY_TYPES = ['USER', 'SERVICE_ACCOUNT', 'APPLICATION', 'ADMIN', 'API_KEY'] as const;
const ACCESS_LEVELS = ['READ', 'WRITE', 'ADMIN', 'READ_WRITE', 'NONE'] as const;

function RegisterIdentityDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<DspmIdentity>) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    identityName: '',
    identityType: 'USER',
    email: '',
    department: '',
    role: '',
    accessLevel: 'READ',
  });

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const cls = 'w-full px-3 py-2 border rounded-md text-sm bg-background';

  const handleSubmit = () => {
    if (!form.identityName.trim()) {
      toast.error('Identity name is required');
      return;
    }
    onSubmit({
      identityName: form.identityName,
      identityType: form.identityType,
      email: form.email || undefined,
      department: form.department || undefined,
      role: form.role || undefined,
      accessLevel: form.accessLevel,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Register Identity</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.identityName} onChange={e => set('identityName', e.target.value)} placeholder="e.g. John Smith" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <select value={form.identityType} onChange={e => set('identityType', e.target.value)} className={cn(cls, 'mt-1')}>
                {IDENTITY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <Label>Access Level</Label>
              <select value={form.accessLevel} onChange={e => set('accessLevel', e.target.value)} className={cn(cls, 'mt-1')}>
                {ACCESS_LEVELS.map(l => <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@example.com" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Department</Label>
              <Input value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Finance" className="mt-1" />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Analyst" className="mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DspmIdentitiesPage() {
  useEffect(() => { document.title = 'DSPM Identities | CBS'; }, []);
  const navigate = useNavigate();
  const [showRegister, setShowRegister] = useState(false);
  const { data: identities = [], isLoading } = useDspmIdentities();
  const createMutation = useCreateDspmIdentity();

  const handleCreate = (data: Partial<DspmIdentity>) => {
    createMutation.mutate(data, {
      onSuccess: () => { toast.success('Identity registered'); setShowRegister(false); },
      onError: () => toast.error('Failed to register identity'),
    });
  };

  const active = identities.filter(i => i.status === 'ACTIVE').length;
  const highRisk = identities.filter(i => toRiskScore(i.riskScore) >= 70).length;

  const columns: ColumnDef<DspmIdentity, unknown>[] = [
    { accessorKey: 'identityCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs text-primary font-medium">{row.original.identityCode}</span> },
    { accessorKey: 'identityName', header: 'Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.identityName}</span> },
    { accessorKey: 'identityType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.identityType} /> },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => <span className="text-xs">{row.original.email || '—'}</span> },
    { accessorKey: 'department', header: 'Department', cell: ({ row }) => <span className="text-xs">{row.original.department || '—'}</span> },
    { accessorKey: 'accessLevel', header: 'Access', cell: ({ row }) => <StatusBadge status={row.original.accessLevel} /> },
    { accessorKey: 'riskScore', header: 'Risk', cell: ({ row }) => {
      const rs = toRiskScore(row.original.riskScore);
      return (
        <span className={cn('text-xs font-mono font-bold',
          rs >= 70 ? 'text-red-600' : rs >= 40 ? 'text-amber-600' : 'text-green-600'
        )}>{rs.toFixed(0)}</span>
      );
    }},
    { accessorKey: 'dataSourcesCount', header: 'Sources', cell: ({ row }) => <span className="text-xs font-mono">{row.original.dataSourcesCount}</span> },
    { accessorKey: 'lastAccessAt', header: 'Last Access', cell: ({ row }) => <span className="text-xs">{row.original.lastAccessAt ? formatRelative(row.original.lastAccessAt) : '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ];

  return (
    <>
      <PageHeader
        title="Data Identities"
        subtitle="Track users and services accessing sensitive data"
        actions={
          <Button onClick={() => setShowRegister(true)}>
            <Plus className="w-4 h-4 mr-1" /> Register Identity
          </Button>
        }
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Identities" value={identities.length} format="number" icon={Users} loading={isLoading} />
          <StatCard label="Active" value={active} format="number" icon={Users} loading={isLoading} />
          <StatCard label="High Risk" value={highRisk} format="number" icon={AlertTriangle} loading={isLoading} />
          <StatCard label="Avg Risk Score" value={identities.length > 0 ? (identities.reduce((s, i) => s + toRiskScore(i.riskScore), 0) / identities.length).toFixed(0) : '—'} loading={isLoading} />
        </div>
        <DataTable
          columns={columns}
          data={identities}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="dspm-identities"
          emptyMessage="No identities tracked"
          onRowClick={(row) => navigate(`/dspm/identities/${row.identityCode}`)}
        />
      </div>

      {showRegister && (
        <RegisterIdentityDialog
          open
          onClose={() => setShowRegister(false)}
          onSubmit={handleCreate}
          isSubmitting={createMutation.isPending}
        />
      )}
    </>
  );
}
