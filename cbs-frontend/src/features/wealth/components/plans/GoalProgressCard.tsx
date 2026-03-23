import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { CheckCircle, AlertTriangle, XCircle, TrendingUp, Plus, Target } from 'lucide-react';
import { formatMoney, formatMoneyCompact, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { WealthGoal } from '../../api/wealthApi';

interface GoalProgressCardProps {
  goals: WealthGoal[];
  planCode: string;
  onAddGoal?: (goal: Omit<WealthGoal, 'id'>) => void;
  isAdding?: boolean;
}

function statusIcon(status: WealthGoal['status']) {
  if (status === 'ON_TRACK') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'AT_RISK') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

function statusColor(status: WealthGoal['status']) {
  if (status === 'ON_TRACK') return 'text-green-600 bg-green-50';
  if (status === 'AT_RISK') return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

function barColor(status: WealthGoal['status']) {
  if (status === 'ON_TRACK') return 'bg-green-500';
  if (status === 'AT_RISK') return 'bg-amber-500';
  return 'bg-red-500';
}

function projectGoal(goal: WealthGoal): { projected: number; monthsLeft: number; monthlyNeeded: number } | null {
  if (!goal.targetDate) return null;
  const target = new Date(goal.targetDate);
  const now = new Date();
  const monthsLeft = Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
  if (monthsLeft === 0) return null;
  const remaining = goal.targetAmount - goal.currentAmount;
  const monthlyNeeded = remaining > 0 ? remaining / monthsLeft : 0;
  // Simple projection: current + monthly * months
  const projected = goal.currentAmount + (goal.monthlyContribution || 0) * monthsLeft;
  return { projected, monthsLeft, monthlyNeeded };
}

function buildProjectionData(goal: WealthGoal) {
  const projection = projectGoal(goal);
  if (!projection) return [];
  const months = Math.min(projection.monthsLeft, 36);
  const data = [];
  for (let i = 0; i <= months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const current = goal.currentAmount + (goal.monthlyContribution || 0) * i;
    const optimistic = goal.currentAmount + (goal.monthlyContribution || 0) * i * 1.15;
    const pessimistic = goal.currentAmount + (goal.monthlyContribution || 0) * i * 0.85;
    data.push({ month: label, current: Math.round(current), optimistic: Math.round(optimistic), pessimistic: Math.round(pessimistic), target: goal.targetAmount });
  }
  return data;
}

export function GoalProgressCard({ goals, planCode: _planCode, onAddGoal, isAdding }: GoalProgressCardProps) {
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState<Omit<WealthGoal, 'id'>>({
    name: '', targetAmount: 0, currentAmount: 0, targetDate: '',
    priority: 'MEDIUM', status: 'ON_TRACK', monthlyContribution: 0,
  });

  const onTrackCount = goals.filter((g) => g.status === 'ON_TRACK').length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAddGoal?.(newGoal);
    setShowAddForm(false);
    setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, targetDate: '', priority: 'MEDIUM', status: 'ON_TRACK', monthlyContribution: 0 });
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{onTrackCount}</span> of{' '}
          <span className="font-semibold text-foreground">{goals.length}</span> goals on track
        </p>
        <button onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Goal
        </button>
      </div>

      {/* Goal Cards */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
          <Target className="w-8 h-8 opacity-40" />
          <p className="text-sm">No goals defined yet</p>
        </div>
      ) : (
        goals.map((goal) => {
          const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
          const projection = projectGoal(goal);
          const isExpanded = expandedGoal === goal.id;
          const projData = isExpanded ? buildProjectionData(goal) : [];
          const aboveTarget = projection && projection.projected >= goal.targetAmount;

          return (
            <div key={goal.id} className="surface-card overflow-hidden">
              <div className="p-4 space-y-3 cursor-pointer" onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(goal.status)}
                    <span className="text-sm font-semibold">{goal.name}</span>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', statusColor(goal.status))}>
                    {goal.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Target: {formatMoney(goal.targetAmount)}</span>
                  {goal.targetDate && <span>by {formatDate(goal.targetDate)}</span>}
                  {goal.monthlyContribution > 0 && <span>{formatMoneyCompact(goal.monthlyContribution)}/month</span>}
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono">{formatMoneyCompact(goal.currentAmount)} / {formatMoneyCompact(goal.targetAmount)}</span>
                    <span className="font-semibold">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-500', barColor(goal.status))} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Projection summary */}
                {projection && (
                  <div className="flex items-center gap-2 text-xs">
                    <TrendingUp className={cn('w-3.5 h-3.5', aboveTarget ? 'text-green-500' : 'text-amber-500')} />
                    <span>
                      Projected at current rate: <strong>{formatMoneyCompact(projection.projected)}</strong>
                      {aboveTarget ? (
                        <span className="text-green-600"> ({formatPercent(((projection.projected / goal.targetAmount) - 1) * 100)} above target)</span>
                      ) : (
                        <span className="text-amber-600"> (need {formatMoneyCompact(projection.monthlyNeeded)}/month)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Expanded: Projection Chart */}
              {isExpanded && projData.length > 2 && (
                <div className="px-4 pb-4 border-t pt-3">
                  <h4 className="text-xs font-semibold mb-2">Goal Projection</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={projData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                      <YAxis tickFormatter={(v) => formatMoneyCompact(v)} tick={{ fontSize: 9 }} width={50} />
                      <Tooltip formatter={(v: number) => formatMoney(v)} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <ReferenceLine y={goal.targetAmount} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Target', fontSize: 9, fill: '#ef4444' }} />
                      <Line type="monotone" dataKey="optimistic" stroke="#10b981" strokeWidth={1} strokeDasharray="4 2" dot={false} name="Optimistic" />
                      <Line type="monotone" dataKey="current" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Current Rate" />
                      <Line type="monotone" dataKey="pessimistic" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" dot={false} name="Pessimistic" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Add Goal Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="surface-card p-4 space-y-3">
          <h4 className="text-sm font-semibold">New Financial Goal</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Goal Name</label>
              <input required value={newGoal.name} onChange={(e) => setNewGoal((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm" placeholder="e.g. Retirement Fund" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Target Amount</label>
              <input type="number" min={0} required value={newGoal.targetAmount || ''} onChange={(e) => setNewGoal((p) => ({ ...p, targetAmount: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Current Amount</label>
              <input type="number" min={0} value={newGoal.currentAmount || ''} onChange={(e) => setNewGoal((p) => ({ ...p, currentAmount: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Target Date</label>
              <input type="date" value={newGoal.targetDate} onChange={(e) => setNewGoal((p) => ({ ...p, targetDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Monthly Contribution</label>
              <input type="number" min={0} value={newGoal.monthlyContribution || ''} onChange={(e) => setNewGoal((p) => ({ ...p, monthlyContribution: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Priority</label>
              <select value={newGoal.priority} onChange={(e) => setNewGoal((p) => ({ ...p, priority: e.target.value as WealthGoal['priority'] }))}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted">Cancel</button>
            <button type="submit" disabled={isAdding} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isAdding ? 'Adding…' : 'Add Goal'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
