import { Star } from 'lucide-react';

export function ShariaComplianceBadge({ compliant }: { compliant: boolean }) {
  if (!compliant) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <Star className="w-2.5 h-2.5" /> Sharia
    </span>
  );
}
