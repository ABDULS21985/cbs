import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  Phone, PhoneOff, PhoneCall, Mic, MicOff, Pause, Play,
  ArrowRightLeft, Users as UsersIcon, Clock, Coffee, Radio,
  Search, ThumbsUp, ThumbsDown, ExternalLink, X, Check,
  Headphones, FileText, CreditCard, Landmark, ChevronDown,
  ChevronRight, AlertTriangle, MessageSquare, Loader2,
} from 'lucide-react';
import { contactCenterApi, type AgentState, type QueueStatus, type CustomerMiniProfile, type CallDisposition } from '../api/contactCenterApi';
import { apiGet } from '@/lib/api';
import type { ContactInteraction } from '../types/contactCenterExt';
import type { HelpArticle } from '../types/help';
import { useAuthStore } from '@/stores/authStore';
import {
  useAssignInteraction,
  useCompleteInteraction,
  useSearchHelpArticles,
  useRecordArticleHelpfulness,
} from '../hooks/useContactCenter';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const STATE_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-500', ON_CALL: 'bg-red-500', BUSY: 'bg-red-500',
  WRAP_UP: 'bg-amber-500', BREAK: 'bg-gray-400', OFFLINE: 'bg-gray-600',
};

const DISPOSITION_CATEGORIES: Record<string, string[]> = {
  'Account Inquiry': ['Balance Check', 'Statement Request', 'Account Details', 'Other'],
  'Transaction Issue': ['Failed Transfer', 'Wrong Debit', 'Reversal Request', 'Other'],
  'Card Services': ['Block Card', 'PIN Reset', 'Card Replacement', 'Dispute'],
  'Loan Inquiry': ['Repayment Schedule', 'Balance Query', 'Restructure Request', 'Other'],
  'Complaint': ['Service Quality', 'System Issue', 'Staff Conduct', 'Charges'],
  'General': ['Product Information', 'Branch Inquiry', 'Other'],
};

// ── LEFT PANEL: Agent Status + Queues ────────────────────────────────────────

function LeftPanel({
  agent,
  queues,
  selectedQueue,
  onSelectQueue,
  onStateChange,
  shiftSeconds,
}: {
  agent: AgentState | null;
  queues: QueueStatus[];
  selectedQueue: string | null;
  onSelectQueue: (name: string) => void;
  onStateChange: (state: string) => void;
  shiftSeconds: number;
}) {
  return (
    <div className="w-[280px] flex-shrink-0 border-r flex flex-col h-full overflow-hidden bg-card">
      {/* Agent State */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white', STATE_COLORS[agent?.state ?? 'OFFLINE'])}>
            <Headphones className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{agent?.agentName ?? 'Agent'}</p>
            <div className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', STATE_COLORS[agent?.state ?? 'OFFLINE'])} />
              <span className="text-xs text-muted-foreground">{agent?.state?.replace(/_/g, ' ') ?? 'OFFLINE'}</span>
            </div>
          </div>
        </div>

        <select
          value={agent?.state ?? 'OFFLINE'}
          onChange={(e) => onStateChange(e.target.value)}
          className="w-full text-xs rounded-lg border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {['AVAILABLE', 'ON_CALL', 'WRAP_UP', 'BREAK', 'OFFLINE'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <div className="text-xs text-muted-foreground">
          <div className="flex justify-between"><span>On shift:</span> <span className="font-mono">{fmtElapsed(shiftSeconds)}</span></div>
        </div>

        {/* Today's stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/50 p-2">
            <div className="text-lg font-bold font-mono">{agent?.callsToday ?? 0}</div>
            <div className="text-[9px] text-muted-foreground">Handled</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <div className="text-lg font-bold font-mono">{fmtTime(agent?.avgHandleTimeSec ?? 0)}</div>
            <div className="text-[9px] text-muted-foreground">AHT</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <div className={cn('text-lg font-bold font-mono', (agent?.fcrPct ?? 0) >= 80 ? 'text-green-600' : 'text-amber-600')}>{(agent?.fcrPct ?? 0).toFixed(0)}%</div>
            <div className="text-[9px] text-muted-foreground">FCR</div>
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-2 pt-1">Queues</p>
        {queues.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No queues</p>}
        {queues.map((q) => {
          const slaColor = q.slaPct >= 90 ? 'text-green-600' : q.slaPct >= 80 ? 'text-amber-600' : 'text-red-600';
          const isSelected = selectedQueue === q.queueName;
          return (
            <button
              key={q.queueName}
              onClick={() => onSelectQueue(q.queueName)}
              className={cn(
                'w-full text-left rounded-lg p-3 transition-colors',
                isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold truncate">{q.queueName}</span>
                <span className={cn(
                  'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white',
                  q.waiting > 5 ? 'bg-red-500 animate-pulse' : q.waiting > 0 ? 'bg-amber-500' : 'bg-gray-400',
                )}>
                  {q.waiting}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Wait: {fmtTime(q.longestWaitSec)}</span>
                <span className={cn('font-mono font-medium', slaColor)}>{q.slaPct.toFixed(0)}% SLA</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── CENTER PANEL: Active Interaction ─────────────────────────────────────────

function CenterPanel({
  interaction,
  onPickFromQueue,
  onEndCall,
  onCompleted,
}: {
  interaction: ContactInteraction | null;
  onPickFromQueue: () => void;
  onEndCall: () => void;
  onCompleted: (disposition: CallDisposition) => void;
}) {
  const navigate = useNavigate();
  const [callSeconds, setCallSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [notes, setNotes] = useState('');
  const [showDisposition, setShowDisposition] = useState(false);
  const notesTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Call timer
  useEffect(() => {
    if (!interaction || interaction.status !== 'ACTIVE') { setCallSeconds(0); return; }
    const start = Date.now();
    const iv = setInterval(() => setCallSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [interaction?.id, interaction?.status]);

  // Auto-save notes to localStorage
  useEffect(() => {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      if (interaction && notes) {
        localStorage.setItem(`agent-notes-${interaction.id}`, notes);
      }
    }, 5000);
    return () => { if (notesTimerRef.current) clearTimeout(notesTimerRef.current); };
  }, [notes, interaction?.id]);

  // Load saved notes
  useEffect(() => {
    if (interaction) {
      const saved = localStorage.getItem(`agent-notes-${interaction.id}`);
      if (saved) setNotes(saved);
      else setNotes(interaction.notes ?? '');
    }
  }, [interaction?.id]);

  const handleEndCall = () => setShowDisposition(true);

  // No active call
  if (!interaction || interaction.status === 'COMPLETED') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Headphones className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Ready for next interaction</h3>
          <p className="text-sm text-muted-foreground mt-1">Pick from the queue or wait for an incoming call</p>
        </div>
        <button
          onClick={onPickFromQueue}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Phone className="w-5 h-5" /> Pick from Queue
        </button>
      </div>
    );
  }

  // Disposition form
  if (showDisposition) {
    return (
      <DispositionForm
        interaction={interaction}
        initialNotes={notes}
        onSubmit={(disp) => {
          onCompleted(disp);
          setShowDisposition(false);
          setNotes('');
          localStorage.removeItem(`agent-notes-${interaction.id}`);
        }}
        onCancel={() => setShowDisposition(false)}
      />
    );
  }

  // Active call
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Call timer */}
      <div className="flex items-center justify-center gap-3 py-4 border-b bg-red-50/50 dark:bg-red-900/10">
        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <span className="text-2xl font-bold font-mono tabular-nums">{fmtElapsed(callSeconds)}</span>
        <span className="text-xs text-muted-foreground">· {interaction.channel} · #{interaction.customerId}</span>
      </div>

      {/* Call controls bar */}
      <div className="flex items-center justify-center gap-3 py-3 border-b bg-muted/30">
        <button onClick={() => setMuted(!muted)} className={cn('flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors', muted ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : 'hover:bg-muted')}>
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          <span className="text-[10px] font-medium">{muted ? 'Unmute' : 'Mute'}</span>
        </button>
        <button onClick={() => setOnHold(!onHold)} className={cn('flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors', onHold ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 'hover:bg-muted')}>
          {onHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          <span className="text-[10px] font-medium">{onHold ? 'Resume' : 'Hold'}</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowRightLeft className="w-5 h-5" />
          <span className="text-[10px] font-medium">Transfer</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-muted transition-colors">
          <UsersIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium">Conference</span>
        </button>
        <button onClick={handleEndCall} className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors">
          <PhoneOff className="w-5 h-5" />
          <span className="text-[10px] font-medium">End Call</span>
        </button>
      </div>

      {/* Notes area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-muted-foreground">Interaction Notes</label>
            <span className="text-[10px] text-muted-foreground">{notes.length} chars · auto-saves</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type notes during the call..."
            rows={6}
            className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(`/cases/new?customerId=${interaction.customerId}`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">
              <FileText className="w-3.5 h-3.5" /> Create Case
            </button>
            <button onClick={() => navigate(`/payments`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">
              <CreditCard className="w-3.5 h-3.5" /> Transactions
            </button>
            <button onClick={() => navigate(`/accounts`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">
              <Landmark className="w-3.5 h-3.5" /> Accounts
            </button>
          </div>
        </div>

        {interaction.contactReason && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Contact Reason</p>
            <p className="text-sm font-medium mt-0.5">{interaction.contactReason}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DISPOSITION FORM ─────────────────────────────────────────────────────────

function DispositionForm({
  interaction,
  initialNotes,
  onSubmit,
  onCancel,
}: {
  interaction: ContactInteraction;
  initialNotes: string;
  onSubmit: (disp: CallDisposition) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState('Account Inquiry');
  const [subCategory, setSubCategory] = useState('');
  const [disposition, setDisposition] = useState('Resolved');
  const [fcr, setFcr] = useState(true);
  const [notes, setNotes] = useState(initialNotes);

  const subCategories = DISPOSITION_CATEGORIES[category] ?? [];

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-4">
          <Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Complete Interaction</h3>
          <p className="text-xs text-muted-foreground">Customer #{interaction.customerId} · {interaction.channel}</p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Category</label>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setSubCategory(''); }} className={inputCls}>
            {Object.keys(DISPOSITION_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Sub-Category</label>
          <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className={inputCls}>
            <option value="">Select...</option>
            {subCategories.map((sc) => <option key={sc} value={sc}>{sc}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Disposition</label>
          <select value={disposition} onChange={(e) => setDisposition(e.target.value)} className={inputCls}>
            <option value="Resolved">Resolved</option>
            <option value="Escalated">Escalated</option>
            <option value="Callback Required">Callback Required</option>
            <option value="Transferred">Transferred</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={fcr} onChange={(e) => setFcr(e.target.checked)} className="accent-primary" />
          Resolved on first contact?
        </label>
        <div>
          <label className="block text-xs font-medium mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={cn(inputCls, 'resize-none')} />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back to Call</button>
          <button
            onClick={() => onSubmit({ category, subCategory, disposition, notes, fcr })}
            className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
          >
            Submit & Go Available
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RIGHT PANEL: Customer 360 + Knowledge Base ──────────────────────────────

function RightPanel({ customerId }: { customerId: number | null }) {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerMiniProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['accounts']));

  // Fetch customer
  useEffect(() => {
    if (!customerId) { setCustomer(null); return; }
    setLoading(true);
    contactCenterApi.getCustomerProfile(customerId)
      .then(setCustomer)
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }, [customerId]);

  // Knowledge base search
  const { data: articles = [] } = useSearchHelpArticles(
    searchQuery.length >= 2 ? { query: searchQuery } : undefined,
  );
  const recordHelpfulness = useRecordArticleHelpfulness();

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (!customerId) {
    return (
      <div className="w-[320px] flex-shrink-0 border-l flex items-center justify-center p-4 bg-card">
        <p className="text-sm text-muted-foreground text-center">Customer info will appear here during an active interaction</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-[320px] flex-shrink-0 border-l flex items-center justify-center p-4 bg-card">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-[320px] flex-shrink-0 border-l flex flex-col h-full overflow-hidden bg-card">
      {/* Customer header */}
      {customer ? (
        <div className="p-4 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">{customer.customerName}</h3>
            <span className="text-[10px] font-mono text-muted-foreground">#{customer.customerId}</span>
          </div>
          <div className="flex gap-1.5">
            <StatusBadge status={customer.segment} size="sm" />
            <StatusBadge status={customer.riskRating} size="sm" />
          </div>
          <p className="text-[10px] text-muted-foreground">Member since {customer.memberSince}</p>
          <button
            onClick={() => navigate(`/customers/${customer.customerId}`)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" /> Full 360 View
          </button>
        </div>
      ) : (
        <div className="p-4 border-b">
          <p className="text-xs text-muted-foreground">Customer #{customerId} — profile not available</p>
        </div>
      )}

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto">
        {customer && (
          <>
            {/* Accounts */}
            <CollapsibleSection title={`Accounts (${customer.accounts.length})`} expanded={expandedSections.has('accounts')} onToggle={() => toggleSection('accounts')}>
              <div className="space-y-1.5">
                {customer.accounts.map((acc, i) => (
                  <button key={i} onClick={() => navigate(`/accounts/${acc.number}`)} className="w-full text-left rounded-lg hover:bg-muted/50 p-2 transition-colors">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{acc.type}</span>
                      <StatusBadge status={acc.status} size="sm" />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">{acc.number}</span>
                      <span className="text-xs font-mono font-medium">{formatMoney(acc.balance)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            {/* Recent Interactions */}
            <CollapsibleSection title={`Recent (${customer.recentInteractions.length})`} expanded={expandedSections.has('interactions')} onToggle={() => toggleSection('interactions')}>
              <div className="space-y-1.5">
                {customer.recentInteractions.slice(0, 5).map((int, i) => (
                  <div key={i} className="text-xs p-2 rounded-lg bg-muted/30">
                    <div className="flex justify-between mb-0.5">
                      <span className="font-medium">{int.channel}</span>
                      <span className="text-muted-foreground">{formatDate(int.date)}</span>
                    </div>
                    <p className="text-muted-foreground truncate">{int.summary}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Alerts */}
            {customer.alerts.length > 0 && (
              <CollapsibleSection title={`Alerts (${customer.alerts.length})`} expanded={expandedSections.has('alerts')} onToggle={() => toggleSection('alerts')}>
                <div className="space-y-1.5">
                  {customer.alerts.map((alert, i) => (
                    <div key={i} className={cn('text-xs p-2 rounded-lg border-l-2', alert.severity === 'HIGH' ? 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10' : 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10')}>
                      <p className="font-medium">{alert.type}</p>
                      <p className="text-muted-foreground">{alert.message}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </>
        )}

        {/* Knowledge Base */}
        <div className="p-3 border-t">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Knowledge Base</p>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            {(articles as HelpArticle[]).slice(0, 3).map((article) => (
              <div key={article.id} className="rounded-lg border p-2 text-xs space-y-1">
                <p className="font-medium">{article.title}</p>
                <p className="text-muted-foreground line-clamp-2">{article.summary}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => recordHelpfulness.mutate({ code: article.articleCode, helpful: true })} className="flex items-center gap-0.5 text-muted-foreground hover:text-green-600" title="Helpful">
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button className="flex items-center gap-0.5 text-muted-foreground hover:text-red-600" title="Not helpful">
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {searchQuery.length >= 2 && articles.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">No articles found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Collapsible Section ─────────────────────────────────────────────────────

function CollapsibleSection({ title, expanded, onToggle, children }: {
  title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors">
        {title}
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────

export function AgentWorkbenchPage() {
  const qc = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [shiftStart] = useState(() => Date.now());
  const [shiftSeconds, setShiftSeconds] = useState(0);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Shift timer
  useEffect(() => {
    const iv = setInterval(() => setShiftSeconds(Math.floor((Date.now() - shiftStart) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [shiftStart]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        // Toggle available/break
        const current = agents?.[0]?.state;
        const next = current === 'AVAILABLE' ? 'BREAK' : 'AVAILABLE';
        handleStateChange(next);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Focus KB search — handled by right panel
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });

  // Real-time data
  const { data: agents = [] } = useQuery({
    queryKey: ['contact-center', 'agents'],
    queryFn: () => contactCenterApi.getAgentStates(),
    refetchInterval: 10_000,
  });
  const { data: queues = [] } = useQuery({
    queryKey: ['contact-center', 'queues'],
    queryFn: () => contactCenterApi.getQueueStatus(),
    refetchInterval: 10_000,
  });
  const { data: interactions = [] } = useQuery({
    queryKey: ['contact-center', 'interactions'],
    queryFn: () => apiGet<ContactInteraction[]>('/api/v1/contact-center/interactions'),
    refetchInterval: 10_000,
  });

  const { data: myAgent } = useQuery({
    queryKey: ['contact-center', 'agents', 'me'],
    queryFn: () => contactCenterApi.getMyAgent(),
    staleTime: 30_000,
  });
  const currentAgent = myAgent ?? agents.find((a) => user && a.agentId.toLowerCase() === user.username?.toLowerCase()) ?? null;
  const missingAgentMapping = Boolean(user) && agents.length > 0 && !currentAgent && myAgent === null;
  const activeInteraction = interactions.find(
    (i) => i.agentId === currentAgent?.agentId && (i.status === 'ACTIVE' || i.status === 'QUEUED'),
  ) ?? null;

  const assignMut = useAssignInteraction();
  const completeMut = useCompleteInteraction();

  const handleStateChange = useCallback((newState: string) => {
    if (!currentAgent) return;
    contactCenterApi.updateAgentState(currentAgent.agentId, newState).then(() => {
      toast.success(`State changed to ${newState.replace(/_/g, ' ')}`);
      qc.invalidateQueries({ queryKey: ['contact-center', 'agents'] });
    }).catch(() => toast.error('Failed to update state'));
  }, [currentAgent, qc]);

  const handlePickFromQueue = useCallback(() => {
    if (!currentAgent) {
      toast.error('Authenticated user is not mapped to a contact-center agent record.');
      return;
    }
    // Find oldest waiting interaction
    const waiting = interactions.filter((i) => i.status === 'QUEUED').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (waiting.length === 0) { toast.info('No interactions waiting in queue'); return; }
    assignMut.mutate({ id: waiting[0].interactionId, agentId: currentAgent.agentId }, {
      onSuccess: () => toast.success('Interaction assigned'),
      onError: () => toast.error('Failed to assign'),
    });
  }, [currentAgent, interactions, assignMut]);

  const handleCompleteInteraction = useCallback((disp: CallDisposition) => {
    if (!activeInteraction) return;
    completeMut.mutate({ id: activeInteraction.interactionId, disposition: disp.disposition, fcr: disp.fcr }, {
      onSuccess: () => {
        toast.success('Interaction completed');
        // Set agent to AVAILABLE
        if (currentAgent) {
          contactCenterApi.updateAgentState(currentAgent.agentId, 'AVAILABLE').then(() => {
            qc.invalidateQueries({ queryKey: ['contact-center'] });
          });
        }
      },
      onError: () => toast.error('Failed to complete'),
    });
  }, [activeInteraction, currentAgent, completeMut, qc]);

  return (
    <>
      {missingAgentMapping && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The authenticated user is not mapped to a contact-center agent record. Agent-specific actions are disabled until that mapping exists in backend data.
        </div>
      )}
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left Panel */}
      <LeftPanel
        agent={currentAgent}
        queues={queues}
        selectedQueue={selectedQueue}
        onSelectQueue={setSelectedQueue}
        onStateChange={handleStateChange}
        shiftSeconds={shiftSeconds}
      />

      {/* Center Panel */}
      <CenterPanel
        interaction={activeInteraction}
        onPickFromQueue={handlePickFromQueue}
        onEndCall={() => {}}
        onCompleted={handleCompleteInteraction}
      />

      {/* Right Panel (hidden on small screens) */}
      <div className="hidden lg:block">
        <RightPanel customerId={activeInteraction?.customerId ?? null} />
      </div>

      {/* Mobile: toggle right panel */}
      {activeInteraction && (
        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          className="lg:hidden fixed bottom-4 right-4 z-40 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg text-sm font-medium"
        >
          Customer Info
        </button>
      )}
      {showRightPanel && activeInteraction && (
        <div className="lg:hidden fixed inset-y-0 right-0 z-50 w-[320px] shadow-xl">
          <button onClick={() => setShowRightPanel(false)} className="absolute top-2 left-2 z-10 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
          <RightPanel customerId={activeInteraction.customerId} />
        </div>
      )}
      </div>
    </>
  );
}
