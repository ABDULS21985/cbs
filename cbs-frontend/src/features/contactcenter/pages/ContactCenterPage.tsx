import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Phone, Users, Clock, HeadphonesIcon, Monitor, PhoneCall,
  PhoneOff, Coffee, Radio, Loader2, CheckCircle2, AlertTriangle,
  Plus, X, MessageSquare, Mail, Send,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, TabsPage, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { contactCenterApi, type AgentState, type QueueStatus } from '../api/contactCenterApi';
import { contactRoutingApi } from '../api/contactRoutingApi';
import type { ContactInteraction } from '../types/contactCenterExt';
import type { CallbackRequest, ContactQueue } from '../types/contactRouting';
import { apiGet, apiPost, apiPut } from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-500',
  ON_CALL: 'bg-red-500',
  BUSY: 'bg-red-500',
  WRAP_UP: 'bg-amber-500',
  AFTER_CALL: 'bg-amber-500',
  BREAK: 'bg-gray-400',
  ON_BREAK: 'bg-gray-400',
  TRAINING: 'bg-blue-500',
  OFFLINE: 'bg-gray-600',
};

const STATE_ICONS: Record<string, typeof Phone> = {
  AVAILABLE: Phone,
  ON_CALL: PhoneCall,
  BUSY: PhoneCall,
  WRAP_UP: Clock,
  AFTER_CALL: Clock,
  BREAK: Coffee,
  ON_BREAK: Coffee,
  TRAINING: Radio,
  OFFLINE: PhoneOff,
};

const CHANNEL_ICONS: Record<string, typeof Phone> = {
  PHONE: Phone,
  CHAT: MessageSquare,
  EMAIL: Mail,
  SMS: Send,
};

const SENTIMENT_EMOJI: Record<string, string> = {
  POSITIVE: '😊',
  NEUTRAL: '😐',
  NEGATIVE: '😡',
};

// ─── Service Level Gauge ──────────────────────────────────────────────────────

function ServiceLevelGauge({ value, target = 80 }: { value: number; target?: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 90 ? '#22c55e' : pct >= target ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold font-mono" style={{ color }}>{pct.toFixed(0)}%</span>
        <span className="text-[8px] text-muted-foreground">SLA</span>
      </div>
    </div>
  );
}

// ─── Format seconds to m:ss ──────────────────────────────────────────────────

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Queue Card ──────────────────────────────────────────────────────────────

function QueueCard({ queue }: { queue: QueueStatus }) {
  const slaColor = queue.slaPct >= 90 ? 'text-green-600' : queue.slaPct >= 80 ? 'text-amber-600' : 'text-red-600';
  const slaBg = queue.slaPct >= 90 ? 'bg-green-500' : queue.slaPct >= 80 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="surface-card p-5 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{queue.queueName}</h4>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{queue.queueType}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Waiting</p>
          <p className={cn('text-xl font-bold font-mono', queue.waiting > 5 ? 'text-red-600' : '')}>{queue.waiting}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Longest Wait</p>
          <p className="text-xl font-bold font-mono">{fmtTime(queue.longestWaitSec)}</p>
        </div>
      </div>

      {/* SLA bar */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">SLA</span>
          <span className={cn('font-bold font-mono', slaColor)}>{queue.slaPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', slaBg)} style={{ width: `${Math.min(100, queue.slaPct)}%` }} />
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Agents: <span className="font-medium text-foreground">{queue.agentsAvailable}</span> available / {queue.agentsTotal} assigned
      </div>
    </div>
  );
}

// ─── Agent Card ──────────────────────────────────────────────────────────────

function AgentCard({ agent, onStateChange }: { agent: AgentState; onStateChange: (agentId: string, state: string) => void }) {
  const StateIcon = STATE_ICONS[agent.state] ?? Phone;
  const stateColor = STATE_COLORS[agent.state] ?? 'bg-gray-400';

  return (
    <div className="surface-card p-4 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white', stateColor)}>
          <StateIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{agent.agentName}</p>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', stateColor)} />
            <span className="text-xs text-muted-foreground">{agent.state.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Handled:</span> <span className="font-mono font-medium">{agent.callsToday}</span></div>
        <div><span className="text-muted-foreground">AHT:</span> <span className="font-mono">{fmtTime(agent.avgHandleTimeSec)}</span></div>
        <div><span className="text-muted-foreground">FCR:</span> <span className={cn('font-mono font-medium', agent.fcrPct >= 80 ? 'text-green-600' : 'text-amber-600')}>{agent.fcrPct.toFixed(0)}%</span></div>
        <div><span className="text-muted-foreground">Quality:</span> <span className={cn('font-mono font-medium', agent.qualityScore >= 80 ? 'text-green-600' : 'text-amber-600')}>{agent.qualityScore}</span></div>
      </div>

      <select
        value={agent.state}
        onChange={(e) => onStateChange(agent.agentId, e.target.value)}
        className="w-full text-xs rounded-lg border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {['AVAILABLE', 'ON_CALL', 'WRAP_UP', 'BREAK', 'TRAINING', 'OFFLINE'].map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Callback Card ──────────────────────────────────────────────────────────

function CallbackCard({ callback, onAttempt }: { callback: CallbackRequest; onAttempt: (id: number) => void }) {
  const urgencyColor = callback.urgency === 'HIGH' ? 'text-red-600' : callback.urgency === 'MEDIUM' ? 'text-amber-600' : 'text-green-600';
  const isPast = new Date(callback.preferredTime) < new Date();

  return (
    <div className={cn('surface-card p-4 space-y-2', isPast && 'border-amber-300 dark:border-amber-800/40')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">Customer #{callback.customerId}</p>
          <p className="text-xs font-mono text-muted-foreground">{callback.callbackNumber}</p>
        </div>
        <span className={cn('text-xs font-bold', urgencyColor)}>{callback.urgency}</span>
      </div>
      <p className="text-xs text-muted-foreground">{callback.contactReason}</p>
      <div className="flex items-center justify-between text-xs">
        <span className={cn(isPast ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
          {formatDate(callback.preferredTime)}
        </span>
        <span className="text-muted-foreground">
          Attempts: {callback.attemptCount}/{callback.maxAttempts}
        </span>
      </div>
      {callback.assignedAgentId && (
        <p className="text-xs text-muted-foreground">Assigned: {callback.assignedAgentId}</p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onAttempt(callback.id)}
          disabled={callback.status === 'COMPLETED' || callback.status === 'FAILED'}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Phone className="w-3 h-3" /> Attempt Call
        </button>
      </div>
    </div>
  );
}

// ─── New Interaction Form ───────────────────────────────────────────────────

function NewInteractionForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ customerId: '', channel: 'PHONE', contactReason: '', direction: 'INBOUND' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    apiPost('/api/v1/contact-center/interactions', {
      customerId: parseInt(form.customerId, 10),
      channel: form.channel,
      contactReason: form.contactReason,
      direction: form.direction,
    }).then(() => {
      toast.success('Interaction started');
      qc.invalidateQueries({ queryKey: ['contact-center'] });
      onClose();
    }).catch(() => toast.error('Failed to start interaction')).finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">New Interaction</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
            <input type="number" className="w-full mt-1 input" value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Channel</label>
            <select value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))} className="w-full mt-1 input">
              <option value="PHONE">Phone</option>
              <option value="CHAT">Chat</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Direction</label>
            <select value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))} className="w-full mt-1 input">
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Contact Reason</label>
            <input className="w-full mt-1 input" value={form.contactReason} onChange={(e) => setForm((f) => ({ ...f, contactReason: e.target.value }))} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Starting...' : 'Start'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Request Callback Form ──────────────────────────────────────────────────

function RequestCallbackForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ customerId: '', callbackNumber: '', preferredTime: '', reason: '', urgency: 'MEDIUM' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    contactRoutingApi.requestCallback({
      customerId: parseInt(form.customerId, 10),
      callbackNumber: form.callbackNumber,
      preferredTime: form.preferredTime,
      contactReason: form.reason,
      urgency: form.urgency,
    }).then(() => {
      toast.success('Callback scheduled');
      qc.invalidateQueries({ queryKey: ['contact-center'] });
      onClose();
    }).catch(() => toast.error('Failed')).finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Request Callback</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
            <input type="number" className="w-full mt-1 input" value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
            <input className="w-full mt-1 input" placeholder="+234..." value={form.callbackNumber} onChange={(e) => setForm((f) => ({ ...f, callbackNumber: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Preferred Time</label>
            <input type="datetime-local" className="w-full mt-1 input" value={form.preferredTime} onChange={(e) => setForm((f) => ({ ...f, preferredTime: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reason</label>
              <input className="w-full mt-1 input" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Urgency</label>
              <select value={form.urgency} onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))} className="w-full mt-1 input">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Scheduling...' : 'Schedule'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign Interaction Dialog ───────────────────────────────────────────────

function AssignInteractionDialog({ interaction, agents, onClose }: { interaction: ContactInteraction; agents: AgentState[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [agentId, setAgentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const available = agents.filter((a) => a.state === 'AVAILABLE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId) return;
    setSubmitting(true);
    contactCenterApi.assignInteraction(interaction.interactionId, agentId).then(() => {
      toast.success('Interaction assigned');
      qc.invalidateQueries({ queryKey: ['contact-center'] });
      onClose();
    }).catch(() => toast.error('Failed to assign')).finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-1">Assign Interaction</h2>
        <p className="text-xs text-muted-foreground mb-4 font-mono">{interaction.interactionId}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Available Agent</label>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} required className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Select agent...</option>
              {available.map((a) => <option key={a.agentId} value={a.agentId}>{a.agentName} ({a.agentId})</option>)}
            </select>
            {available.length === 0 && <p className="text-xs text-amber-600 mt-1">No agents currently available</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={submitting || !agentId} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {submitting ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Complete Interaction Dialog ─────────────────────────────────────────────

function CompleteInteractionDialog({ interaction, onClose }: { interaction: ContactInteraction; onClose: () => void }) {
  const qc = useQueryClient();
  const [disposition, setDisposition] = useState('RESOLVED');
  const [sentiment, setSentiment] = useState('NEUTRAL');
  const [fcr, setFcr] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    contactCenterApi.completeInteraction(interaction.interactionId, disposition, sentiment, undefined, fcr).then(() => {
      toast.success('Interaction completed');
      qc.invalidateQueries({ queryKey: ['contact-center'] });
      onClose();
    }).catch(() => toast.error('Failed to complete')).finally(() => setSubmitting(false));
  };

  const fc = 'w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-1">Complete Interaction</h2>
        <p className="text-xs text-muted-foreground mb-4 font-mono">{interaction.interactionId}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Disposition</label>
            <select value={disposition} onChange={(e) => setDisposition(e.target.value)} className={fc}>
              {['RESOLVED', 'ESCALATED', 'CALLBACK_SCHEDULED', 'TRANSFERRED', 'VOICEMAIL', 'NO_ANSWER', 'FOLLOW_UP_REQUIRED'].map((d) => (
                <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Sentiment</label>
            <select value={sentiment} onChange={(e) => setSentiment(e.target.value)} className={fc}>
              {['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'VERY_NEGATIVE'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="fcr" checked={fcr} onChange={(e) => setFcr(e.target.checked)} className="rounded" />
            <label htmlFor="fcr" className="text-sm font-medium">First Contact Resolution</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {submitting ? 'Completing...' : 'Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Wallboard View ─────────────────────────────────────────────────────────

function WallboardView({ agents, queues, onExit }: { agents: AgentState[]; queues: QueueStatus[]; onExit: () => void }) {
  const totalWaiting = queues.reduce((s, q) => s + q.waiting, 0);
  const avgWait = queues.length > 0 ? queues.reduce((s, q) => s + q.longestWaitSec, 0) / queues.length : 0;
  const available = agents.filter((a) => a.state === 'AVAILABLE').length;
  const avgSla = queues.length > 0 ? queues.reduce((s, q) => s + q.slaPct, 0) / queues.length : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col" onClick={onExit}>
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <p className="text-sm text-white/60 font-medium">BELLBANK CONTACT CENTER — LIVE</p>
        <button className="text-xs text-white/40 hover:text-white/80">Press anywhere to exit</button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 p-8">
          <div className="text-center">
            <p className="text-white/50 text-sm uppercase tracking-widest mb-2">Waiting</p>
            <p className={cn('text-7xl font-bold font-mono', totalWaiting > 10 ? 'text-red-400 animate-pulse' : 'text-green-400')}>{totalWaiting}</p>
          </div>
          <div className="text-center">
            <p className="text-white/50 text-sm uppercase tracking-widest mb-2">Avg Wait</p>
            <p className="text-7xl font-bold font-mono text-amber-400">{fmtTime(avgWait)}</p>
          </div>
          <div className="text-center">
            <p className="text-white/50 text-sm uppercase tracking-widest mb-2">Available</p>
            <p className="text-7xl font-bold font-mono text-green-400">{available}</p>
          </div>
          <div className="text-center">
            <p className="text-white/50 text-sm uppercase tracking-widest mb-2">SLA</p>
            <p className={cn('text-7xl font-bold font-mono', avgSla >= 80 ? 'text-green-400' : 'text-red-400')}>{avgSla.toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Queue bars */}
      <div className="px-8 pb-6 space-y-2">
        {queues.map((q) => (
          <div key={q.queueName} className="flex items-center gap-4">
            <span className="text-white/60 text-xs w-32 truncate">{q.queueName}</span>
            <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', q.slaPct >= 90 ? 'bg-green-500' : q.slaPct >= 80 ? 'bg-amber-500' : 'bg-red-500')}
                style={{ width: `${Math.min(100, q.slaPct)}%` }}
              />
            </div>
            <span className="text-white/60 text-xs font-mono w-12 text-right">{q.waiting}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ContactCenterPage() {
  useEffect(() => { document.title = 'Contact Center | CBS'; }, []);

  const qc = useQueryClient();
  const [showWallboard, setShowWallboard] = useState(false);
  const [showNewInteraction, setShowNewInteraction] = useState(false);
  const [showRequestCallback, setShowRequestCallback] = useState(false);
  const [showAssign, setShowAssign] = useState<ContactInteraction | null>(null);
  const [showComplete, setShowComplete] = useState<ContactInteraction | null>(null);
  const [agentFilter, setAgentFilter] = useState('');

  // Real-time polling — no .catch() so isError works
  const { data: agents = [], isLoading: agentsLoading, isError: agentsError, isFetching: agentsFetching, refetch: refetchAgents } = useQuery({
    queryKey: ['contact-center', 'agents'],
    queryFn: () => contactCenterApi.getAgentStates(),
    refetchInterval: 10_000,
    retry: 1,
  });
  const { data: queues = [], isLoading: queuesLoading, isError: queuesError, isFetching: queuesFetching, refetch: refetchQueues } = useQuery({
    queryKey: ['contact-center', 'queues'],
    queryFn: () => contactCenterApi.getQueueStatus(),
    refetchInterval: 10_000,
    retry: 1,
  });

  const isError = agentsError || queuesError;
  const isFetching = agentsFetching || queuesFetching;
  const connectionStatus = isError ? 'disconnected' : isFetching ? 'updating' : 'live';
  const { data: interactions = [] } = useQuery({
    queryKey: ['contact-center', 'interactions'],
    queryFn: () => apiGet<ContactInteraction[]>('/api/v1/contact-center/interactions'),
    refetchInterval: 10_000,
  });
  const { data: callbacks = [] } = useQuery({
    queryKey: ['contact-center', 'callbacks'],
    queryFn: () => apiGet<CallbackRequest[]>('/api/v1/contact-center/callbacks'),
    refetchInterval: 15_000,
  });

  const available = agents.filter((a) => a.state === 'AVAILABLE').length;
  const onCall = agents.filter((a) => a.state === 'ON_CALL' || a.state === 'BUSY').length;
  const totalWaiting = queues.reduce((s, q) => s + q.waiting, 0);
  const avgWait = queues.length > 0 ? queues.reduce((s, q) => s + q.longestWaitSec, 0) / queues.length : 0;
  const avgHandle = agents.length > 0 ? agents.reduce((s, a) => s + a.avgHandleTimeSec, 0) / agents.length : 0;
  const avgSla = queues.length > 0 ? queues.reduce((s, q) => s + q.slaPct, 0) / queues.length : 0;
  const avgFcr = agents.length > 0 ? agents.reduce((s, a) => s + a.fcrPct, 0) / agents.length : 0;
  const navigate = useNavigate();

  const filteredAgents = agentFilter ? agents.filter((a) => a.state === agentFilter) : agents;

  const handleStateChange = (agentId: string, newState: string) => {
    contactCenterApi.updateAgentState(agentId, newState).then(() => {
      toast.success(`Agent state updated to ${newState}`);
      qc.invalidateQueries({ queryKey: ['contact-center', 'agents'] });
    }).catch(() => toast.error('Failed to update state'));
  };

  const [cbOutcomeDialog, setCbOutcomeDialog] = useState<{ id: number; customerId: number } | null>(null);
  const [cbOutcome, setCbOutcome] = useState('ANSWERED');

  const handleAttemptCallback = (id: number, customerId?: number) => {
    setCbOutcome('ANSWERED');
    setCbOutcomeDialog({ id, customerId: customerId ?? 0 });
  };

  const confirmCallbackAttempt = () => {
    if (!cbOutcomeDialog) return;
    contactRoutingApi.attemptCallback(cbOutcomeDialog.id, cbOutcome).then(() => {
      toast.success(`Callback recorded as ${cbOutcome}`);
      qc.invalidateQueries({ queryKey: ['contact-center', 'callbacks'] });
      setCbOutcomeDialog(null);
    }).catch(() => toast.error('Failed'));
  };

  // Interaction columns
  const interactionCols: ColumnDef<ContactInteraction, unknown>[] = [
    { accessorKey: 'interactionId', header: 'ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.interactionId}</span> },
    { accessorKey: 'customerId', header: 'Customer', cell: ({ row }) => <span className="text-sm">#{row.original.customerId}</span> },
    {
      accessorKey: 'channel', header: 'Channel',
      cell: ({ row }) => {
        const Icon = CHANNEL_ICONS[row.original.channel] ?? Phone;
        return <span className="flex items-center gap-1.5 text-xs"><Icon className="w-3.5 h-3.5" />{row.original.channel}</span>;
      },
    },
    { accessorKey: 'contactReason', header: 'Reason', cell: ({ row }) => <span className="text-sm truncate max-w-[200px] block">{row.original.contactReason}</span> },
    { accessorKey: 'agentId', header: 'Agent', cell: ({ row }) => <span className="text-xs">{row.original.agentId || '—'}</span> },
    { accessorKey: 'waitTimeSec', header: 'Wait', cell: ({ row }) => <span className="font-mono text-xs">{fmtTime(row.original.waitTimeSec)}</span> },
    { accessorKey: 'handleTimeSec', header: 'Handle', cell: ({ row }) => <span className="font-mono text-xs">{fmtTime(row.original.handleTimeSec)}</span> },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          {row.original.status === 'ACTIVE' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          <StatusBadge status={row.original.status} />
        </span>
      ),
    },
    {
      accessorKey: 'sentiment', header: 'Sentiment',
      cell: ({ row }) => <span className="text-lg">{SENTIMENT_EMOJI[row.original.sentiment] ?? '—'}</span>,
    },
    {
      accessorKey: 'firstContactResolution', header: 'FCR',
      cell: ({ row }) => row.original.firstContactResolution ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => {
        const ix = row.original;
        const isActive = ix.status === 'ACTIVE' || ix.status === 'QUEUED';
        return (
          <div className="flex gap-1">
            {(ix.status === 'QUEUED' || (!ix.agentId && isActive)) && (
              <button onClick={(e) => { e.stopPropagation(); setShowAssign(ix); }} className="ui-action-chip ui-action-chip-info dark:bg-blue-900/30 dark:text-blue-400">
                Assign
              </button>
            )}
            {isActive && ix.agentId && (
              <button onClick={(e) => { e.stopPropagation(); setShowComplete(ix); }} className="ui-action-chip ui-action-chip-success dark:bg-green-900/30 dark:text-green-400">
                Complete
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // Analytics data
  const channelBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    interactions.forEach((i) => { counts[i.channel] = (counts[i.channel] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [interactions]);

  const CHANNEL_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  const sentimentBreakdown = useMemo(() => {
    const counts: Record<string, number> = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
    interactions.forEach((i) => { if (i.sentiment && counts[i.sentiment] !== undefined) counts[i.sentiment]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [interactions]);

  const SENTIMENT_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

  // Agent performance table
  const agentPerfCols: ColumnDef<AgentState, unknown>[] = [
    { accessorKey: 'agentName', header: 'Agent', cell: ({ row }) => <span className="font-medium text-sm">{row.original.agentName}</span> },
    { accessorKey: 'callsToday', header: 'Handled', cell: ({ row }) => <span className="font-mono text-sm">{row.original.callsToday}</span> },
    { accessorKey: 'avgHandleTimeSec', header: 'AHT', cell: ({ row }) => <span className="font-mono text-sm">{fmtTime(row.original.avgHandleTimeSec)}</span> },
    { accessorKey: 'fcrPct', header: 'FCR %', cell: ({ row }) => <span className={cn('font-mono text-sm', row.original.fcrPct >= 80 ? 'text-green-600' : 'text-amber-600')}>{row.original.fcrPct.toFixed(0)}%</span> },
    { accessorKey: 'qualityScore', header: 'Quality', cell: ({ row }) => <span className={cn('font-mono text-sm font-semibold', row.original.qualityScore >= 80 ? 'text-green-600' : row.original.qualityScore >= 60 ? 'text-amber-600' : 'text-red-600')}>{row.original.qualityScore}/100</span> },
  ];

  const pendingCallbacks = callbacks.filter((c) => c.status === 'PENDING' || c.status === 'SCHEDULED');

  const tabs = [
    {
      id: 'queues',
      label: 'Queues',
      badge: totalWaiting || undefined,
      content: (
        <div className="p-4">
          {queuesLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : queues.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No queues configured</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {queues.map((q) => <QueueCard key={q.queueName} queue={q} />)}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'agents',
      label: 'Agents',
      badge: agents.length || undefined,
      content: (
        <div className="p-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'AVAILABLE', 'ON_CALL', 'WRAP_UP', 'BREAK', 'OFFLINE'].map((s) => (
              <button
                key={s}
                onClick={() => setAgentFilter(s)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  agentFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted/40 border-border',
                )}
              >
                {s || 'All'} {s ? `(${agents.filter((a) => a.state === s).length})` : `(${agents.length})`}
              </button>
            ))}
          </div>
          {agentsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAgents.map((a) => <AgentCard key={a.agentId} agent={a} onStateChange={handleStateChange} />)}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'interactions',
      label: 'Interactions',
      badge: interactions.filter((i) => i.status === 'ACTIVE').length || undefined,
      content: (
        <div className="p-4 space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowNewInteraction(true)} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted">
              <Plus className="w-3.5 h-3.5" /> New Interaction
            </button>
          </div>
          <DataTable columns={interactionCols} data={interactions} enableGlobalFilter enableExport exportFilename="interactions" emptyMessage="No interactions" />
        </div>
      ),
    },
    {
      id: 'callbacks',
      label: 'Callbacks',
      badge: pendingCallbacks.length || undefined,
      content: (
        <div className="p-4 space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowRequestCallback(true)} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted">
              <Plus className="w-3.5 h-3.5" /> Request Callback
            </button>
          </div>
          {pendingCallbacks.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No pending callbacks</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingCallbacks.map((cb) => <CallbackCard key={cb.id} callback={cb} onAttempt={handleAttemptCallback} />)}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'analytics',
      label: 'Performance',
      content: (
        <div className="p-4 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="stat-card" aria-live="polite"><div className="stat-label">Total Interactions</div><div className="stat-value">{interactions.length}</div></div>
            <div className="stat-card"><div className="stat-label">Avg Handle Time</div><div className="stat-value font-mono" aria-label={`${Math.floor(avgHandle / 60)} minutes ${Math.floor(avgHandle % 60)} seconds`}>{fmtTime(avgHandle)}</div></div>
            <div className="stat-card"><div className="stat-label">FCR %</div><div className={cn('stat-value', avgFcr >= 80 ? 'text-green-600' : avgFcr >= 60 ? 'text-amber-600' : 'text-red-600')}>{avgFcr.toFixed(0)}%</div></div>
            <div className="stat-card"><div className="stat-label">Avg Wait</div><div className="stat-value font-mono">{fmtTime(avgWait)}</div></div>
            <div className="stat-card"><div className="stat-label">Quality Score</div><div className="stat-value">{agents.length > 0 ? (agents.reduce((s, a) => s + a.qualityScore, 0) / agents.length).toFixed(0) : '--'}</div></div>
            <div className="stat-card"><div className="stat-label">Abandonment</div><div className="stat-value">{interactions.length > 0 ? ((interactions.filter((i) => i.status === 'ABANDONED').length / interactions.length) * 100).toFixed(1) : '0'}%</div></div>
          </div>

          {/* Agent Leaderboard */}
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-4">Agent Leaderboard</h3>
            {(() => {
              const sorted = [...agents].sort((a, b) => b.callsToday - a.callsToday);
              const medals = ['🥇', '🥈', '🥉'];
              const leaderCols: ColumnDef<AgentState, any>[] = [
                { id: 'rank', header: '#', cell: ({ row }) => { const rank = sorted.indexOf(row.original); return rank < 3 ? <span className="text-lg">{medals[rank]}</span> : <span className="text-sm text-muted-foreground tabular-nums">{rank + 1}</span>; }},
                ...agentPerfCols,
              ];
              return <DataTable columns={leaderCols} data={sorted} enableGlobalFilter emptyMessage="No agents" onRowClick={(row) => navigate(`/contact-center/agent/${row.agentId}`)} />;
            })()}
          </div>

          {/* Channel Breakdown Bar */}
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-4">Channel Breakdown</h3>
            {channelBreakdown.length > 0 ? (
              <>
                <div className="h-8 flex rounded-lg overflow-hidden mb-3" role="img" aria-label="Channel distribution">
                  {channelBreakdown.map((ch, i) => {
                    const total = channelBreakdown.reduce((s, c) => s + c.value, 0);
                    const pct = total > 0 ? (ch.value / total) * 100 : 0;
                    return <div key={ch.name} className="flex items-center justify-center text-white text-[10px] font-medium" style={{ width: `${pct}%`, backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} title={`${ch.name}: ${ch.value} (${pct.toFixed(1)}%)`}>{pct > 10 ? `${ch.name} ${pct.toFixed(0)}%` : ''}</div>;
                  })}
                </div>
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Channel</th><th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Count</th><th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">%</th></tr></thead>
                  <tbody className="divide-y">{channelBreakdown.map((ch) => { const total = channelBreakdown.reduce((s, c) => s + c.value, 0); return (<tr key={ch.name} className="hover:bg-muted/20"><td className="px-4 py-2 font-medium">{ch.name}</td><td className="px-4 py-2 text-right tabular-nums">{ch.value}</td><td className="px-4 py-2 text-right tabular-nums">{total > 0 ? ((ch.value / total) * 100).toFixed(1) : 0}%</td></tr>); })}</tbody></table>
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
          </div>

          {/* Hourly Volume Heatmap */}
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-4">Hourly Volume Heatmap</h3>
            <p className="text-xs text-muted-foreground mb-3">Peak hours for staffing decisions</p>
            {(() => {
              const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              const hours = Array.from({ length: 24 }, (_, i) => i);
              const heatData: Record<string, number[]> = {};
              days.forEach((d) => { heatData[d] = hours.map(() => 0); });
              interactions.forEach((ix) => { if (!ix.startedAt) return; const dt = new Date(ix.startedAt); const dayIdx = (dt.getDay() + 6) % 7; const hour = dt.getHours(); if (heatData[days[dayIdx]]) heatData[days[dayIdx]][hour]++; });
              const maxVal = Math.max(...Object.values(heatData).flat(), 1);
              return (
                <div className="overflow-x-auto"><div className="grid gap-px" style={{ gridTemplateColumns: `50px repeat(24, 1fr)`, minWidth: 650 }}>
                  <div />{hours.map((h) => <div key={h} className="text-[9px] text-muted-foreground text-center">{h}</div>)}
                  {days.map((day) => (<div key={day} className="contents"><div className="text-xs font-medium text-muted-foreground flex items-center">{day}</div>{heatData[day].map((val, h) => (<div key={`${day}-${h}`} className="aspect-square rounded-sm" style={{ backgroundColor: `rgba(59, 130, 246, ${val > 0 ? Math.min(val / maxVal, 1) * 0.8 + 0.1 : 0.03})` }} title={`${day} ${h}:00 — ${val}`} />))}</div>))}
                </div></div>
              );
            })()}
          </div>

          {/* SLA Trend (inline SVG) */}
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-4">SLA Trend — Last 7 Days</h3>
            {(() => {
              const avgSlaTargetSec = queues.length > 0 ? queues.reduce((s, q) => s + q.slaTargetSec, 0) / queues.length : 20;
              const now = new Date();
              const slaData = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(now);
                d.setDate(d.getDate() - (6 - i));
                const dayIx = interactions.filter((ix) => {
                  if (!ix.startedAt) return false;
                  const dt = new Date(ix.startedAt);
                  return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth() && dt.getDate() === d.getDate();
                });
                const total = dayIx.length;
                const withinSla = dayIx.filter((ix) => (ix.waitTimeSec ?? 0) <= avgSlaTargetSec).length;
                return { day: i, value: total > 0 ? (withinSla / total) * 100 : avgSla };
              });
              const w = 400, h = 80, pad = 10, maxV = 100, minV = 50, range = maxV - minV;
              const points = slaData.map((d, i) => `${pad + (i / 6) * (w - 2 * pad)},${pad + ((maxV - d.value) / range) * (h - 2 * pad)}`).join(' ');
              const targetY = pad + ((maxV - 80) / range) * (h - 2 * pad);
              const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
              return (
                <div className="flex items-center gap-4">
                  <svg viewBox={`0 0 ${w} ${h + 15}`} width="100%" height={h + 15} className="max-w-lg" role="img" aria-label="SLA trend last 7 days">
                    <line x1={pad} y1={targetY} x2={w - pad} y2={targetY} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1" />
                    <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
                    {slaData.map((d, i) => { const cx = pad + (i / 6) * (w - 2 * pad); const cy = pad + ((maxV - d.value) / range) * (h - 2 * pad); return (<g key={i}><circle cx={cx} cy={cy} r={i === 6 ? 5 : 3} fill={i === 6 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} opacity={i === 6 ? 1 : 0.5} /><text x={cx} y={h + 12} fontSize="8" fill="currentColor" textAnchor="middle" className="text-muted-foreground">{dayLabels[i]}</text></g>); })}
                  </svg>
                  <div className="text-right"><p className="text-xs text-muted-foreground">Today</p><p className={cn('text-2xl font-bold tabular-nums', avgSla >= 80 ? 'text-green-600' : 'text-red-600')}>{avgSla.toFixed(0)}%</p></div>
                </div>
              );
            })()}
          </div>

          {/* Sentiment & Channel Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="surface-card p-5">
              <h3 className="text-sm font-semibold mb-4">Sentiment Analysis</h3>
              <ResponsiveContainer width="100%" height={220}><BarChart data={sentimentBreakdown}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>{sentimentBreakdown.map((_, i) => <Cell key={i} fill={SENTIMENT_COLORS[i]} />)}</Bar></BarChart></ResponsiveContainer>
            </div>
            <div className="surface-card p-5">
              <h3 className="text-sm font-semibold mb-4">Contact by Channel</h3>
              {channelBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={channelBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" paddingAngle={2}>{channelBreakdown.map((_, i) => <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />)}</Pie><Tooltip /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      {showWallboard && <WallboardView agents={agents} queues={queues} onExit={() => setShowWallboard(false)} />}
      {showNewInteraction && <NewInteractionForm onClose={() => setShowNewInteraction(false)} />}
      {showRequestCallback && <RequestCallbackForm onClose={() => setShowRequestCallback(false)} />}
      {showAssign && <AssignInteractionDialog interaction={showAssign} agents={agents} onClose={() => setShowAssign(null)} />}
      {showComplete && <CompleteInteractionDialog interaction={showComplete} onClose={() => setShowComplete(null)} />}
      {cbOutcomeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setCbOutcomeDialog(null)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-semibold mb-1">Record Callback Outcome</h2>
            <p className="text-xs text-muted-foreground mb-4">Callback #{cbOutcomeDialog.id}</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {['ANSWERED', 'NO_ANSWER', 'BUSY', 'VOICEMAIL'].map(o => (
                <label key={o} className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm font-medium',
                  cbOutcome === o ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                )}>
                  <input type="radio" name="cb-outcome" value={o} checked={cbOutcome === o} onChange={() => setCbOutcome(o)} className="sr-only" />
                  {o.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCbOutcomeDialog(null)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={confirmCallbackAttempt} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                Record
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Contact Center"
        subtitle="Real-time queue monitoring, agent management, interaction tracking"
        actions={
          <div className="flex items-center gap-3">
            {/* Connection indicator */}
            <span className={cn('flex items-center gap-1.5 text-xs font-medium',
              connectionStatus === 'live' ? 'text-green-600' :
              connectionStatus === 'updating' ? 'text-amber-600' : 'text-red-600',
            )}>
              <span className={cn('w-2 h-2 rounded-full',
                connectionStatus === 'live' ? 'bg-green-500 animate-pulse' :
                connectionStatus === 'updating' ? 'bg-amber-500' : 'bg-red-500',
              )} />
              {connectionStatus === 'live' ? 'Live' : connectionStatus === 'updating' ? 'Updating...' : 'Disconnected'}
            </span>
            <button onClick={() => setShowWallboard(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              <Monitor className="w-4 h-4" /> Wallboard
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Error banner */}
        {isError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700 dark:text-red-400">Failed to load real-time data. The dashboard may show stale information.</p>
            </div>
            <button onClick={() => { refetchAgents(); refetchQueues(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
              <Loader2 className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Waiting" value={totalWaiting} format="number" icon={Clock} loading={queuesLoading} />
          <StatCard label="In Service" value={onCall} format="number" icon={PhoneCall} loading={agentsLoading} />
          <StatCard label="Available" value={`${available}/${agents.length}`} icon={Users} loading={agentsLoading} />
          <StatCard label="Avg Wait" value={fmtTime(avgWait)} icon={Clock} />
          <StatCard label="Avg Handle" value={fmtTime(avgHandle)} icon={HeadphonesIcon} />
          <div className="stat-card flex items-center justify-center gap-3">
            <ServiceLevelGauge value={avgSla} />
          </div>
        </div>

        {/* Tabs */}
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
