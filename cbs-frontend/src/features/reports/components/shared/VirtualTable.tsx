import React, { useState, useRef } from 'react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  width?: number;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  visibleRows?: number;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  caption?: string;
}

export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 40,
  visibleRows = 15,
  onSort,
  caption,
}: VirtualTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const containerRef = useRef<HTMLDivElement>(null);

  const containerHeight = rowHeight * visibleRows;
  const totalHeight = data.length * rowHeight;
  const startIndex = Math.floor(scrollTop / rowHeight);
  const endIndex = Math.min(startIndex + visibleRows + 2, data.length);
  const visibleData = data.slice(startIndex, endIndex);
  const offsetY = startIndex * rowHeight;

  const handleSort = (key: string) => {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(newDir);
    onSort?.(key, newDir);
  };

  const rowsBelow = totalHeight - offsetY - visibleData.length * rowHeight;

  return (
    <div>
      <div
        ref={containerRef}
        style={{ height: containerHeight, overflow: 'auto', position: 'relative' }}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        role="region"
        aria-label={caption || 'Data table'}
      >
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  scope="col"
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                  style={{ width: col.width }}
                  aria-sort={
                    sortKey === String(col.key)
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  {col.sortable !== false ? (
                    <button
                      className="flex items-center gap-1 hover:text-gray-900"
                      onClick={() => handleSort(String(col.key))}
                    >
                      {col.label}
                      {sortKey === String(col.key) ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Spacer for rows above viewport */}
            {offsetY > 0 && (
              <tr style={{ height: offsetY }}>
                <td colSpan={columns.length} />
              </tr>
            )}
            {visibleData.map((row, i) => (
              <tr
                key={startIndex + i}
                className={(startIndex + i) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                style={{ height: rowHeight }}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className="px-4 py-2 text-sm text-gray-900 border-b border-gray-100 truncate"
                  >
                    {col.render
                      ? col.render(row[col.key as string], row)
                      : row[col.key as string]}
                  </td>
                ))}
              </tr>
            ))}
            {/* Spacer for rows below viewport */}
            {rowsBelow > 0 && (
              <tr style={{ height: rowsBelow }}>
                <td colSpan={columns.length} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500 mt-1 px-2">
        Showing {startIndex + 1}–{Math.min(endIndex, data.length)} of {data.length} rows
      </div>
    </div>
  );
}
