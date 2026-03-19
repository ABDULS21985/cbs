import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MoneyDisplay } from '@/components/shared';
import { useCustomerSegments } from '../hooks/useCustomers';
import type { CustomerSegment } from '../types/customer';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEGMENT_STYLES: Record<string, { bg: string; text: string }> = {
  PREMIUM:   { bg: 'bg-gradient-to-br from-amber-400 to-amber-600',   text: 'text-amber-600' },
  STANDARD:  { bg: 'bg-gradient-to-br from-blue-400 to-blue-600',     text: 'text-blue-600' },
  MICRO:     { bg: 'bg-gradient-to-br from-green-400 to-green-600',   text: 'text-green-600' },
  SME:       { bg: 'bg-gradient-to-br from-purple-400 to-purple-600', text: 'text-purple-600' },
  CORPORATE: { bg: 'bg-gradient-to-br from-gray-600 to-gray-800',     text: 'text-gray-600' },
};

interface SegmentCardProps {
  segment: CustomerSegment;
  isSelected: boolean;
  onClick: () => void;
}

function SegmentCard({ segment, isSelected, onClick }: SegmentCardProps) {
  const style = SEGMENT_STYLES[segment.code] ?? SEGMENT_STYLES.STANDARD;
  const TrendIcon = segment.growthPct > 0 ? TrendingUp : segment.growthPct < 0 ? TrendingDown : Minus;
  const trendColor = segment.growthPct > 0 ? 'text-green-500' : segment.growthPct < 0 ? 'text-red-500' : 'text-gray-400';

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-5 rounded-xl border-2 text-left w-full transition-all hover:shadow-md',
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 dark:border-gray-700',
      )}
    >
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-white text-sm font-bold mb-3 ${style.bg}`}>
        {segment.code[0]}
      </div>
      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{segment.name}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
        {segment.count.toLocaleString()}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <MoneyDisplay amount={segment.totalBalance} compact size="sm" />
      </div>
      <div className={`flex items-center gap-1 text-xs mt-2 ${trendColor}`}>
        <TrendIcon className="h-3.5 w-3.5" />
        <span>{Math.abs(segment.growthPct).toFixed(1)}% MoM</span>
      </div>
    </button>
  );
}

export default function SegmentationPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: segments, isLoading } = useCustomerSegments();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const chartData = segments?.map(s => ({
    name: s.name.length > 10 ? s.code : s.name,
    'Avg Balance (₦M)': Math.round(s.avgBalance / 1_000_000),
    'Avg Revenue (₦K)': Math.round(s.avgRevenue / 1_000),
    'Avg Products': +(s.avgProducts.toFixed(1)),
  })) ?? [];

  const selected = segments?.find(s => s.id === selectedId);

  return (
    <div className="space-y-6">
      {/* Segment cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {segments?.map(seg => (
          <SegmentCard
            key={seg.id}
            segment={seg}
            isSelected={selectedId === seg.id}
            onClick={() => setSelectedId(id => id === seg.id ? null : seg.id)}
          />
        ))}
      </div>

      {/* Comparison chart */}
      <div className="border rounded-xl p-5 bg-white dark:bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Segment Comparison</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Avg Balance (₦M)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Avg Revenue (₦K)"  fill="#8b5cf6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Selected segment detail */}
      {selected && (
        <div className="border rounded-xl p-5 bg-white dark:bg-gray-800">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            {selected.name} — Segment Detail
          </h3>
          <div className="grid sm:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Customers</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {selected.count.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Balance</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                <MoneyDisplay amount={selected.totalBalance} compact size="lg" />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Products / Customer</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {selected.avgProducts.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Revenue / Customer</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                <MoneyDisplay amount={selected.avgRevenue} compact size="lg" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
