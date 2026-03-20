import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  Shield, CheckCircle, AlertTriangle, XCircle, Eye, Clock,
  Loader2, ChevronDown, ChevronRight, FileSearch,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, InfoGrid, EmptyState } from '@/components/shared';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSanctionsScreenings, useConfirmMatch, useFalsePositiveMatch } from '../hooks/useSanctions';
import type { ScreeningRequest, ScreeningMatch } from '../types/sanctions';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  OFAC_SDN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  UN_CONSOLIDATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  EU_CONSOLIDATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PEP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  UK_HMT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  LOCAL: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

// ─── Match Score Gauge ──────────────────────────────────────────────────────

function MatchScoreGauge({ score }: { score: number }) {
  const color = score >= 90 ? '#ef4444' : score >= 80 ? '#f97316' : score >= 70 ? '#f59e0b' : '#eab308';
  const label = score >= 90 ? 'Very High' : score >= 80 ? 'High' : score >= 70 ? 'Moderate' : 'Low';
  const data = [{ value: score }, { value: 100 - score }];

  return (
    <div className="relative w-20 h-20">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={25} outerRadius={35} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold font-mono" style={{ color }}>{score}%</span>
        <span className="text-[8px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ─────────────────────────────────────────────────────────

function ConfirmTrueMatchDialog({ matchId, onClose, onConfirm }: { matchId: number; onClose: () => void; onConfirm: (id: number) => void }) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="font-semibold">Confirm True Match?</h3>
        </div>
        <p className="text-sm text-muted-foreground">This will flag the subject as a confirmed sanctions match. This action will trigger enhanced due diligence and may block customer activities.</p>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Notes (required)</label>
          <textarea className="w-full mt-1 input h-20 resize-none" placeholder="Provide justification..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={() => { onConfirm(matchId); onClose(); }} disabled={!notes.trim()} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">Confirm True Match</button>
        </div>
      </div>
    </div>
  );
}

// ─── False Positive Dialog ──────────────────────────────────────────────────

function FalsePositiveDialog({ matchId, onClose, onFP }: { matchId: number; onClose: () => void; onFP: (id: number) => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="font-semibold">Mark False Positive?</h3>
        </div>
        <p className="text-sm text-muted-foreground">Document why this is not a true match. This helps improve screening accuracy.</p>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Reason (required)</label>
          <textarea className="w-full mt-1 input h-20 resize-none" placeholder="e.g. Different date of birth, different country..." value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={() => { onFP(matchId); onClose(); }} disabled={!reason.trim()} className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">Mark False Positive</button>
        </div>
      </div>
    </div>
  );
}

// ─── Match Card ─────────────────────────────────────────────────────────────

function MatchCard({ match, screening, onConfirm, onFP }: {
  match: ScreeningMatch;
  screening: ScreeningRequest;
  onConfirm: (id: number) => void;
  onFP: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFP, setShowFP] = useState(false);

  const dispositionBg = match.disposition === 'TRUE_MATCH' ? 'border-red-300 bg-red-50/50 dark:bg-red-900/10 dark:border-red-800/40'
    : match.disposition === 'FALSE_POSITIVE' ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800/40'
    : 'border-amber-300 bg-amber-50/30 dark:bg-amber-900/5 dark:border-amber-800/40';

  // Field comparison rows
  const comparisonRows = [
    { field: 'Name', subject: screening.subjectName, watchlist: match.watchlistName, matched: match.matchedFields?.includes('NAME') },
    { field: 'DOB', subject: screening.subjectDob ?? '—', watchlist: '—', matched: match.matchedFields?.includes('DOB') },
    { field: 'Nationality', subject: screening.subjectNationality ?? '—', watchlist: '—', matched: match.matchedFields?.includes('NATIONALITY') },
    { field: 'ID Number', subject: screening.subjectIdNumber ?? '—', watchlist: '—', matched: match.matchedFields?.includes('ID') },
  ];

  return (
    <>
      {showConfirm && <ConfirmTrueMatchDialog matchId={match.id} onClose={() => setShowConfirm(false)} onConfirm={onConfirm} />}
      {showFP && <FalsePositiveDialog matchId={match.id} onClose={() => setShowFP(false)} onFP={onFP} />}

      <div className={cn('rounded-xl border-2 overflow-hidden transition-colors', dispositionBg)}>
        {/* Header */}
        <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <MatchScoreGauge score={match.matchScore} />

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold', SOURCE_COLORS[match.watchlistSource] ?? 'bg-gray-100')}>
                {match.watchlistSource?.replace('_', ' ')}
              </span>
              <span className={cn('px-2 py-0.5 rounded text-xs font-bold',
                match.matchType === 'EXACT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
              )}>
                {match.matchType}
              </span>
              {match.disposition === 'PENDING' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">PENDING</span>
              )}
              {match.disposition === 'TRUE_MATCH' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">CONFIRMED HIT</span>
              )}
              {match.disposition === 'FALSE_POSITIVE' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">FALSE POSITIVE</span>
              )}
            </div>
            <p className="text-sm font-semibold">{match.watchlistName}</p>
            {match.matchedFields && match.matchedFields.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {match.matchedFields.map((f) => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold">{f}</span>
                ))}
              </div>
            )}
          </div>

          {expanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
        </div>

        {/* Body */}
        {expanded && (
          <div className="border-t px-5 pb-5 space-y-4">
            {/* Field comparison */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Field-by-Field Comparison</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground w-28">Field</th>
                    <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Subject Value</th>
                    <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Watchlist Value</th>
                    <th className="text-center py-1.5 px-2 text-xs font-medium text-muted-foreground w-16">Match?</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {comparisonRows.map((row) => (
                    <tr key={row.field} className={cn(row.matched && 'bg-amber-50/50 dark:bg-amber-900/5')}>
                      <td className="py-1.5 px-2 text-xs font-medium">{row.field}</td>
                      <td className="py-1.5 px-2 text-xs font-mono">{row.subject}</td>
                      <td className="py-1.5 px-2 text-xs font-mono">{row.watchlist}</td>
                      <td className="py-1.5 px-2 text-center">
                        {row.matched ? <span className="text-red-600 font-bold text-xs">YES</span> : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Disposition info or actions */}
            {match.disposition === 'PENDING' ? (
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowConfirm(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">
                  <XCircle className="w-4 h-4" /> Confirm True Match
                </button>
                <button onClick={() => setShowFP(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                  <CheckCircle className="w-4 h-4" /> Mark False Positive
                </button>
              </div>
            ) : (
              <div className="pt-2 text-xs text-muted-foreground">
                Disposed by <span className="font-medium text-foreground">{match.disposedBy ?? 'System'}</span> on {match.disposedAt ? formatDateTime(match.disposedAt) : '—'}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ScreeningDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const screeningId = parseInt(id, 10);
  useEffect(() => { document.title = `Screening #${id} | CBS`; }, [id]);

  // Fetch all screenings and find this one (since we have list endpoint, not single)
  const { data: screenings = [], isLoading } = useSanctionsScreenings();
  const screening = screenings.find((s) => s.id === screeningId);

  const confirmMatch = useConfirmMatch();
  const fpMatch = useFalsePositiveMatch();

  const handleConfirm = (matchId: number) => {
    confirmMatch.mutate(matchId, { onSuccess: () => toast.success('Match confirmed as true hit') });
  };
  const handleFP = (matchId: number) => {
    fpMatch.mutate(matchId, { onSuccess: () => toast.success('Marked as false positive') });
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/compliance/sanctions" />
        <div className="page-container flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      </>
    );
  }

  if (!screening) {
    return (
      <>
        <PageHeader title="Screening Not Found" backTo="/compliance/sanctions" />
        <div className="page-container"><EmptyState title="Screening not found" description={`No screening found with ID "${id}".`} /></div>
      </>
    );
  }

  const pendingCount = screening.totalMatches - screening.trueMatches - screening.falsePositives;

  return (
    <>
      <PageHeader
        title={screening.screeningRef}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusBadge status={screening.status} dot />
            <span className="text-xs font-mono text-muted-foreground">{screening.screeningTimeMs}ms</span>
          </span>
        }
        backTo="/compliance/sanctions"
      />

      <div className="page-container space-y-6">
        {/* Subject Profile */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><FileSearch className="w-4 h-4" /> Subject Profile</h3>
          <InfoGrid
            columns={4}
            items={[
              { label: 'Subject Name', value: screening.subjectName },
              { label: 'Subject Type', value: screening.subjectType },
              { label: 'Date of Birth', value: screening.subjectDob ? formatDate(screening.subjectDob) : '—' },
              { label: 'Nationality', value: screening.subjectNationality ?? '—' },
              { label: 'ID Number', value: screening.subjectIdNumber ?? '—' },
              { label: 'Customer ID', value: screening.customerId ? `#${screening.customerId}` : '—' },
              { label: 'Transaction Ref', value: screening.transactionRef ?? '—' },
              { label: 'Screening Type', value: screening.screeningType },
              { label: 'Match Threshold', value: `${screening.matchThreshold}%` },
              { label: 'Screened At', value: formatDateTime(screening.createdAt) },
            ]}
          />
          {screening.listsScreened && screening.listsScreened.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Lists Screened:</span>
              {screening.listsScreened.map((l) => (
                <span key={l} className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', SOURCE_COLORS[l] ?? 'bg-gray-100')}>{l.replace('_', ' ')}</span>
              ))}
            </div>
          )}
        </div>

        {/* Match Results */}
        <div>
          <h3 className="text-sm font-semibold mb-4">Match Results ({screening.totalMatches})</h3>
          {screening.matches && screening.matches.length > 0 ? (
            <div className="space-y-4">
              {screening.matches.map((match) => (
                <MatchCard key={match.id} match={match} screening={screening} onConfirm={handleConfirm} onFP={handleFP} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-8 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No matches found for this screening</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Screening Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Matches</p>
              <p className="text-2xl font-bold font-mono mt-1">{screening.totalMatches}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">True Matches</p>
              <p className="text-2xl font-bold font-mono mt-1 text-red-600">{screening.trueMatches}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">False Positives</p>
              <p className="text-2xl font-bold font-mono mt-1 text-green-600">{screening.falsePositives}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className={cn('text-2xl font-bold font-mono mt-1', pendingCount > 0 ? 'text-amber-600' : '')}>{pendingCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-2"><StatusBadge status={screening.status} dot /></div>
            </div>
          </div>

          {/* Review info */}
          {screening.reviewedBy && (
            <div className="mt-4 pt-4 border-t text-sm">
              <span className="text-muted-foreground">Reviewed by </span>
              <span className="font-medium">{screening.reviewedBy}</span>
              {screening.reviewedAt && <span className="text-muted-foreground"> on {formatDateTime(screening.reviewedAt)}</span>}
            </div>
          )}
          {screening.reviewNotes && (
            <div className="mt-2 text-sm bg-muted/30 px-3 py-2 rounded">{screening.reviewNotes}</div>
          )}
        </div>
      </div>
    </>
  );
}
