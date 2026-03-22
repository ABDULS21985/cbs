import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Phone,
  Send,
  RefreshCw,
  Terminal,
  Loader2,
  X,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { cn } from '@/lib/utils';
import { ussdApi } from '../api/digitalBankingApi';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UssdResponse {
  sessionId: string;
  text: string;
  continueSession: boolean;
}

interface HistoryEntry {
  role: 'system' | 'user';
  text: string;
  timestamp: string;
}

// ─── USSD Request Mutation ──────────────────────────────────────────────────

function useUssdRequest() {
  return useMutation({
    mutationFn: (params: { msisdn: string; sessionId?: string; input?: string }) =>
      ussdApi.processRequest(params) as Promise<UssdResponse>,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function UssdSimulatorPage() {
  const [msisdn, setMsisdn] = useState('+2348012345678');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: sendRequest, isPending } = useUssdRequest();

  // Auto-scroll terminal to bottom when history changes
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input when session becomes active
  useEffect(() => {
    if (sessionActive && !isPending) {
      inputRef.current?.focus();
    }
  }, [sessionActive, isPending]);

  const appendHistory = useCallback((role: 'system' | 'user', text: string) => {
    setHistory((prev) => [...prev, { role, text, timestamp: new Date().toISOString() }]);
  }, []);

  const handleUssdResponse = useCallback(
    (data: UssdResponse) => {
      // Capture session ID from first response
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      } else if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      const displayText = data.text || data.sessionId || 'No response text';
      appendHistory('system', displayText);

      if (!data.continueSession) {
        setSessionActive(false);
        appendHistory('system', '--- Session Ended ---');
      } else {
        setSessionActive(true);
      }
    },
    [sessionId, appendHistory],
  );

  const handleError = useCallback(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : 'USSD request failed';
      toast.error(message);
      appendHistory('system', `[ERROR] ${message}`);
      setSessionActive(false);
    },
    [appendHistory],
  );

  const startSession = useCallback(() => {
    const trimmed = msisdn.trim();
    if (!trimmed) {
      toast.error('Please enter a phone number');
      return;
    }

    // Reset state
    setSessionId(null);
    setSessionActive(false);
    setHistory([]);
    setInput('');

    appendHistory('system', `Dialing USSD from ${trimmed}...`);

    sendRequest(
      { msisdn: trimmed },
      {
        onSuccess: handleUssdResponse,
        onError: handleError,
      },
    );
  }, [msisdn, sendRequest, handleUssdResponse, handleError, appendHistory]);

  const sendInput = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !sessionId) return;

    appendHistory('user', trimmed);
    setInput('');

    sendRequest(
      { msisdn: msisdn.trim(), sessionId, input: trimmed },
      {
        onSuccess: handleUssdResponse,
        onError: handleError,
      },
    );
  }, [input, sessionId, msisdn, sendRequest, handleUssdResponse, handleError, appendHistory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !isPending) {
        e.preventDefault();
        sendInput();
      }
    },
    [sendInput, isPending],
  );

  const clearSession = useCallback(() => {
    setSessionId(null);
    setSessionActive(false);
    setHistory([]);
    setInput('');
  }, []);

  return (
    <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER']}>
      <PageHeader
        title="USSD Simulator"
        subtitle="Test USSD banking flows with a simulated terminal"
        backTo="/channels/digital"
        icon={Terminal}
        iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        iconColor="text-emerald-600 dark:text-emerald-400"
      />

      <div className="page-container space-y-6">
        {/* Controls Bar */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            {/* MSISDN Input */}
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <label htmlFor="msisdn" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Phone Number (MSISDN)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="msisdn"
                  type="tel"
                  value={msisdn}
                  onChange={(e) => setMsisdn(e.target.value)}
                  placeholder="+2348012345678"
                  disabled={sessionActive}
                  className={cn(
                    'w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                />
              </div>
            </div>

            {/* Session Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={startSession}
                disabled={isPending || !msisdn.trim()}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  'bg-emerald-600 text-white hover:bg-emerald-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isPending && !sessionActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {sessionActive ? 'New Session' : 'Start Session'}
              </button>

              {(sessionActive || history.length > 0) && (
                <button
                  onClick={clearSession}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Session Info */}
          {sessionId && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Session:</span>
                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px]">
                  {sessionId}
                </code>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    sessionActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400',
                  )}
                />
                <span className={cn('font-medium', sessionActive ? 'text-emerald-600 dark:text-emerald-400' : '')}>
                  {sessionActive ? 'Active' : 'Completed'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Phone Simulator */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {/* Phone Frame */}
            <div className="rounded-3xl border-2 border-gray-300 dark:border-gray-600 bg-gray-900 p-2 shadow-2xl">
              {/* Phone Notch */}
              <div className="flex justify-center mb-1">
                <div className="w-24 h-1.5 rounded-full bg-gray-700" />
              </div>

              {/* Screen */}
              <div className="rounded-2xl overflow-hidden bg-gray-950 border border-gray-800">
                {/* Header Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400 font-mono">USSD</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-[10px] text-gray-500 font-mono">
                      {history.length > 0 ? `${history.filter((h) => h.role === 'system' && !h.text.startsWith('---') && !h.text.startsWith('[') && !h.text.startsWith('Dialing')).length} msg` : 'idle'}
                    </span>
                  </div>
                </div>

                {/* Terminal Display */}
                <div className="h-80 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-700">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                      <Terminal className="w-10 h-10" />
                      <p className="text-xs font-mono text-center">
                        Enter a phone number and click
                        <br />
                        &quot;Start Session&quot; to begin
                      </p>
                    </div>
                  ) : (
                    history.map((entry, idx) => (
                      <div key={idx} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
                        {entry.role === 'user' ? (
                          <div className="flex justify-end">
                            <div className="max-w-[85%] px-3 py-1.5 rounded-lg bg-emerald-900/50 border border-emerald-800/50">
                              <p className="text-sm font-mono text-emerald-300">{entry.text}</p>
                              <p className="text-[9px] text-emerald-700 mt-0.5 text-right">
                                {formatTime(entry.timestamp)}
                              </p>
                            </div>
                          </div>
                        ) : entry.text.startsWith('---') ? (
                          <div className="flex items-center gap-2 py-1">
                            <div className="flex-1 h-px bg-gray-800" />
                            <span className="text-[10px] font-mono text-gray-600">{entry.text.replace(/---/g, '').trim()}</span>
                            <div className="flex-1 h-px bg-gray-800" />
                          </div>
                        ) : entry.text.startsWith('[ERROR]') ? (
                          <div className="px-3 py-2 rounded-lg bg-red-950/50 border border-red-900/50">
                            <p className="text-xs font-mono text-red-400 whitespace-pre-wrap">
                              {entry.text}
                            </p>
                            <p className="text-[9px] text-red-800 mt-0.5">{formatTime(entry.timestamp)}</p>
                          </div>
                        ) : entry.text.startsWith('Dialing') ? (
                          <div className="px-3 py-1.5 rounded-lg bg-gray-800/50">
                            <p className="text-xs font-mono text-gray-400 italic">{entry.text}</p>
                            <p className="text-[9px] text-gray-700 mt-0.5">{formatTime(entry.timestamp)}</p>
                          </div>
                        ) : (
                          <div className="max-w-[95%]">
                            <div className="px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700/50">
                              <p className="text-sm font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
                                {entry.text}
                              </p>
                              <p className="text-[9px] text-gray-600 mt-1">{formatTime(entry.timestamp)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Loading indicator */}
                  {isPending && (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                      <span className="text-xs font-mono text-gray-500">Processing...</span>
                    </div>
                  )}

                  <div ref={terminalEndRef} />
                </div>

                {/* Input Bar */}
                <div className="border-t border-gray-800 bg-gray-900 p-3">
                  {sessionActive ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter option..."
                        disabled={isPending}
                        className={cn(
                          'flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2',
                          'text-sm font-mono text-emerald-300 placeholder:text-gray-600',
                          'focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-600',
                          'disabled:opacity-50',
                        )}
                      />
                      <button
                        onClick={sendInput}
                        disabled={isPending || !input.trim()}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          'bg-emerald-600 text-white hover:bg-emerald-700',
                          'disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                      >
                        {isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ) : history.length > 0 ? (
                    <div className="flex items-center justify-center gap-2 py-1">
                      <span className="text-xs font-mono text-gray-600">Session ended</span>
                      <button
                        onClick={startSession}
                        disabled={isPending}
                        className="text-xs font-mono text-emerald-500 hover:text-emerald-400 underline transition-colors"
                      >
                        Start new session
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-1">
                      <span className="text-xs font-mono text-gray-600">No active session</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone Bottom */}
              <div className="flex justify-center mt-2 mb-1">
                <div className="w-16 h-1 rounded-full bg-gray-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Log (Expanded View) */}
        {history.length > 0 && (
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Conversation Log</h3>
                <span className="text-xs text-muted-foreground">({history.length} entries)</span>
              </div>
              <button
                onClick={clearSession}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="divide-y max-h-72 overflow-y-auto">
              {history.map((entry, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-start gap-3 px-5 py-2.5 text-sm',
                    entry.role === 'user' ? 'bg-muted/30' : '',
                  )}
                >
                  <span
                    className={cn(
                      'shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase',
                      entry.role === 'user'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                    )}
                  >
                    {entry.role === 'user' ? 'you' : 'sys'}
                  </span>
                  <pre className="flex-1 whitespace-pre-wrap font-mono text-xs leading-relaxed break-words">
                    {entry.text}
                  </pre>
                  <span className="shrink-0 text-[10px] text-muted-foreground font-mono mt-0.5">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
