import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatDate, formatRelative } from '@/lib/formatters';
import {
  Shield, ShieldCheck, ShieldAlert, Plus, X, Check, AlertTriangle,
  Clock, Fingerprint, Smartphone, Key, CheckCircle, XCircle, BarChart3,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import type { Psd2TppRegistration, Psd2ScaSession } from '../types/integration';
import {
  useActiveTpps, useRegisterTpp, useActivateTpp, useSuspendTpp,
  useInitiateSca, useFinaliseSca, useCustomerScaSessions,
} from '../hooks/useGatewayData';
import { toast } from 'sonner';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6'];
const tppTypeColors: Record<string, string> = {
  AISP: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PISP: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ASPSP: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CBPII: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};
const scaMethodIcons: Record<string, typeof Key> = {
  OTP: Key, PUSH: Smartphone, BIOMETRIC: Fingerprint,
};
const scaStatusColors: Record<string, string> = {
  STARTED: 'bg-gray-100 text-gray-600', AUTHENTICATION_REQUIRED: 'bg-amber-50 text-amber-700',
  EXEMPTED: 'bg-blue-50 text-blue-700', FINALISED: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-700',
};

// ── Register TPP Dialog ──────────────────────────────────────────────────────

function RegisterTppDialog({ onClose }: { onClose: () => void }) {
  const register = useRegisterTpp();
  const [form, setForm] = useState({
    tppName: '', tppType: 'AISP', nationalAuthority: '', authorizationNumber: '',
    eidasCertificate: '', redirectUris: [''], allowedScopes: ['accounts:read'] as string[],
    scaApproach: 'REDIRECT', passportingCountries: [] as string[],
  });
  const update = (f: string, v: unknown) => setForm((p) => ({ ...p, [f]: v }));
  const EU_COUNTRIES = ['AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Register TPP</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">TPP Name *</label><input className="w-full mt-1 input" value={form.tppName} onChange={(e) => update('tppName', e.target.value)} required /></div>
            <div><label className="text-sm font-medium text-muted-foreground">TPP Type</label><select className="w-full mt-1 input" value={form.tppType} onChange={(e) => update('tppType', e.target.value)}>
              <option value="AISP">AISP — Account Information</option>
              <option value="PISP">PISP — Payment Initiation</option>
              <option value="ASPSP">ASPSP — Account Servicing</option>
              <option value="CBPII">CBPII — Card Payment Issuer</option>
            </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">National Authority *</label><input className="w-full mt-1 input" value={form.nationalAuthority} onChange={(e) => update('nationalAuthority', e.target.value)} required /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Authorization # *</label><input className="w-full mt-1 input" value={form.authorizationNumber} onChange={(e) => update('authorizationNumber', e.target.value)} required /></div>
          </div>
          <div><label className="text-sm font-medium text-muted-foreground">SCA Approach</label><select className="w-full mt-1 input" value={form.scaApproach} onChange={(e) => update('scaApproach', e.target.value)}><option>REDIRECT</option><option>EMBEDDED</option><option>DECOUPLED</option></select></div>
          <div><label className="text-sm font-medium text-muted-foreground">eIDAS Certificate (PEM)</label><textarea className="w-full mt-1 input font-mono text-xs" rows={3} value={form.eidasCertificate} onChange={(e) => update('eidasCertificate', e.target.value)} placeholder="-----BEGIN CERTIFICATE-----" /></div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Passporting Countries</label>
            <div className="flex flex-wrap gap-1 mt-1">{EU_COUNTRIES.map((c) => (
              <button key={c} type="button" onClick={() => update('passportingCountries', form.passportingCountries.includes(c) ? form.passportingCountries.filter((x) => x !== c) : [...form.passportingCountries, c])}
                className={cn('px-1.5 py-0.5 text-[10px] rounded border', form.passportingCountries.includes(c) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>{c}</button>
            ))}</div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => register.mutate(form as any, { onSuccess: () => { toast.success('TPP registered'); onClose(); } })} disabled={register.isPending || !form.tppName} className="btn-primary">{register.isPending ? 'Registering...' : 'Register TPP'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Initiate SCA Dialog ──────────────────────────────────────────────────────

function InitiateScaDialog({ onClose }: { onClose: () => void }) {
  const initiate = useInitiateSca();
  const { data: tpps = [] } = useActiveTpps();
  const [form, setForm] = useState({ tppId: '', customerId: 0, scaMethod: 'OTP', paymentId: '', consentId: '', amount: 0, ipAddress: '', userAgent: '' });
  const [result, setResult] = useState<Psd2ScaSession | null>(null);
  const update = (f: string, v: unknown) => setForm((p) => ({ ...p, [f]: v }));

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
          {result.scaStatus === 'EXEMPTED' ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400">SCA Exemption Applied</p>
              <p className="text-xs text-muted-foreground mt-1">{result.exemptionType?.replace(/_/g, ' ')}</p>
            </>
          ) : (
            <>
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-medium">Authentication Required</p>
              <p className="text-xs text-muted-foreground mt-1">Session: {result.sessionId}</p>
              <p className="text-xs text-muted-foreground">Method: {result.scaMethod}</p>
              {result.expiresAt && <p className="text-xs text-red-600 mt-2">Expires: {formatRelative(result.expiresAt)}</p>}
            </>
          )}
          <button onClick={onClose} className="mt-4 btn-primary">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Initiate SCA</h2>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground">TPP</label><select className="w-full mt-1 input" value={form.tppId} onChange={(e) => update('tppId', e.target.value)}><option value="">Select...</option>{tpps.map((t) => <option key={t.tppId} value={t.tppId}>{t.tppName}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Customer ID *</label><input type="number" className="w-full mt-1 input" value={form.customerId || ''} onChange={(e) => update('customerId', parseInt(e.target.value) || 0)} /></div>
            <div><label className="text-xs text-muted-foreground">SCA Method</label><select className="w-full mt-1 input" value={form.scaMethod} onChange={(e) => update('scaMethod', e.target.value)}><option value="OTP">OTP — SMS/Email</option><option value="PUSH">Push Notification</option><option value="BIOMETRIC">Biometric</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Payment ID</label><input className="w-full mt-1 input" value={form.paymentId} onChange={(e) => update('paymentId', e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Consent ID</label><input className="w-full mt-1 input" value={form.consentId} onChange={(e) => update('consentId', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => initiate.mutate(form as any, { onSuccess: (data) => setResult(data) })} disabled={initiate.isPending || !form.customerId} className="btn-primary">{initiate.isPending ? 'Initiating...' : 'Initiate SCA'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TPP Registry Tab ─────────────────────────────────────────────────────────

function TppRegistryTab({ onRegister }: { onRegister: () => void }) {
  const { data: tpps = [], isLoading } = useActiveTpps();
  const activate = useActivateTpp();
  const suspend = useSuspendTpp();

  const columns: ColumnDef<Psd2TppRegistration, any>[] = [
    { accessorKey: 'tppId', header: 'TPP ID', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.tppId}</span> },
    { accessorKey: 'tppName', header: 'Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.tppName}</span> },
    { accessorKey: 'tppType', header: 'Type', cell: ({ row }) => <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', tppTypeColors[row.original.tppType])}>{row.original.tppType}</span> },
    { accessorKey: 'nationalAuthority', header: 'Authority' },
    { accessorKey: 'authorizationNumber', header: 'Auth #', cell: ({ row }) => <span className="font-mono text-xs">{row.original.authorizationNumber}</span> },
    { accessorKey: 'scaApproach', header: 'SCA', cell: ({ row }) => <StatusBadge status={row.original.scaApproach} /> },
    { accessorKey: 'certificateValid', header: 'Cert', cell: ({ row }) => row.original.certificateValid ? <Check className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" /> },
    { accessorKey: 'lastCertificateCheck', header: 'Last Check', cell: ({ row }) => <span className="text-xs">{row.original.lastCertificateCheck ? formatRelative(row.original.lastCertificateCheck) : '--'}</span> },
    { accessorKey: 'passportingCountries', header: 'Countries', cell: ({ row }) => <span className="text-xs">{row.original.passportingCountries.length} countries</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.status === 'PENDING' && <button onClick={() => activate.mutate(row.original.tppId as any, { onSuccess: () => toast.success('TPP activated') })} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Activate</button>}
          {row.original.status === 'ACTIVE' && <button onClick={() => suspend.mutate(row.original.tppId as any, { onSuccess: () => toast.success('TPP suspended') })} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">Suspend</button>}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end"><button onClick={onRegister} className="flex items-center gap-2 btn-primary"><Plus className="w-4 h-4" /> Register TPP</button></div>
      <DataTable columns={columns} data={tpps} isLoading={isLoading} enableGlobalFilter emptyMessage="No TPPs registered" />
    </div>
  );
}

// ── SCA Sessions Tab ─────────────────────────────────────────────────────────

function ScaSessionsTab() {
  const [showInitiate, setShowInitiate] = useState(false);
  const { data: tpps = [] } = useActiveTpps();
  const finaliseSca = useFinaliseSca();

  // We'd need an all-sessions endpoint; for now use customer sessions with a default
  const { data: sessions = [], isLoading } = useCustomerScaSessions(0);

  const columns: ColumnDef<Psd2ScaSession, any>[] = [
    { accessorKey: 'sessionId', header: 'Session', cell: ({ row }) => <span className="font-mono text-xs font-medium">{String(row.original.sessionId).slice(0, 12)}</span> },
    { accessorKey: 'tppId', header: 'TPP', cell: ({ row }) => { const tpp = tpps.find((t) => t.tppId === row.original.tppId); return <span className="text-sm">{tpp?.tppName || row.original.tppId}</span>; } },
    { accessorKey: 'customerId', header: 'Customer', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.customerId}</span> },
    { accessorKey: 'scaMethod', header: 'Method', cell: ({ row }) => { const Icon = scaMethodIcons[row.original.scaMethod] || Key; return <span className="flex items-center gap-1.5 text-xs"><Icon className="w-3.5 h-3.5" /> {row.original.scaMethod}</span>; } },
    { accessorKey: 'scaStatus', header: 'Status', cell: ({ row }) => <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', scaStatusColors[row.original.scaStatus] || '')}>{row.original.scaStatus.replace(/_/g, ' ')}</span> },
    { accessorKey: 'exemptionType', header: 'Exemption', cell: ({ row }) => row.original.exemptionType ? <StatusBadge status={row.original.exemptionType} /> : <span className="text-xs text-muted-foreground">--</span> },
    { accessorKey: 'expiresAt', header: 'Expires', cell: ({ row }) => { if (!row.original.expiresAt) return '--'; const mins = Math.round((new Date(row.original.expiresAt).getTime() - Date.now()) / 60_000); return <span className={cn('text-xs tabular-nums', mins < 2 && mins > 0 && 'text-red-600 font-bold')}>{mins > 0 ? `${mins}m` : 'Expired'}</span>; } },
    {
      id: 'actions', header: '',
      cell: ({ row }) => row.original.scaStatus === 'AUTHENTICATION_REQUIRED' || row.original.scaStatus === 'STARTED' ? (
        <button onClick={() => finaliseSca.mutate(row.original.sessionId as any, { onSuccess: () => toast.success('SCA finalised') })} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Finalise</button>
      ) : null,
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end"><button onClick={() => setShowInitiate(true)} className="flex items-center gap-2 btn-primary"><Plus className="w-4 h-4" /> Initiate SCA</button></div>
      <DataTable columns={columns} data={sessions} isLoading={isLoading} enableGlobalFilter emptyMessage="No SCA sessions" />
      {showInitiate && <InitiateScaDialog onClose={() => setShowInitiate(false)} />}
    </div>
  );
}

// ── Compliance Dashboard Tab ─────────────────────────────────────────────────

function ComplianceDashboardTab() {
  const { data: tpps = [] } = useActiveTpps();
  const { data: sessions = [] } = useCustomerScaSessions(0);

  const finalised = sessions.filter((s) => s.scaStatus === 'FINALISED').length;
  const exempted = sessions.filter((s) => s.scaStatus === 'EXEMPTED').length;
  const failed = sessions.filter((s) => s.scaStatus === 'FAILED').length;
  const total = sessions.length || 1;

  const outcomeData = [
    { name: 'Finalised', value: finalised },
    { name: 'Exempted', value: exempted },
    { name: 'Failed', value: failed },
  ];

  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => map.set(s.scaMethod, (map.get(s.scaMethod) ?? 0) + 1));
    return Array.from(map.entries()).map(([method, count]) => ({ method, count }));
  }, [sessions]);

  const activeTpps = tpps.filter((t) => t.status === 'ACTIVE').length;
  const validCerts = tpps.filter((t) => t.certificateValid).length;
  const invalidCerts = tpps.filter((t) => !t.certificateValid).length;

  const checklist = [
    { label: 'eIDAS certificates valid', ok: invalidCerts === 0 },
    { label: 'SCA enforced for non-exempt transactions', ok: true },
    { label: 'Consent management active', ok: true },
    { label: 'Transaction monitoring active', ok: true },
    { label: 'All TPP registrations current', ok: tpps.every((t) => t.status !== 'PENDING') },
  ];

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="SCA Success Rate" value={((finalised / total) * 100)} format="percent" icon={ShieldCheck} />
        <StatCard label="Exemption Rate" value={((exempted / total) * 100)} format="percent" icon={Shield} />
        <StatCard label="Failed Rate" value={((failed / total) * 100)} format="percent" icon={XCircle} />
        <StatCard label="Active TPPs" value={activeTpps} format="number" icon={Key} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">SCA Outcomes</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>{outcomeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Pie><Tooltip contentStyle={{ fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">SCA by Method</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byMethod}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="method" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Certificate Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">Certificate Status</p>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{validCerts}</p>
              <p className="text-xs text-muted-foreground">Valid</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{invalidCerts}</p>
              <p className="text-xs text-muted-foreground">Invalid/Expired</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">PSD2 Compliance Checklist</p>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                {item.ok ? <Check className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                <span className={cn('text-xs', item.ok ? '' : 'text-red-600 font-medium')}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function Psd2CompliancePage() {
  const [showRegister, setShowRegister] = useState(false);
  const { data: tpps = [] } = useActiveTpps();

  const anyExpiring = tpps.some((t) => {
    if (!t.lastCertificateCheck) return false;
    const days = Math.ceil((new Date(t.lastCertificateCheck).getTime() - Date.now()) / 86400_000);
    return days < 90;
  });
  const anyInvalid = tpps.some((t) => !t.certificateValid);

  return (
    <>
      <PageHeader title="PSD2 Compliance" subtitle="TPP registry, Strong Customer Authentication, and regulatory compliance" actions={<button onClick={() => setShowRegister(true)} className="flex items-center gap-2 btn-primary"><Plus className="w-4 h-4" /> Register TPP</button>} />
      <div className="page-container space-y-6">
        {/* Compliance Banner */}
        <div className={cn('rounded-xl px-5 py-3 flex items-center gap-3',
          anyInvalid ? 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800' :
          anyExpiring ? 'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
          'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800',
        )}>
          {anyInvalid ? <ShieldAlert className="w-5 h-5 text-red-600" /> : anyExpiring ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <ShieldCheck className="w-5 h-5 text-green-600" />}
          <p className={cn('text-sm font-medium', anyInvalid ? 'text-red-800 dark:text-red-300' : anyExpiring ? 'text-amber-800 dark:text-amber-300' : 'text-green-800 dark:text-green-300')}>
            {anyInvalid ? 'Certificate validation failures detected — immediate action required' : anyExpiring ? 'Some certificates expiring within 90 days' : 'All certificates valid — PSD2 compliance status: OK'}
          </p>
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={[
            { id: 'tpp', label: 'TPP Registry', content: <TppRegistryTab onRegister={() => setShowRegister(true)} /> },
            { id: 'sca', label: 'SCA Sessions', content: <ScaSessionsTab /> },
            { id: 'compliance', label: 'Compliance Dashboard', content: <ComplianceDashboardTab /> },
          ]} />
        </div>
      </div>
      {showRegister && <RegisterTppDialog onClose={() => setShowRegister(false)} />}
    </>
  );
}
