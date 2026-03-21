import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, X, Loader2, Users, Clock, Phone, HeadphonesIcon,
  CheckCircle2, AlertTriangle, Globe, Settings, Pencil, Power,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { contactCenterApi } from '../api/contactCenterApi';
import type { ContactCenter } from '../types/contactCenterExt';

const CENTER_TYPES = ['INBOUND', 'OUTBOUND', 'BLENDED', 'VIRTUAL', 'OFFSHORE'] as const;

const TYPE_COLORS: Record<string, string> = {
  INBOUND: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  OUTBOUND: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  BLENDED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  VIRTUAL: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  OFFSHORE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function CenterCard({ center, onEdit, onDeactivate }: { center: ContactCenter; onEdit: (c: ContactCenter) => void; onDeactivate: (c: ContactCenter) => void }) {
  const utilization = center.totalAgents > 0
    ? ((center.activeAgents / center.totalAgents) * 100).toFixed(0)
    : '0';

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{center.centerName}</h3>
            <p className="text-xs text-muted-foreground font-mono">{center.centerCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', TYPE_COLORS[center.centerType] ?? 'bg-gray-100 text-gray-600')}>
            {center.centerType}
          </span>
          {center.isActive ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Agents:</span>
          <span className="font-mono font-medium">{center.activeAgents}/{center.totalAgents}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Queue Cap:</span>
          <span className="font-mono font-medium">{center.queueCapacity}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Avg Wait:</span>
          <span className="font-mono font-medium">{center.avgWaitTimeSec}s</span>
        </div>
        <div className="flex items-center gap-2">
          <HeadphonesIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">AHT:</span>
          <span className="font-mono font-medium">{center.avgHandleTimeSec}s</span>
        </div>
      </div>

      {/* SLA / Service Level */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Service Level (target: {center.serviceLevelTarget}%)</span>
          <span className={cn(
            'font-bold font-mono',
            center.currentServiceLevel >= center.serviceLevelTarget ? 'text-green-600' : 'text-red-600',
          )}>
            {center.currentServiceLevel.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              center.currentServiceLevel >= center.serviceLevelTarget ? 'bg-green-500' : 'bg-red-500',
            )}
            style={{ width: `${Math.min(100, center.currentServiceLevel)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
        <div className="flex items-center gap-1">
          <Globe className="w-3 h-3" />
          <span>{center.timezone}</span>
        </div>
        <span>Utilization: <span className="font-mono font-medium text-foreground">{utilization}%</span></span>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={() => onEdit(center)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors flex-1 justify-center">
          <Pencil className="w-3 h-3" /> Edit
        </button>
        {center.isActive && (
          <button onClick={() => onDeactivate(center)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/10 transition-colors flex-1 justify-center">
            <Power className="w-3 h-3" /> Deactivate
          </button>
        )}
      </div>
    </div>
  );
}

function CreateCenterDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    centerCode: '',
    centerName: '',
    centerType: 'BLENDED' as string,
    timezone: 'Africa/Lagos',
    totalAgents: 0,
    queueCapacity: 50,
    serviceLevelTarget: 80,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    contactCenterApi.createCenter({
      ...form,
      operatingHours: { weekdays: '08:00-18:00', weekends: '09:00-14:00' },
      activeAgents: 0,
      avgWaitTimeSec: 0,
      avgHandleTimeSec: 0,
      currentServiceLevel: 0,
    } as Partial<ContactCenter>).then(() => {
      toast.success('Contact center created');
      qc.invalidateQueries({ queryKey: ['contact-center', 'centers'] });
      onClose();
    }).catch(() => toast.error('Failed to create center')).finally(() => setSubmitting(false));
  };

  const fc = 'w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" /> New Contact Center
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Center Code</label>
              <input className={fc} placeholder="CC-001" value={form.centerCode} onChange={(e) => setForm((f) => ({ ...f, centerCode: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Center Name</label>
              <input className={fc} placeholder="Main Branch CC" value={form.centerName} onChange={(e) => setForm((f) => ({ ...f, centerName: e.target.value }))} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <select className={fc} value={form.centerType} onChange={(e) => setForm((f) => ({ ...f, centerType: e.target.value }))}>
                {CENTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Timezone</label>
              <select className={fc} value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}>
                <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total Agents</label>
              <input type="number" min={0} className={fc} value={form.totalAgents} onChange={(e) => setForm((f) => ({ ...f, totalAgents: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Queue Capacity</label>
              <input type="number" min={1} className={fc} value={form.queueCapacity} onChange={(e) => setForm((f) => ({ ...f, queueCapacity: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">SLA Target %</label>
              <input type="number" min={0} max={100} className={fc} value={form.serviceLevelTarget} onChange={(e) => setForm((f) => ({ ...f, serviceLevelTarget: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
            <label htmlFor="isActive" className="text-sm font-medium">Active</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Center'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditCenterDialog({ center, onClose }: { center: ContactCenter; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    centerName: center.centerName,
    centerType: center.centerType,
    timezone: center.timezone,
    totalAgents: center.totalAgents ?? 0,
    queueCapacity: center.queueCapacity ?? 50,
    serviceLevelTarget: center.serviceLevelTarget ?? 80,
    isActive: center.isActive,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    contactCenterApi.updateCenter(center.id, form as Partial<ContactCenter>).then(() => {
      toast.success('Center updated');
      qc.invalidateQueries({ queryKey: ['contact-center', 'centers'] });
      onClose();
    }).catch(() => toast.error('Failed to update center')).finally(() => setSubmitting(false));
  };

  const fc = 'w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Pencil className="w-5 h-5" /> Edit Center
        </h2>
        <p className="text-xs text-muted-foreground mb-4 font-mono">{center.centerCode}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Center Name</label>
            <input className={fc} value={form.centerName} onChange={(e) => setForm((f) => ({ ...f, centerName: e.target.value }))} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <select className={fc} value={form.centerType} onChange={(e) => setForm((f) => ({ ...f, centerType: e.target.value }))}>
                {CENTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Timezone</label>
              <select className={fc} value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}>
                <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total Agents</label>
              <input type="number" min={0} className={fc} value={form.totalAgents} onChange={(e) => setForm((f) => ({ ...f, totalAgents: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Queue Capacity</label>
              <input type="number" min={1} className={fc} value={form.queueCapacity} onChange={(e) => setForm((f) => ({ ...f, queueCapacity: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">SLA Target %</label>
              <input type="number" min={0} max={100} className={fc} value={form.serviceLevelTarget} onChange={(e) => setForm((f) => ({ ...f, serviceLevelTarget: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="editIsActive" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
            <label htmlFor="editIsActive" className="text-sm font-medium">Active</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ContactCenterAdminPage() {
  useEffect(() => { document.title = 'Center Administration | CBS'; }, []);

  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editCenter, setEditCenter] = useState<ContactCenter | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ContactCenter | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const handleDeactivate = () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    contactCenterApi.deactivateCenter(deactivateTarget.id).then(() => {
      toast.success(`${deactivateTarget.centerName} deactivated`);
      qc.invalidateQueries({ queryKey: ['contact-center', 'centers'] });
      setDeactivateTarget(null);
    }).catch(() => toast.error('Failed to deactivate')).finally(() => setDeactivating(false));
  };

  const { data: centers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['contact-center', 'centers'],
    queryFn: () => contactCenterApi.getCenters(),
  });

  const activeCenters = centers.filter((c) => c.isActive);
  const totalAgents = centers.reduce((s, c) => s + (c.totalAgents ?? 0), 0);
  const activeAgents = centers.reduce((s, c) => s + (c.activeAgents ?? 0), 0);
  const avgSla = activeCenters.length > 0
    ? activeCenters.reduce((s, c) => s + (c.currentServiceLevel ?? 0), 0) / activeCenters.length
    : 0;

  if (isError) {
    return (
      <>
        <PageHeader title="Center Administration" subtitle="Manage contact center infrastructure" />
        <div className="page-container">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
            <p className="text-lg font-medium text-muted-foreground">Failed to load centers</p>
            <button onClick={() => refetch()} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showCreate && <CreateCenterDialog onClose={() => setShowCreate(false)} />}
      {editCenter && <EditCenterDialog center={editCenter} onClose={() => setEditCenter(null)} />}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setDeactivateTarget(null)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Deactivate Center
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to deactivate <strong>{deactivateTarget.centerName}</strong> ({deactivateTarget.centerCode})?
              Active agents will need to be reassigned.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeactivateTarget(null)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleDeactivate} disabled={deactivating}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Center Administration"
        subtitle="Manage contact center infrastructure and configuration"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New Center
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Centers" value={centers.length} format="number" icon={Building2} loading={isLoading} />
          <StatCard label="Active Centers" value={activeCenters.length} format="number" icon={CheckCircle2} loading={isLoading} />
          <StatCard label="Total Agents" value={`${activeAgents}/${totalAgents}`} icon={Users} loading={isLoading} />
          <StatCard label="Avg Service Level" value={`${avgSla.toFixed(1)}%`} icon={Settings} loading={isLoading} />
        </div>

        {/* Center Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : centers.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-muted-foreground">No contact centers configured</p>
            <p className="text-sm text-muted-foreground mt-1">Create a center to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              Create Center
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {centers.map((center) => (
              <CenterCard key={center.id} center={center} onEdit={setEditCenter} onDeactivate={setDeactivateTarget} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
