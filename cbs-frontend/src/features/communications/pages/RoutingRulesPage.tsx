import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, GripVertical, Play, Search, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { routingApi, type RoutingRule } from '../api/communicationApi';

const RULE_TYPES = ['SKILL_BASED', 'PRIORITY', 'ROUND_ROBIN', 'LEAST_OCCUPIED', 'PREFERRED_AGENT', 'LANGUAGE', 'VIP', 'OVERFLOW'] as const;
const TYPE_COLORS: Record<string, string> = {
  SKILL_BASED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VIP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  OVERFLOW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PRIORITY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ROUND_ROBIN: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LEAST_OCCUPIED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  PREFERRED_AGENT: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  LANGUAGE: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

const CONDITION_FIELDS = ['customerSegment', 'customerLanguage', 'contactReason', 'channelType', 'timeOfDay', 'dayOfWeek', 'customerSentiment', 'previousAgentId', 'accountBalance'];
const OPERATORS = ['IS', 'IS_NOT', 'GREATER_THAN', 'LESS_THAN', 'IN', 'NOT_IN', 'BETWEEN'];

interface Condition { field: string; operator: string; value: string; }
interface ConditionGroup { logic: 'AND' | 'OR'; conditions: Condition[]; }

function ConditionBuilder({ groups, onChange }: { groups: ConditionGroup[]; onChange: (g: ConditionGroup[]) => void }) {
  const fc = 'px-2 py-1.5 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/50';

  const addCondition = (gi: number) => {
    const next = [...groups];
    next[gi].conditions.push({ field: 'customerSegment', operator: 'IS', value: '' });
    onChange(next);
  };

  const addGroup = () => {
    onChange([...groups, { logic: 'OR', conditions: [{ field: 'customerSegment', operator: 'IS', value: '' }] }]);
  };

  const updateCondition = (gi: number, ci: number, field: keyof Condition, val: string) => {
    const next = [...groups];
    next[gi].conditions[ci] = { ...next[gi].conditions[ci], [field]: val };
    onChange(next);
  };

  const removeCondition = (gi: number, ci: number) => {
    const next = [...groups];
    next[gi].conditions.splice(ci, 1);
    if (next[gi].conditions.length === 0) next.splice(gi, 1);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => (
        <div key={gi} className="rounded-lg border p-3 space-y-2 bg-muted/20">
          {gi > 0 && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground px-2 py-0.5 bg-muted rounded">OR</span>
            </div>
          )}
          {group.conditions.map((cond, ci) => (
            <div key={ci} className="flex items-center gap-2">
              {ci > 0 && <span className="text-xs font-medium text-muted-foreground w-8">AND</span>}
              {ci === 0 && <span className="text-xs font-medium text-muted-foreground w-8">IF</span>}
              <select value={cond.field} onChange={e => updateCondition(gi, ci, 'field', e.target.value)} className={cn(fc, 'w-40')}>
                {CONDITION_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={cond.operator} onChange={e => updateCondition(gi, ci, 'operator', e.target.value)} className={cn(fc, 'w-32')}>
                {OPERATORS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
              </select>
              <input value={cond.value} onChange={e => updateCondition(gi, ci, 'value', e.target.value)}
                placeholder="Value" className={cn(fc, 'flex-1')} />
              <button onClick={() => removeCondition(gi, ci)} className="p-1 rounded hover:bg-red-50 text-red-500"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button onClick={() => addCondition(gi)} className="text-xs text-primary font-medium hover:underline">+ Add Condition</button>
        </div>
      ))}
      <button onClick={addGroup} className="text-xs text-primary font-medium hover:underline">+ Add OR Group</button>
    </div>
  );
}

export function RoutingRulesPage() {
  useEffect(() => { document.title = 'Routing Rules | CBS'; }, []);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showTester, setShowTester] = useState(false);

  // Create form state
  const [form, setForm] = useState({ ruleName: '', ruleType: 'SKILL_BASED', description: '', isActive: true, effectiveFrom: '', effectiveTo: '', targetQueue: '', targetSkillGroup: '', targetAgentId: '', maxWaitBeforeFallback: 60 });
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([{ logic: 'AND', conditions: [{ field: 'customerSegment', operator: 'IS', value: '' }] }]);
  const [step, setStep] = useState(1);

  // Tester state
  const [testCustomerId, setTestCustomerId] = useState('');
  const [testReason, setTestReason] = useState('');
  const [testChannel, setTestChannel] = useState('PHONE');
  const [testResult, setTestResult] = useState<Record<string, string> | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['routing-rules'],
    queryFn: () => routingApi.getRules(),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<RoutingRule>) => routingApi.createRule(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['routing-rules'] }); setShowCreate(false); toast.success('Rule created'); },
    onError: () => toast.error('Failed to create rule'),
  });

  const routeMutation = useMutation({
    mutationFn: ({ customerId, reason, channel }: { customerId: number; reason: string; channel: string }) =>
      routingApi.routeContact(customerId, reason, channel),
    onSuccess: (data) => setTestResult(data),
    onError: () => toast.error('Route test failed'),
  });

  const sorted = useMemo(() => [...rules].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)), [rules]);

  const handleCreate = () => {
    const conditions: Record<string, unknown> = {};
    conditionGroups.forEach((g, i) => {
      g.conditions.forEach((c, j) => {
        conditions[`${g.logic}_${i}_${j}_${c.field}`] = { operator: c.operator, value: c.value };
      });
    });
    createMutation.mutate({
      ...form,
      priority: sorted.length + 1,
      conditions,
    });
  };

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  const condSummary = (conditions: Record<string, unknown> | null) => {
    if (!conditions) return '—';
    const keys = Object.keys(conditions);
    if (keys.length === 0) return 'No conditions';
    return keys.slice(0, 2).map(k => k.split('_').slice(2).join(' ')).join(', ') + (keys.length > 2 ? ` +${keys.length - 2}` : '');
  };

  return (
    <>
      <PageHeader title="Contact Routing Rules" subtitle="Define how contacts are routed to agents and queues"
        actions={
          <div className="flex gap-2">
            <button onClick={() => { setShowTester(true); setTestResult(null); }} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
              <Play className="w-4 h-4" /> Test Route
            </button>
            <button onClick={() => { setShowCreate(true); setStep(1); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              <Plus className="w-4 h-4" /> New Rule
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />)}</div>
        ) : (
          <div className="rounded-lg border overflow-x-auto bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="w-8 px-2 py-2.5"></th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Rule Name</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Conditions</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Target</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Active</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map(rule => (
                  <tr key={rule.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-2 py-3 text-center cursor-grab"><GripVertical className="w-4 h-4 text-muted-foreground" /></td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{rule.priority}</td>
                    <td className="px-4 py-3 font-medium">{rule.ruleName}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', TYPE_COLORS[rule.ruleType] || 'bg-gray-100 text-gray-600')}>
                        {rule.ruleType?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{condSummary(rule.conditions)}</td>
                    <td className="px-4 py-3 text-xs">{rule.targetQueue || rule.targetSkillGroup || rule.targetAgentId || '—'}</td>
                    <td className="px-4 py-3 text-center">{rule.isActive ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-400 mx-auto" />}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{rule.effectiveFrom || '—'} {rule.effectiveTo ? `→ ${rule.effectiveTo}` : ''}</td>
                  </tr>
                ))}
                {sorted.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No routing rules configured.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Rule Dialog (multi-step) ──────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-2xl mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
              <h2 className="text-base font-semibold">New Routing Rule — Step {step}/4</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {step === 1 && (
                <>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Rule Name *</label>
                    <input value={form.ruleName} onChange={e => setForm(p => ({ ...p, ruleName: e.target.value }))} className={fc} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Type</label>
                      <select value={form.ruleType} onChange={e => setForm(p => ({ ...p, ruleType: e.target.value }))} className={fc}>
                        {RULE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                      </select></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Active</label>
                      <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="rounded" /> <span className="text-sm">Enabled</span></label></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Effective From</label>
                      <input type="date" value={form.effectiveFrom} onChange={e => setForm(p => ({ ...p, effectiveFrom: e.target.value }))} className={fc} /></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Effective To</label>
                      <input type="date" value={form.effectiveTo} onChange={e => setForm(p => ({ ...p, effectiveTo: e.target.value }))} className={fc} /></div>
                  </div>
                </>
              )}
              {step === 2 && <ConditionBuilder groups={conditionGroups} onChange={setConditionGroups} />}
              {step === 3 && (
                <>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Target Queue</label>
                    <input value={form.targetQueue} onChange={e => setForm(p => ({ ...p, targetQueue: e.target.value }))} placeholder="e.g. VIP_QUEUE" className={fc} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Target Skill Group</label>
                    <input value={form.targetSkillGroup} onChange={e => setForm(p => ({ ...p, targetSkillGroup: e.target.value }))} placeholder="e.g. TIER1_SUPPORT" className={fc} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Specific Agent (optional)</label>
                    <input value={form.targetAgentId} onChange={e => setForm(p => ({ ...p, targetAgentId: e.target.value }))} className={fc} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Max Wait Before Fallback (sec)</label>
                    <input type="number" value={form.maxWaitBeforeFallback} onChange={e => setForm(p => ({ ...p, maxWaitBeforeFallback: Number(e.target.value) }))} className={cn(fc, 'w-32')} /></div>
                </>
              )}
              {step === 4 && (
                <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
                  <h3 className="font-semibold">Review</h3>
                  <p><strong>Name:</strong> {form.ruleName}</p>
                  <p><strong>Type:</strong> {form.ruleType}</p>
                  <p><strong>Active:</strong> {form.isActive ? 'Yes' : 'No'}</p>
                  <p><strong>Conditions:</strong> {conditionGroups.reduce((s, g) => s + g.conditions.length, 0)} condition(s)</p>
                  <p><strong>Target:</strong> {form.targetQueue || form.targetSkillGroup || form.targetAgentId || '—'}</p>
                  <p><strong>Period:</strong> {form.effectiveFrom || 'N/A'} → {form.effectiveTo || 'N/A'}</p>
                </div>
              )}
              <div className="flex gap-2 pt-3 border-t">
                {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>}
                <div className="flex-1" />
                {step < 4 && <button onClick={() => setStep(s => s + 1)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Next</button>}
                {step === 4 && <button onClick={handleCreate} disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Rule
                </button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Route Tester Dialog ───────────────────────────────────────── */}
      {showTester && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowTester(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Test Route</h3><button onClick={() => setShowTester(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Customer ID</label>
                <input type="number" value={testCustomerId} onChange={e => setTestCustomerId(e.target.value)} className={fc} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Reason</label>
                <input value={testReason} onChange={e => setTestReason(e.target.value)} placeholder="e.g. ACCOUNT_INQUIRY" className={fc} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Channel</label>
                <select value={testChannel} onChange={e => setTestChannel(e.target.value)} className={fc}>
                  {['PHONE', 'CHAT', 'EMAIL', 'SOCIAL'].map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
            </div>
            <button onClick={() => routeMutation.mutate({ customerId: Number(testCustomerId), reason: testReason, channel: testChannel })}
              disabled={!testCustomerId || !testReason || routeMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
              {routeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Route
            </button>
            {testResult && (
              <div className="rounded-lg border bg-green-50 dark:bg-green-900/20 p-4 space-y-1">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-sm font-semibold text-green-700 dark:text-green-400">Route Result</span></div>
                {Object.entries(testResult).map(([k, v]) => (
                  <p key={k} className="text-xs"><strong>{k}:</strong> {v}</p>
                ))}
              </div>
            )}
            {routeMutation.isError && (
              <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700 dark:text-amber-400">No matching rule found.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
