import { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Fingerprint,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDateTime } from '@/lib/formatters';
import { useCustomerScaSessions } from '../hooks/usePsd2';
import { ScaSessionTable } from '../components/psd2/ScaSessionTable';
import { ScaFlowDiagram } from '../components/psd2/ScaFlowDiagram';
import type { Psd2ScaSession, ScaStatus } from '../api/psd2Api';

// ─── Helpers ───────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  SMS_OTP: 'SMS OTP',
  PUSH: 'Push Notification',
  BIOMETRIC: 'Biometric',
  TOTP: 'TOTP',
  FIDO2: 'FIDO2',
  PHOTO_TAN: 'Photo TAN',
  CHIP_TAN: 'Chip TAN',
};

const STATUS_ICONS: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  STARTED: { icon: Clock, className: 'text-blue-500' },
  AUTHENTICATION_REQUIRED: { icon: Fingerprint, className: 'text-amber-500' },
  METHOD_SELECTED: { icon: Fingerprint, className: 'text-amber-500' },
  FINALISED: { icon: CheckCircle2, className: 'text-green-500' },
  FAILED: { icon: XCircle, className: 'text-red-500' },
  EXEMPTED: { icon: ShieldCheck, className: 'text-blue-500' },
};

function getScaStep(status: ScaStatus): number {
  switch (status) {
    case 'STARTED': return 1;
    case 'AUTHENTICATION_REQUIRED':
    case 'METHOD_SELECTED': return 2;
    case 'FINALISED': return 5;
    case 'FAILED': return 3;
    case 'EXEMPTED': return 5;
    default: return 0;
  }
}

// ─── Session Detail Panel ──────────────────────────────────────────────────

function SessionDetailPanel({ session, onClose }: { session: Psd2ScaSession; onClose: () => void }) {
  const statusInfo = STATUS_ICONS[session.scaStatus] || STATUS_ICONS.STARTED;
  const StatusIcon = statusInfo.icon;

  const timelineEvents = [
    { label: 'Session Initiated', time: session.createdAt, status: 'completed' as const },
    ...(session.scaStatus !== 'STARTED'
      ? [{ label: 'SCA Challenge Sent', time: session.createdAt, status: 'completed' as const }]
      : []),
    ...(session.scaStatus === 'FINALISED'
      ? [
          { label: 'Customer Authenticated', time: session.finalisedAt!, status: 'completed' as const },
          { label: 'Consent Granted', time: session.finalisedAt!, status: 'completed' as const },
          { label: 'Token Issued', time: session.finalisedAt!, status: 'completed' as const },
        ]
      : []),
    ...(session.scaStatus === 'EXEMPTED'
      ? [{ label: `Exempted (${session.exemptionType ?? 'N/A'})`, time: session.createdAt, status: 'completed' as const }]
      : []),
    ...(session.scaStatus === 'FAILED'
      ? [{ label: 'Authentication Failed', time: session.finalisedAt ?? session.expiresAt, status: 'failed' as const }]
      : []),
  ];

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('w-5 h-5', statusInfo.className)} />
          <h3 className="text-sm font-semibold">Session Details</h3>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Close
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Key info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-muted-foreground">Session ID</span>
            <p className="text-xs font-mono mt-0.5 break-all">{session.sessionId}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Customer</span>
            <p className="text-sm font-medium mt-0.5">#{session.customerId}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">TPP</span>
            <p className="text-sm font-medium mt-0.5">{session.tppId}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">SCA Method</span>
            <p className="text-sm font-medium mt-0.5">{METHOD_LABELS[session.scaMethod] ?? session.scaMethod}</p>
          </div>
        </div>

        {/* Extra info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {session.exemptionType && (
            <div>
              <span className="text-xs text-muted-foreground">Exemption</span>
              <p className="text-sm font-medium mt-0.5">{session.exemptionType.replace(/_/g, ' ')}</p>
            </div>
          )}
          {session.consentId && (
            <div>
              <span className="text-xs text-muted-foreground">Consent ID</span>
              <p className="text-xs font-mono mt-0.5">{session.consentId}</p>
            </div>
          )}
          {session.ipAddress && (
            <div>
              <span className="text-xs text-muted-foreground">IP Address</span>
              <p className="text-xs font-mono mt-0.5">{session.ipAddress}</p>
            </div>
          )}
        </div>

        {/* Flow diagram */}
        <ScaFlowDiagram scaStatus={session.scaStatus} />

        {/* Timeline */}
        <div>
          <h4 className="text-xs font-semibold mb-3">Session Timeline</h4>
          <div className="space-y-0">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-2.5 h-2.5 rounded-full mt-1',
                      event.status === 'completed' ? 'bg-green-500' : 'bg-red-500',
                    )}
                  />
                  {idx < timelineEvents.length - 1 && (
                    <div className="w-px h-6 border-l border-dashed border-muted-foreground/30" />
                  )}
                </div>
                <div className="pb-3">
                  <p className="text-xs font-medium">{event.label}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(event.time)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Failure / challenge data */}
        {session.scaStatus === 'FAILED' && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-red-700 dark:text-red-400">
                  Authentication Failed
                </h4>
                {session.challengeData && (
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                    Challenge: {session.challengeData}
                  </p>
                )}
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Recommended Actions:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                    <li>Verify customer device and authentication method availability</li>
                    <li>Check if the TPP redirect URI is valid and reachable</li>
                    <li>Review session timeout configuration</li>
                    <li>Contact customer support if repeated failures occur</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export function ScaSessionsPage() {
  const [customerId, setCustomerId] = useState('');
  const [searchId, setSearchId] = useState(0);
  const [selectedSession, setSelectedSession] = useState<Psd2ScaSession | null>(null);

  const { data: sessions = [], isLoading } = useCustomerScaSessions(searchId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(customerId.trim(), 10);
    if (!isNaN(id) && id > 0) {
      setSearchId(id);
      setSelectedSession(null);
    }
  };

  const failedSessions = sessions.filter((s) => s.scaStatus === 'FAILED');

  return (
    <>
      <PageHeader
        title="SCA Sessions"
        subtitle="Search and review Strong Customer Authentication sessions by customer."
        backTo="/open-banking/psd2"
      />

      <div className="page-container space-y-6">
        {/* Search */}
        <div className="surface-card p-5">
          <form onSubmit={handleSearch} className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Customer ID
              </label>
              <input
                type="number"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="Enter customer ID..."
              />
            </div>
            <button
              type="submit"
              disabled={!customerId.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </form>
        </div>

        {/* Results */}
        {searchId === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ShieldCheck className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Search for a customer</p>
            <p className="text-xs mt-1">Enter a customer ID to view their SCA sessions</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="surface-card p-4">
                <p className="text-xs text-muted-foreground">Total Sessions</p>
                <p className="text-xl font-bold mt-1 tabular-nums">{sessions.length}</p>
              </div>
              <div className="surface-card p-4">
                <p className="text-xs text-muted-foreground">Finalised</p>
                <p className="text-xl font-bold mt-1 tabular-nums text-green-600">
                  {sessions.filter((s) => s.scaStatus === 'FINALISED').length}
                </p>
              </div>
              <div className="surface-card p-4">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-xl font-bold mt-1 tabular-nums text-red-600">
                  {failedSessions.length}
                </p>
              </div>
              <div className="surface-card p-4">
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-xl font-bold mt-1 tabular-nums text-amber-600">
                  {sessions.filter((s) => s.scaStatus === 'STARTED' || s.scaStatus === 'AUTHENTICATION_REQUIRED' || s.scaStatus === 'METHOD_SELECTED').length}
                </p>
              </div>
            </div>

            {/* Selected session detail */}
            {selectedSession && (
              <SessionDetailPanel
                session={selectedSession}
                onClose={() => setSelectedSession(null)}
              />
            )}

            {/* Session table */}
            <ScaSessionTable
              data={sessions}
              onRowClick={(session) => setSelectedSession(session)}
            />

            {/* Failed sessions error analysis */}
            {failedSessions.length > 0 && (
              <div className="surface-card overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-semibold">Failed Session Analysis</h3>
                </div>
                <div className="divide-y">
                  {failedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="px-5 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedSession(session)}
                    >
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{session.tppId}</span>
                          <span className="text-muted-foreground">
                            {formatDateTime(session.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                          {session.challengeData || 'Authentication failed'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {METHOD_LABELS[session.scaMethod] ?? session.scaMethod}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
