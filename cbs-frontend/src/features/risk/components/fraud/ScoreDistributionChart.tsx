import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BucketData {
  bucket: string;
  fraud: number;
  nonFraud: number;
}

// Static illustrative data showing the expected distribution shape
// In production this would come from an API
const defaultData: BucketData[] = [
  { bucket: '0-10', fraud: 2, nonFraud: 980 },
  { bucket: '10-20', fraud: 4, nonFraud: 870 },
  { bucket: '20-30', fraud: 8, nonFraud: 720 },
  { bucket: '30-40', fraud: 15, nonFraud: 580 },
  { bucket: '40-50', fraud: 22, nonFraud: 430 },
  { bucket: '50-60', fraud: 45, nonFraud: 280 },
  { bucket: '60-70', fraud: 80, nonFraud: 150 },
  { bucket: '70-80', fraud: 140, nonFraud: 60 },
  { bucket: '80-90', fraud: 210, nonFraud: 25 },
  { bucket: '90-100', fraud: 320, nonFraud: 8 },
];

interface Props {
  data?: BucketData[];
}

export function ScoreDistributionChart({ data = defaultData }: Props) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Score Distribution
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="fraud" name="Fraud" fill="#ef4444" maxBarSize={16} radius={[2, 2, 0, 0]} />
          <Bar dataKey="nonFraud" name="Non-Fraud" fill="#3b82f6" maxBarSize={16} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-1 text-center">
        Fraud scores cluster high (80-100), non-fraud scores cluster low (0-40)
      </p>
    </div>
  );
}
