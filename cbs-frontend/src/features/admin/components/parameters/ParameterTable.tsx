import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { parameterApi } from '../../api/parameterApi';
import { ParameterEditForm } from './ParameterEditForm';
import type { SystemParameter } from '../../api/parameterApi';

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'General', value: 'GENERAL' },
  { label: 'Limits', value: 'LIMITS' },
  { label: 'Fees', value: 'FEES' },
  { label: 'Interest', value: 'INTEREST' },
  { label: 'Security', value: 'SECURITY' },
  { label: 'Integration', value: 'INTEGRATION' },
  { label: 'EOD', value: 'EOD' },
  { label: 'Notification', value: 'NOTIFICATION' },
];

const CATEGORY_COLORS: Record<string, string> = {
  GENERAL: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  LIMITS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  FEES: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INTEREST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SECURITY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  INTEGRATION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  EOD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  NOTIFICATION: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

const TYPE_COLORS: Record<string, string> = {
  STRING: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  INTEGER: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  DECIMAL: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  BOOLEAN: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  JSON: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

function ValueCell({ param }: { param: SystemParameter }) {
  if (param.valueType === 'BOOLEAN') {
    const isTrue = param.paramValue === 'true';
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
          isTrue
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', isTrue ? 'bg-green-500' : 'bg-gray-400')} />
        {isTrue ? 'true' : 'false'}
      </span>
    );
  }

  if (param.valueType === 'JSON') {
    const truncated = param.paramValue.length > 50 ? `${param.paramValue.slice(0, 50)}…` : param.paramValue;
    return (
      <span className="font-mono text-xs text-muted-foreground cursor-help" title={param.paramValue}>
        {truncated}
      </span>
    );
  }

  return (
    <span className="text-sm font-mono">
      {param.paramValue.length > 40 ? (
        <span title={param.paramValue}>{param.paramValue.slice(0, 40)}…</span>
      ) : (
        param.paramValue
      )}
    </span>
  );
}

export function ParameterTable() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedParam, setSelectedParam] = useState<SystemParameter | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: parameters = [], isLoading, refetch } = useQuery({
    queryKey: ['parameters', selectedCategory, search],
    queryFn: () =>
      parameterApi.getParameters({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        search: search || undefined,
      }),
  });

  const handleRowClick = (param: SystemParameter) => {
    setSelectedParam(param);
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setSelectedParam(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                selectedCategory === cat.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by key or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading parameters…</div>
        ) : parameters.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No parameters found. Try adjusting your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Key</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Value</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Category</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Description</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Last Modified</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Modified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parameters.map((param) => (
                  <tr
                    key={param.id}
                    onClick={() => handleRowClick(param)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono font-medium text-muted-foreground">{param.paramKey}</code>
                      {param.approvalStatus === 'PENDING_APPROVAL' && (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <ValueCell param={param} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          TYPE_COLORS[param.valueType] ?? TYPE_COLORS.STRING,
                        )}
                      >
                        {param.valueType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          CATEGORY_COLORS[param.paramCategory] ?? CATEGORY_COLORS.GENERAL,
                        )}
                      >
                        {param.paramCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-xs text-muted-foreground truncate block">
                        {param.description ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {param.updatedAt ? formatDateTime(param.updatedAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {param.lastModifiedBy ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ParameterEditForm
        parameter={selectedParam}
        open={editOpen}
        onClose={handleEditClose}
        onSuccess={() => {
          handleEditClose();
          refetch();
        }}
      />
    </div>
  );
}
