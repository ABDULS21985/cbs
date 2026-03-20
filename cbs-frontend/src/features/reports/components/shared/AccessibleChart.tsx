import React from 'react';

interface AccessibleChartProps {
  title: string;
  description?: string;
  data: Record<string, any>[];
  columns: { key: string; label: string }[];
  children: React.ReactNode; // The actual Recharts component
}

export function AccessibleChart({
  title,
  description,
  data,
  columns,
  children,
}: AccessibleChartProps) {
  return (
    <div role="figure" aria-label={title}>
      {children}
      {/* Screen reader alternative - hidden visually */}
      <div
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          border: 0,
        }}
      >
        <p>{description || title}</p>
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key}>{row[col.key] != null ? String(row[col.key]) : ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
