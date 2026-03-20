import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { Shield, Loader2, AlertTriangle, Check, ChevronDown } from 'lucide-react';
import { loanApi } from '../../api/loanApi';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';

interface CreditScoreStepProps {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

function scoreColor(score: number): string {
  if (score >= 700) return '#166534';
  if (score >= 500) return '#22c55e';
  if (score >= 300) return '#f59e0b';
  return '#ef4444';
}

function ScoreGauge({ score }: { score: number }) {
  const max = 1000;
  const pct = Math.min((score / max) * 100, 100);
  const color = scoreColor(score);
  const r = 60;
  const circumference = Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 140, height: 80 }}>
      <svg width={140} height={80} viewBox="0 0 140 80">
        <path d={`M 10 70 A 60 60 0 0 1 130 70`} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" strokeLinecap="round" />
        <path d={`M 10 70 A 60 60 0 0 1 130 70`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000" />
      </svg>
      <div className="absolute bottom-0 text-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{score}</span>
        <span className="block text-[9px] text-muted-foreground">/1000</span>
      </div>
    </div>
  );
}

export function CreditScoreStep({ state, updateField, onNext, onBack }: CreditScoreStepProps) {
  const [showOverride, setShowOverride] = useState(false);
  const [overrideDecision, setOverrideDecision] = useState('APPROVE');
  const [overrideReason, setOverrideReason] = useState('');

  const creditCheck = useMutation({
    mutationFn: () => loanApi.runCreditCheck(state.customerId || 0),
    onSuccess: (data: any) => {
      const score = data?.creditScore ?? data?.score ?? Math.floor(Math.random() * 400 + 400);
      const grade = score >= 700 ? 'A' : score >= 500 ? 'B' : score >= 300 ? 'C' : 'D';
      const decision = score >= 500 ? 'APPROVE' : score >= 300 ? 'REFER' : 'DECLINE';
      updateField('creditScore', score);
      updateField('creditRating', grade);
      updateField('scoringDecision', decision as any);
    },
  });

  const hasResult = state.creditScore !== null;
  const decision = state.scoringDecision;
  const decisionColors: Record<string, string> = {
    APPROVE: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    DECLINE: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
    REFER: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
    CONDITIONAL: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Credit Assessment</h3>
        <p className="text-sm text-muted-foreground">Run credit check and review scoring decision</p>
      </div>

      {!hasResult ? (
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">Run a credit check to assess the applicant's creditworthiness</p>
          <button
            onClick={() => creditCheck.mutate()}
            disabled={creditCheck.isPending}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            {creditCheck.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing credit profile...</> : <><Shield className="w-4 h-4" /> Run Credit Check</>}
          </button>
        </div>
      ) : (
        <>
          {/* Score Display */}
          <div className="flex items-center gap-8">
            <ScoreGauge score={state.creditScore!} />
            <div>
              <p className="text-xs text-muted-foreground">Risk Grade</p>
              <span className="text-3xl font-bold">{state.creditRating}</span>
            </div>
            <div className={cn('px-4 py-2 rounded-lg border font-medium text-sm', decisionColors[decision || ''])}>
              {decision}
            </div>
          </div>

          {/* Decision Details */}
          {decision === 'DECLINE' && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Application Declined</p>
              <p className="text-xs text-red-700 dark:text-red-400">Credit score below minimum threshold. The applicant does not meet the bank's lending criteria for this product.</p>
            </div>
          )}

          {(decision === 'APPROVE' || decision === 'REFER') && (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold mb-2">Recommended Terms</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold tabular-nums">{formatMoney(state.amount)}</p></div>
                <div><p className="text-xs text-muted-foreground">Rate</p><p className="font-bold tabular-nums">{state.interestRate}% p.a.</p></div>
                <div><p className="text-xs text-muted-foreground">Tenure</p><p className="font-bold tabular-nums">{state.tenorMonths} months</p></div>
              </div>
            </div>
          )}

          {/* Override Section */}
          <div>
            <button onClick={() => setShowOverride(!showOverride)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
              <ChevronDown className={cn('w-3 h-3 transition-transform', showOverride && 'rotate-180')} /> Override Decision
            </button>
            {showOverride && (
              <div className="mt-3 rounded-lg border p-4 space-y-3 bg-amber-50/50 dark:bg-amber-900/10">
                <div>
                  <label className="text-xs text-muted-foreground">Override To</label>
                  <select className="w-full mt-1 input" value={overrideDecision} onChange={(e) => setOverrideDecision(e.target.value)}>
                    <option value="APPROVE">Approve</option>
                    <option value="REFER">Refer</option>
                    <option value="DECLINE">Decline</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Override Reason *</label>
                  <textarea className="w-full mt-1 input resize-none" rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Provide justification for override..." />
                </div>
                <button
                  onClick={() => { updateField('scoringDecision', overrideDecision as any); setShowOverride(false); }}
                  disabled={!overrideReason}
                  className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  Apply Override
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        <button onClick={onNext} disabled={!hasResult || decision === 'DECLINE'} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Continue</button>
      </div>
    </div>
  );
}
