import { formatPercent } from '@/lib/formatters';
import type { PdTermStructure } from '../../types/ecl';

interface Props {
  data: PdTermStructure[];
}

function pdColor(pd: number): string {
  if (pd < 0.5) return 'bg-green-50 dark:bg-green-950/30';
  if (pd < 2) return 'bg-amber-50 dark:bg-amber-950/30';
  return 'bg-red-50 dark:bg-red-950/30';
}

export function PdTermStructureTable({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No PD term structure data available.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-medium">Rating</th>
            <th className="text-right py-2 px-3 font-medium">1 Year</th>
            <th className="text-right py-2 px-3 font-medium">3 Years</th>
            <th className="text-right py-2 px-3 font-medium">5 Years</th>
            <th className="text-right py-2 px-3 font-medium">10 Years</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.ratingGrade} className="border-b border-border/40">
              <td className="py-2 px-3 font-medium">{row.ratingGrade}</td>
              <td className={`text-right py-2 px-3 ${pdColor(row.tenor1y)}`}>
                {formatPercent(row.tenor1y, 2)}
              </td>
              <td className={`text-right py-2 px-3 ${pdColor(row.tenor3y)}`}>
                {formatPercent(row.tenor3y, 2)}
              </td>
              <td className={`text-right py-2 px-3 ${pdColor(row.tenor5y)}`}>
                {formatPercent(row.tenor5y, 2)}
              </td>
              <td className={`text-right py-2 px-3 ${pdColor(row.tenor10y)}`}>
                {formatPercent(row.tenor10y, 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
