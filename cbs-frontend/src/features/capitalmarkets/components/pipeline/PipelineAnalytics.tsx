import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { CapitalMarketsDeal, DealStatus } from '../../api/capitalMarketsApi';

const STAGE_ORDER: DealStatus[] = ['ORIGINATION', 'STRUCTURING', 'MARKETING', 'PRICING', 'ALLOTMENT', 'SETTLED'];
const STAGE_COLORS: Record<string, string> = {
  ORIGINATION: '#3b82f6',
  STRUCTURING: '#6366f1',
  MARKETING: '#f59e0b',
  PRICING: '#a855f7',
  ALLOTMENT: '#10b981',
  SETTLED: '#16a34a',
};

interface PipelineAnalyticsProps {
  deals: CapitalMarketsDeal[];
}

export function PipelineAnalytics({ deals }: PipelineAnalyticsProps) {
  // 1. Fee Revenue by Month (last 12 months)
  const feeByMonth = useMemo(() => {
    const months: Record<string, { ecm: number; dcm: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { ecm: 0, dcm: 0 };
    }
    deals.filter((d) => d.feesEarned).forEach((d) => {
      const m = d.updatedAt.slice(0, 7);
      if (months[m]) {
        if (d.type === 'ECM') months[m].ecm += d.feesEarned ?? 0;
        else months[m].dcm += d.feesEarned ?? 0;
      }
    });
    return Object.entries(months).map(([month, v]) => ({ month: month.slice(5), ...v }));
  }, [deals]);

  // 2. Deal Pipeline Funnel
  const funnelData = useMemo(() =>
    STAGE_ORDER.map((stage) => {
      const stageDeals = deals.filter((d) => d.status === stage);
      return {
        stage,
        count: stageDeals.length,
        value: stageDeals.reduce((s, d) => s + d.targetAmount, 0),
        color: STAGE_COLORS[stage],
      };
    }), [deals]);

  // 3. Deal Volume by Type (donut)
  const typeData = useMemo(() => {
    const ecm = deals.filter((d) => d.type === 'ECM');
    const dcm = deals.filter((d) => d.type === 'DCM');
    return [
      { name: 'ECM', value: ecm.length, amount: ecm.reduce((s, d) => s + d.targetAmount, 0), fill: '#3b82f6' },
      { name: 'DCM', value: dcm.length, amount: dcm.reduce((s, d) => s + d.targetAmount, 0), fill: '#22c55e' },
    ];
  }, [deals]);

  // 4. Average Days per Stage
  const avgDaysPerStage = useMemo(() => {
    // Approximate: for settled deals, distribute total duration across stages
    const settled = deals.filter((d) => d.status === 'SETTLED');
    if (settled.length === 0) {
      return STAGE_ORDER.map((s) => ({ stage: s, days: 0, color: STAGE_COLORS[s] }));
    }
    const totalAvg = settled.reduce((s, d) => {
      return s + (new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime()) / 86400000;
    }, 0) / settled.length;
    const weights = [0.1, 0.15, 0.25, 0.2, 0.2, 0.1];
    return STAGE_ORDER.map((s, i) => ({
      stage: s,
      days: Math.round(totalAvg * weights[i]),
      color: STAGE_COLORS[s],
    }));
  }, [deals]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Fee Revenue by Month */}
      <div className="surface-card p-4">
        <p className="text-sm font-semibold mb-3">Fee Revenue by Month</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={feeByMonth}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => formatMoneyCompact(v)} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatMoneyCompact(v)} />
            <Bar dataKey="ecm" stackId="a" fill="#3b82f6" name="ECM" radius={[0, 0, 0, 0]} />
            <Bar dataKey="dcm" stackId="a" fill="#22c55e" name="DCM" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2. Pipeline Funnel */}
      <div className="surface-card p-4">
        <p className="text-sm font-semibold mb-3">Deal Pipeline Funnel</p>
        <div className="space-y-2">
          {funnelData.map((s, i) => {
            const maxVal = Math.max(...funnelData.map((x) => x.count), 1);
            const widthPct = Math.max(20, (s.count / maxVal) * 100);
            return (
              <div key={s.stage} className="flex items-center gap-3">
                <span className="text-[10px] font-medium text-muted-foreground w-24 text-right uppercase">{s.stage}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className="h-7 rounded flex items-center px-2 transition-all"
                    style={{ width: `${widthPct}%`, backgroundColor: s.color + '30' }}
                  >
                    <span className="text-xs font-bold" style={{ color: s.color }}>
                      {s.count} deals
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatMoneyCompact(s.value)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Deal Volume by Type (Donut) */}
      <div className="surface-card p-4">
        <p className="text-sm font-semibold mb-3">Deal Volume by Type</p>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={typeData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                {typeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {typeData.map((t) => (
              <div key={t.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.fill }} />
                <div>
                  <p className="text-sm font-semibold">{t.name}: {t.value} deals</p>
                  <p className="text-xs text-muted-foreground">{formatMoneyCompact(t.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Average Days per Stage */}
      <div className="surface-card p-4">
        <p className="text-sm font-semibold mb-3">Average Days per Stage</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={avgDaysPerStage} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="stage" type="category" tick={{ fontSize: 9 }} width={90} />
            <Tooltip formatter={(v: number) => `${v} days`} />
            <Bar dataKey="days" radius={[0, 4, 4, 0]}>
              {avgDaysPerStage.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
