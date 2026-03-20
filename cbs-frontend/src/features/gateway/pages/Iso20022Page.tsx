import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  FileCode, CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronRight, Send, Search, Loader2, X,
  ArrowRight, Code, Database,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage, EmptyState } from '@/components/shared';
import { formatMoney, formatDate, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useIso20022Ingest,
  useIso20022UpdateStatus,
  useIso20022MessagesByStatus,
  useIso20022CodeSet,
  useIso20022CodeLookup,
  useSwiftMigrationMapping,
} from '../hooks/useGatewayData';
import type { Iso20022Message, Iso20022CodeSet } from '../types/integration';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFINITION_COLORS: Record<string, string> = {
  'pacs.008': 'bg-blue-100 text-blue-700', 'pacs.009': 'bg-blue-100 text-blue-700',
  'pacs.002': 'bg-indigo-100 text-indigo-700', 'pacs.004': 'bg-indigo-100 text-indigo-700',
  'camt.053': 'bg-green-100 text-green-700', 'camt.054': 'bg-green-100 text-green-700',
  'camt.056': 'bg-amber-100 text-amber-700',
  'pain.001': 'bg-purple-100 text-purple-700', 'pain.008': 'bg-purple-100 text-purple-700',
  'sese.023': 'bg-teal-100 text-teal-700',
};

const CATEGORY_COLORS: Record<string, string> = {
  PAYMENTS: 'bg-blue-100 text-blue-700', CASH_MANAGEMENT: 'bg-green-100 text-green-700',
  SECURITIES: 'bg-teal-100 text-teal-700', TRADE_FINANCE: 'bg-amber-100 text-amber-700',
};

const VALIDATION_COLORS: Record<string, string> = {
  VALID: 'bg-green-100 text-green-700', PENDING: 'bg-amber-100 text-amber-700',
  SCHEMA_ERROR: 'bg-red-100 text-red-700', BUSINESS_ERROR: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-gray-100 text-gray-700', VALIDATED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', PROCESSING: 'bg-blue-100 text-blue-700',
  SETTLED: 'bg-green-100 text-green-700',
};

const MSG_DEFINITIONS = [
  'pacs.008.001.10', 'pacs.002.001.12', 'pacs.004.001.11', 'pacs.009.001.10',
  'pain.001.001.11', 'pain.008.001.10',
  'camt.053.001.11', 'camt.054.001.11', 'camt.056.001.10',
];

const SWIFT_MIGRATION = [
  { mt: 'MT103', iso: 'pacs.008.001.10', desc: 'Single Customer Credit Transfer' },
  { mt: 'MT202', iso: 'pacs.009.001.10', desc: 'FI-to-FI Credit Transfer' },
  { mt: 'MT900/910', iso: 'camt.054.001.11', desc: 'Debit/Credit Confirmation' },
  { mt: 'MT940/950', iso: 'camt.053.001.11', desc: 'Account Statement' },
  { mt: 'MT199/192', iso: 'camt.056.001.10', desc: 'Cancellation Request' },
  { mt: 'MT101', iso: 'pain.001.001.11', desc: 'Request for Transfer' },
  { mt: 'MT104', iso: 'pain.008.001.10', desc: 'Direct Debit' },
];

function getDefColor(def: string): string {
  const prefix = def?.split('.').slice(0, 2).join('.') ?? '';
  return DEFINITION_COLORS[prefix] ?? 'bg-gray-100 text-gray-700';
}

// ─── Ingest Dialog ──────────────────────────────────────────────────────────

function IngestDialog({ onClose }: { onClose: () => void }) {
  const ingest = useIso20022Ingest();
  const fc = 'w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 border-border';
  const [form, setForm] = useState({
    messageDefinition: 'pacs.008.001.10', direction: 'INBOUND',
    senderBic: '', receiverBic: '', numberOfTxns: 1,
    totalAmount: 0, currency: 'NGN', xmlPayload: '',
    settlementMethod: 'CLRG', settlementDate: new Date().toISOString().split('T')[0],
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-1">Ingest ISO 20022 Message</h2>
        <p className="text-sm text-muted-foreground mb-4">Submit an XML message for processing</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Definition</label>
              <select className={cn(fc, 'mt-1')} value={form.messageDefinition} onChange={(e) => setForm((f) => ({ ...f, messageDefinition: e.target.value }))}>
                {MSG_DEFINITIONS.map((d) => <option key={d}>{d}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Direction</label>
              <select className={cn(fc, 'mt-1')} value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}>
                <option>INBOUND</option><option>OUTBOUND</option>
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Sender BIC</label>
              <input className={cn(fc, 'mt-1 font-mono uppercase')} maxLength={11} placeholder="ABCDEFGHXXX" value={form.senderBic} onChange={(e) => setForm((f) => ({ ...f, senderBic: e.target.value.toUpperCase() }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Receiver BIC</label>
              <input className={cn(fc, 'mt-1 font-mono uppercase')} maxLength={11} placeholder="XYZDEFGHXXX" value={form.receiverBic} onChange={(e) => setForm((f) => ({ ...f, receiverBic: e.target.value.toUpperCase() }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Transactions</label>
              <input type="number" className={cn(fc, 'mt-1')} value={form.numberOfTxns} onChange={(e) => setForm((f) => ({ ...f, numberOfTxns: parseInt(e.target.value) || 1 }))} min={1} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Amount</label>
              <input type="number" className={cn(fc, 'mt-1')} value={form.totalAmount || ''} onChange={(e) => setForm((f) => ({ ...f, totalAmount: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Currency</label>
              <select className={cn(fc, 'mt-1')} value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}
              </select></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">XML Payload</label>
            <textarea className={cn(fc, 'mt-1 h-32 resize-y font-mono text-xs')} placeholder="<Document xmlns='urn:iso:std:iso:20022:...'>" value={form.xmlPayload} onChange={(e) => setForm((f) => ({ ...f, xmlPayload: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Settlement Method</label>
              <select className={cn(fc, 'mt-1')} value={form.settlementMethod} onChange={(e) => setForm((f) => ({ ...f, settlementMethod: e.target.value }))}>
                <option value="CLRG">Clearing</option><option value="INDA">Direct</option><option value="INGA">Indirect</option>
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Settlement Date</label>
              <input type="date" className={cn(fc, 'mt-1')} value={form.settlementDate} onChange={(e) => setForm((f) => ({ ...f, settlementDate: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => ingest.mutate(form as unknown as Partial<Iso20022Message>, {
              onSuccess: () => { toast.success('Message ingested'); onClose(); },
              onError: () => toast.error('Ingestion failed'),
            })} disabled={ingest.isPending} className="btn-primary flex items-center gap-2">
              {ingest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {ingest.isPending ? 'Ingesting...' : 'Ingest'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Iso20022Page() {
  useEffect(() => { document.title = 'ISO 20022 | CBS'; }, []);

  const [showIngest, setShowIngest] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [codeSetName, setCodeSetName] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [lookupCodeSet, setLookupCodeSet] = useState('');

  // Fetch messages by various statuses
  const { data: receivedMsgs = [] } = useIso20022MessagesByStatus('RECEIVED');
  const { data: validatedMsgs = [] } = useIso20022MessagesByStatus('VALIDATED');
  const { data: processingMsgs = [] } = useIso20022MessagesByStatus('PROCESSING');
  const { data: rejectedMsgs = [] } = useIso20022MessagesByStatus('REJECTED');
  const allMessages = [...receivedMsgs, ...validatedMsgs, ...processingMsgs, ...rejectedMsgs];

  const { data: codeSetData = [] } = useIso20022CodeSet(codeSetName);
  const { data: lookupResult } = useIso20022CodeLookup(lookupCodeSet, lookupCode);

  // Message columns
  const msgCols: ColumnDef<Iso20022Message, unknown>[] = [
    { accessorKey: 'messageId', header: 'Message ID', cell: ({ row }) => <span className="font-mono text-[10px]">{row.original.messageId}</span> },
    { accessorKey: 'businessMessageId', header: 'Business ID', cell: ({ row }) => <span className="font-mono text-[10px] text-muted-foreground">{row.original.businessMessageId}</span> },
    {
      accessorKey: 'messageDefinition', header: 'Definition',
      cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', getDefColor(row.original.messageDefinition))}>{row.original.messageDefinition}</span>,
    },
    {
      accessorKey: 'messageCategory', header: 'Category',
      cell: ({ row }) => <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold', CATEGORY_COLORS[row.original.messageCategory] ?? 'bg-gray-100')}>{row.original.messageCategory}</span>,
    },
    { accessorKey: 'messageFunction', header: 'Function', cell: ({ row }) => <span className="text-xs">{row.original.messageFunction?.replace(/_/g, ' ')}</span> },
    { accessorKey: 'direction', header: 'Dir', cell: ({ row }) => <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', row.original.direction === 'INBOUND' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>{row.original.direction}</span> },
    {
      id: 'bics', header: 'BIC Flow',
      cell: ({ row }) => <span className="text-[10px] font-mono flex items-center gap-1">{row.original.senderBic?.slice(0, 8)} <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" /> {row.original.receiverBic?.slice(0, 8)}</span>,
    },
    { accessorKey: 'numberOfTxns', header: 'Txns', cell: ({ row }) => <span className="text-xs font-mono">{row.original.numberOfTxns}</span> },
    { accessorKey: 'totalAmount', header: 'Amount', cell: ({ row }) => <span className="text-xs font-mono font-medium">{formatMoney(row.original.totalAmount, row.original.currency)}</span> },
    {
      accessorKey: 'validationStatus', header: 'Validation',
      cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', VALIDATION_COLORS[row.original.validationStatus] ?? 'bg-gray-100')}>{row.original.validationStatus}</span>,
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', STATUS_COLORS[row.original.status] ?? 'bg-gray-100')}>{row.original.status}</span>,
    },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.createdAt)}</span> },
  ];

  // Code set columns
  const codeSetCols: ColumnDef<Iso20022CodeSet, unknown>[] = [
    { accessorKey: 'code', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.code}</span> },
    { accessorKey: 'displayName', header: 'Display Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.displayName}</span> },
    { accessorKey: 'definition', header: 'Definition', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.definition}</span> },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => row.original.isActive ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" /> },
  ];

  // Validation chart data
  const validationData = [
    { name: 'Valid', value: allMessages.filter((m) => m.validationStatus === 'VALID').length, color: '#22c55e' },
    { name: 'Pending', value: allMessages.filter((m) => m.validationStatus === 'PENDING').length, color: '#f59e0b' },
    { name: 'Schema Error', value: allMessages.filter((m) => m.validationStatus === 'SCHEMA_ERROR').length, color: '#ef4444' },
    { name: 'Business Error', value: allMessages.filter((m) => m.validationStatus === 'BUSINESS_ERROR').length, color: '#dc2626' },
  ].filter((d) => d.value > 0);

  const errorMessages = allMessages.filter((m) => m.validationStatus === 'SCHEMA_ERROR' || m.validationStatus === 'BUSINESS_ERROR');

  const tabs = [
    {
      id: 'messages',
      label: 'Messages',
      badge: allMessages.length || undefined,
      content: (
        <div className="p-4">
          <DataTable columns={msgCols} data={allMessages} enableGlobalFilter enableExport exportFilename="iso20022-messages" emptyMessage="No ISO 20022 messages" />
        </div>
      ),
    },
    {
      id: 'codesets',
      label: 'Code Sets',
      content: (
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code Set Browser */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Database className="w-4 h-4" /> Browse Code Set</h3>
              <input className="w-full input" placeholder="Enter code set name (e.g., ExternalPurpose1Code)" value={codeSetName} onChange={(e) => setCodeSetName(e.target.value)} />
              {codeSetName && codeSetData.length > 0 && (
                <DataTable columns={codeSetCols} data={codeSetData} enableGlobalFilter emptyMessage="No codes found" />
              )}
              {codeSetName && codeSetData.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Enter a valid code set name to browse</p>
              )}
            </div>

            {/* Code Lookup */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Search className="w-4 h-4" /> Lookup Code</h3>
              <input className="w-full input" placeholder="Code set name" value={lookupCodeSet} onChange={(e) => setLookupCodeSet(e.target.value)} />
              <input className="w-full input" placeholder="Code value" value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} />
              {lookupResult && (
                <div className="rounded-lg bg-muted/30 p-3 text-sm">
                  <pre className="text-xs font-mono overflow-x-auto">{JSON.stringify(lookupResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'validation',
      label: 'Validation',
      badge: errorMessages.length > 0 ? errorMessages.length : undefined,
      content: (
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Validation Results</h3>
              {validationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={validationData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" paddingAngle={2}>
                      {validationData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No validation data</p>}
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Recent Errors ({errorMessages.length})</h3>
              {errorMessages.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {errorMessages.slice(0, 10).map((m) => (
                    <div key={m.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-50/30 dark:bg-red-900/5 border border-red-100 dark:border-red-800/30">
                      <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-mono truncate">{m.messageId}</p>
                        <p className="text-[10px] text-muted-foreground">{m.messageDefinition} · {m.validationStatus}</p>
                        {m.validationErrors?.length > 0 && <p className="text-[10px] text-red-600 mt-0.5">{m.validationErrors[0]}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                  <p className="text-sm">No validation errors</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'ingest',
      label: 'Ingest & Processing',
      content: (
        <div className="p-4 space-y-6">
          <div className="rounded-xl border bg-card p-6 text-center space-y-3">
            <FileCode className="w-10 h-10 text-primary mx-auto" />
            <h3 className="text-sm font-semibold">Ingest New Message</h3>
            <p className="text-xs text-muted-foreground">Submit an ISO 20022 XML message for validation and processing</p>
            <button onClick={() => setShowIngest(true)} className="btn-primary inline-flex items-center gap-2">
              <Send className="w-4 h-4" /> Ingest Message
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      {showIngest && <IngestDialog onClose={() => setShowIngest(false)} />}

      <PageHeader
        title="ISO 20022 Message Center"
        subtitle="XML message processing, validation, and SWIFT migration"
        actions={
          <button onClick={() => setShowIngest(true)} className="flex items-center gap-2 btn-primary">
            <Send className="w-4 h-4" /> Ingest Message
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total Messages" value={allMessages.length} format="number" icon={FileCode} />
          <StatCard label="Received" value={receivedMsgs.length} format="number" icon={Clock} />
          <StatCard label="Validated" value={validatedMsgs.length} format="number" icon={CheckCircle} />
          <StatCard label="Processing" value={processingMsgs.length} format="number" icon={Loader2} />
          <StatCard label="Rejected" value={rejectedMsgs.length} format="number" icon={XCircle} />
        </div>

        {/* SWIFT Migration Banner */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <button onClick={() => setShowMigration(!showMigration)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">Migration Guide</span>
              <span className="text-sm font-semibold">SWIFT MT → ISO 20022 Migration</span>
            </div>
            {showMigration ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showMigration && (
            <div className="border-t px-5 pb-4">
              <table className="w-full text-sm mt-3">
                <thead><tr className="border-b">
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground">SWIFT MT</th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground">ISO 20022</th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Description</th>
                </tr></thead>
                <tbody className="divide-y">
                  {SWIFT_MIGRATION.map((row) => (
                    <tr key={row.mt}>
                      <td className="py-2 font-mono text-xs font-bold">{row.mt}</td>
                      <td className="py-2"><span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', getDefColor(row.iso))}>{row.iso}</span></td>
                      <td className="py-2 text-xs text-muted-foreground">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
