import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ComplianceGap } from '../../api/complianceApi';

interface Props { gaps: ComplianceGap[] }

export function GapAgingChart({ gaps }: Props) {
  const openGaps = gaps.filter((g) => !['REMEDIATED', 'VERIFIED', 'ACCEPTED_RISK'].includes(g.status));
  const buckets = [
    { bucket: '0-30d', count: openGaps.filter((g) => g.ageDays <= 30).length },
    { bucket: '31-60d', count: openGaps.filter((g) => g.ageDays > 30 && g.ageDays <= 60).length },
    { bucket: '61-90d', count: openGaps.filter((g) => g.ageDays > 60 && g.ageDays <= 90).length },
    { bucket: '90+d', count: openGaps.filter((g) => g.ageDays > 90).length },
  ];

  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-semibold mb-4">Open Gap Aging</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
