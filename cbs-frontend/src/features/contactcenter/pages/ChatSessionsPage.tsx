import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Bot, User, ArrowUpRight, Square, Send,
  Loader2, X, AlertTriangle, Activity, Users, Smile, Meh, Frown,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, EmptyState } from '@/components/shared';
import { formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useDialogueCustomerSessions,
  useAddDialogueMessage,
  useEscalateDialogue,
  useEndDialogueSession,
} from '../hooks/useContactCenter';
import type { DialogueSession, DialogueMessage } from '../types/dialogue';
import { apiGet } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

// ─── Sentiment ──────────────────────────────────────────────────────────────

const SENTIMENT_MAP: Record<string, { emoji: string; color: string }> = {
  POSITIVE: { emoji: '😊', color: 'text-green-600' },
  NEUTRAL: { emoji: '😐', color: 'text-amber-600' },
  NEGATIVE: { emoji: '😞', color: 'text-red-600' },
};

// ─── Chat Transcript ────────────────────────────────────────────────────────

function ChatTranscript({ messages }: { messages: DialogueMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No messages in this session</p>;
  }

  return (
    <div ref={scrollRef} className="space-y-3 max-h-[400px] overflow-y-auto px-1 py-2">
      {messages.map((msg) => {
        const isBot = msg.senderType === 'BOT' || msg.senderType === 'SYSTEM';
        const isSystem = msg.senderType === 'SYSTEM';

        if (isSystem) {
          return (
            <div key={msg.id} className="text-center">
              <span className="text-[10px] text-muted-foreground italic bg-muted/50 px-3 py-1 rounded-full">{msg.content}</span>
            </div>
          );
        }

        return (
          <div key={msg.id} className={cn('flex', isBot ? 'justify-start' : 'justify-end')}>
            <div className={cn('max-w-[80%]')}>
              <div className={cn(
                'px-3.5 py-2.5 rounded-2xl text-sm',
                isBot ? 'bg-muted rounded-bl-md' : 'bg-primary text-primary-foreground rounded-br-md',
              )}>
                {msg.content}
              </div>
              <div className={cn('flex items-center gap-2 px-1 mt-0.5', isBot ? '' : 'flex-row-reverse')}>
                <span className="text-[10px] text-muted-foreground">{formatRelative(msg.createdAt)}</span>
                {isBot && msg.intentDetected && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[9px] font-medium">
                    {msg.intentDetected}
                  </span>
                )}
                {isBot && msg.confidenceScore > 0 && (
                  <span className="text-[9px] text-muted-foreground">{Math.round(msg.confidenceScore * 100)}%</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Session Detail Slide-over ──────────────────────────────────────────────

function SessionDetailPanel({ session, onClose }: { session: DialogueSession; onClose: () => void }) {
  const [newMessage, setNewMessage] = useState('');
  const addMessage = useAddDialogueMessage();
  const escalate = useEscalateDialogue();
  const endSession = useEndDialogueSession();

  const { data: messages = [] } = useQuery({
    queryKey: ['dialogue', 'messages', session.sessionCode],
    queryFn: () => apiGet<DialogueMessage[]>(`/api/v1/dialogue/${session.sessionCode}/messages`),
    enabled: !!session.sessionCode,
    refetchInterval: session.status === 'ACTIVE' ? 5_000 : undefined,
  });

  const { data: customerSessions = [] } = useDialogueCustomerSessions(session.customerId);
  const pastSessions = customerSessions.filter((s) => s.id !== session.id);
  const sentimentInfo = SENTIMENT_MAP[session.customerSentiment] ?? SENTIMENT_MAP.NEUTRAL;
  const isActive = session.status === 'ACTIVE';

  const handleSend = () => {
    if (!newMessage.trim()) return;
    addMessage.mutate({ code: session.sessionCode, data: { content: newMessage, senderType: 'AGENT', contentType: 'TEXT' } as Partial<DialogueMessage> }, {
      onSuccess: () => { setNewMessage(''); toast.success('Message sent'); },
      onError: () => toast.error('Failed to send'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-background shadow-xl flex flex-col">
        <div className="border-b px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{session.sessionCode}</h2>
              {isActive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
              <StatusBadge status={session.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customer #{session.customerId} · {session.channel} · {sentimentInfo.emoji}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-3 border-b bg-muted/20 flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
          <span>Intent: <span className="font-medium text-foreground">{session.intent || '—'}</span></span>
          <span>Messages: <span className="font-medium text-foreground">{session.messagesCount}</span></span>
          <span>Started: {formatRelative(session.startedAt)}</span>
          {session.escalatedToHuman && <span className="text-amber-600 font-medium">Escalated</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          <ChatTranscript messages={messages} />
        </div>

        {isActive && (
          <div className="border-t px-4 py-3 space-y-2 flex-shrink-0">
            <div className="flex gap-2">
              <input className="flex-1 input text-sm" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
              <button onClick={handleSend} disabled={!newMessage.trim() || addMessage.isPending} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              {!session.escalatedToHuman && (
                <button onClick={() => escalate.mutate(session.sessionCode, { onSuccess: () => toast.success('Escalated'), onError: () => toast.error('Failed') })} disabled={escalate.isPending} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                </button>
              )}
              <button onClick={() => endSession.mutate(session.sessionCode, { onSuccess: () => { toast.success('Session ended'); onClose(); }, onError: () => toast.error('Failed') })} disabled={endSession.isPending} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10">
                <Square className="w-3.5 h-3.5" /> End Session
              </button>
            </div>
          </div>
        )}

        {pastSessions.length > 0 && (
          <div className="border-t px-4 py-3 flex-shrink-0">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Customer History ({pastSessions.length})</p>
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {pastSessions.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/30">
                  <span className="font-mono">{s.sessionCode}</span>
                  <span className="text-muted-foreground">{s.intent || '—'}</span>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ChatSessionsPage() {
  useEffect(() => { document.title = 'Chat Sessions | CBS'; }, []);

  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSession, setSelectedSession] = useState<DialogueSession | null>(null);

  const { data: sessions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['dialogue', 'sessions', statusFilter],
    queryFn: () => apiGet<DialogueSession[]>('/api/v1/dialogue/sessions', statusFilter ? { status: statusFilter } : undefined),
    refetchInterval: 10_000,
  });

  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE');
  const escalatedSessions = sessions.filter((s) => s.escalatedToHuman);
  const avgMessages = sessions.length > 0 ? sessions.reduce((s, sess) => s + sess.messagesCount, 0) / sessions.length : 0;

  const STATUS_FILTERS = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Escalated', value: 'ESCALATED' },
    { label: 'Ended', value: 'ENDED' },
  ];

  const sessionCols: ColumnDef<DialogueSession, unknown>[] = [
    { accessorKey: 'sessionCode', header: 'Session', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.sessionCode}</span> },
    { accessorKey: 'customerId', header: 'Customer', cell: ({ row }) => <span className="text-sm">#{row.original.customerId}</span> },
    { accessorKey: 'channel', header: 'Channel', cell: ({ row }) => <StatusBadge status={row.original.channel} /> },
    { accessorKey: 'intent', header: 'Intent', cell: ({ row }) => <span className="text-sm truncate max-w-[150px] block">{row.original.intent || '—'}</span> },
    { accessorKey: 'messagesCount', header: 'Messages', cell: ({ row }) => <span className="text-xs font-mono">{row.original.messagesCount}</span> },
    {
      accessorKey: 'customerSentiment', header: 'Sentiment',
      cell: ({ row }) => {
        const info = SENTIMENT_MAP[row.original.customerSentiment];
        return info ? <span className={cn('text-lg', info.color)}>{info.emoji}</span> : <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'escalatedToHuman', header: 'Escalated',
      cell: ({ row }) => row.original.escalatedToHuman
        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Yes</span>
        : <span className="text-xs text-muted-foreground">No</span>,
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          {row.original.status === 'ACTIVE' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          <StatusBadge status={row.original.status} />
        </span>
      ),
    },
    { accessorKey: 'startedAt', header: 'Started', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.startedAt)}</span> },
  ];

  if (isError) {
    return (
      <>
        <PageHeader title="Chat Sessions" />
        <div className="page-container">
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 dark:text-red-400 font-medium">Failed to load chat sessions</p>
            <button onClick={() => refetch()} className="mt-3 text-sm text-primary hover:underline">Retry</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {selectedSession && <SessionDetailPanel session={selectedSession} onClose={() => setSelectedSession(null)} />}

      <PageHeader
        title="Chat Sessions"
        subtitle="AI dialogue sessions and human escalations"
        actions={activeSessions.length > 0 ? (
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {activeSessions.length} active
          </span>
        ) : undefined}
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Active Sessions" value={activeSessions.length} format="number" icon={MessageSquare} loading={isLoading} />
          <StatCard label="Escalated" value={escalatedSessions.length} format="number" icon={ArrowUpRight} loading={isLoading} />
          <StatCard label="Total Sessions" value={sessions.length} format="number" icon={Users} loading={isLoading} />
          <StatCard label="Avg Messages" value={avgMessages.toFixed(1)} icon={Activity} loading={isLoading} />
        </div>

        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button key={f.label} onClick={() => setStatusFilter(f.value)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                statusFilter === f.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted/40 border-border',
              )}>
              {f.label}
            </button>
          ))}
        </div>

        <DataTable columns={sessionCols} data={sessions} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="chat-sessions" emptyMessage="No chat sessions found" pageSize={20} onRowClick={(row) => setSelectedSession(row)} />
      </div>
    </>
  );
}
