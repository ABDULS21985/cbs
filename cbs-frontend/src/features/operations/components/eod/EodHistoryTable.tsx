import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatDate, formatDateTime } from '@/lib/formatters';
import type { EodHistoryRow, EodLogEntry } from '../../api/eodApi';
import { eodApi } from '../../api/eodApi';
import { X } from 'lucide-react';

interface EodHistoryTableProps {
  data: EodHistoryRow[];
  isLoading?: boolean;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  } catch {
    return '--:--:--';
  }
}

function levelColor(level: EodLogEntry['level']): string {
  switch (level) {
    case 'ERROR': return 'text-red-400';
    case 'WARN': return 'text-amber-400';
    default: return 'text-gray-400';
  }
}

const columns: ColumnDef<EodHistoryRow, any>[] = [
  {
    accessorKey: 'businessDate',
    header: 'Date',
    cell: ({ getValue }) => <span className="font-medium">{formatDate(getValue<string>())}</span>,
  },
  {
    accessorKey: 'runType',
    header: 'Type',
    cell: ({ getValue }) => <span className="text-xs font-mono">{getValue<string>()}</span>,
  },
  {
    accessorKey: 'startedAt',
    header: 'Start',
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return <span className="font-mono text-xs">{v ? formatDateTime(v) : '--'}</span>;
    },
  },
  {
    accessorKey: 'completedAt',
    header: 'End',
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return <span className="font-mono text-xs">{v ? formatDateTime(v) : '--'}</span>;
    },
  },
  {
    accessorKey: 'durationSeconds',
    header: 'Duration',
    cell: ({ getValue }) => <span className="font-mono text-xs">{formatDuration(getValue<number | null>())}</span>,
  },
  {
    accessorKey: 'completedSteps',
    header: 'Steps OK',
    cell: ({ row, getValue }) => (
      <span className="text-green-600 font-medium">{getValue<number>()}/{row.original.totalSteps}</span>
    ),
  },
  {
    accessorKey: 'failedSteps',
    header: 'Failed',
    cell: ({ getValue }) => {
      const v = getValue<number>();
      return v > 0
        ? <span className="text-red-600 font-medium">{v}</span>
        : <span className="text-muted-foreground">0</span>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} dot />,
  },
];

export function EodHistoryTable({ data, isLoading }: EodHistoryTableProps) {
  const [selectedRun, setSelectedRun] = useState<EodHistoryRow | null>(null);
  const [runLogs, setRunLogs] = useState<EodLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const handleRowClick = async (row: EodHistoryRow) => {
    setSelectedRun(row);
    setLogsLoading(true);
    try {
      const result = await eodApi.getLogs(row.id);
      setRunLogs(result.entries);
    } catch {
      setRunLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        enableGlobalFilter
        onRowClick={handleRowClick}
        emptyMessage="No historical EOD runs found"
        pageSize={10}
      />

      {selectedRun && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedRun(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <h3 className="text-base font-semibold">EOD Run Log</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(selectedRun.businessDate)} — {formatDuration(selectedRun.durationSeconds)} — {selectedRun.completedSteps}/{selectedRun.totalSteps} steps OK
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRun(null)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-950 p-4 font-mono text-xs space-y-0.5 rounded-b-xl">
                {logsLoading && (
                  <p className="text-gray-500 text-center py-8">Loading logs...</p>
                )}
                {!logsLoading && runLogs.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No log entries available for this run.</p>
                )}
                {!logsLoading && runLogs.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-gray-600">[{formatTimestamp(entry.timestamp)}]</span>
                    <span className={`flex-shrink-0 font-bold ${entry.level === 'ERROR' ? 'text-red-400' : entry.level === 'WARN' ? 'text-amber-400' : 'text-gray-500'}`}>
                      [{entry.level}]
                    </span>
                    <span className={levelColor(entry.level)}>{entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
