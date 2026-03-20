import type { ReactNode } from 'react';

interface AccessibleChartProps {
  title: string;
  chartElement: ReactNode;
  data: Record<string, any>[];
  columns: { header: string; accessor: string }[];
}

export function AccessibleChart({ title, chartElement, data, columns }: AccessibleChartProps) {
  return (
    <div role="img" aria-label={title}>
      {chartElement}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.accessor} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.accessor}>{row[c.accessor] != null ? String(row[c.accessor]) : ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
