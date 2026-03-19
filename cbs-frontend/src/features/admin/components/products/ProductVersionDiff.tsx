import { useState } from 'react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductVersion } from '../../api/productApi';
import { format } from 'date-fns';

interface ProductVersionDiffProps {
  versions: ProductVersion[];
}

export function ProductVersionDiff({ versions }: ProductVersionDiffProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set());

  const toggleVersion = (version: number) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  if (versions.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
        <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">No version history available</p>
        <p className="text-xs mt-1">Amendment records will appear here after the product is modified.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Version list header */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div className="col-span-1">Ver.</div>
          <div className="col-span-4">Changed By</div>
          <div className="col-span-4">Date & Time</div>
          <div className="col-span-2">Changes</div>
          <div className="col-span-1" />
        </div>

        <div className="divide-y divide-border">
          {versions.map((v) => {
            const isExpanded = expandedVersions.has(v.version);
            return (
              <div key={v.version}>
                {/* Version row */}
                <button
                  type="button"
                  onClick={() => toggleVersion(v.version)}
                  className="w-full px-4 py-3 grid grid-cols-12 gap-4 text-sm text-left hover:bg-muted/20 transition-colors"
                >
                  <div className="col-span-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground font-mono">
                      v{v.version}
                    </span>
                  </div>
                  <div className="col-span-4 font-medium truncate">{v.changedBy}</div>
                  <div className="col-span-4 text-muted-foreground">
                    {format(new Date(v.changedAt), 'dd MMM yyyy, HH:mm')}
                  </div>
                  <div className="col-span-2">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        v.changes.length > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      {v.changes.length} field{v.changes.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded diff table */}
                {isExpanded && v.changes.length > 0 && (
                  <div className="border-t border-border bg-muted/10 px-4 py-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-1/3">
                            Field
                          </th>
                          <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-1/3">
                            Old Value
                          </th>
                          <th className="py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-1/3">
                            New Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {v.changes.map((change, idx) => (
                          <tr key={idx}>
                            <td className="py-2 pr-4">
                              <span className="font-mono text-xs text-foreground">{change.field}</span>
                            </td>
                            <td className="py-2 pr-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 text-red-700 font-mono">
                                {change.oldValue}
                              </span>
                            </td>
                            <td className="py-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-800 font-mono font-medium">
                                {change.newValue}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {isExpanded && v.changes.length === 0 && (
                  <div className="border-t border-border bg-muted/10 px-4 py-3">
                    <p className="text-sm text-muted-foreground italic">No field-level changes recorded for this version.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground px-1">
        Showing {versions.length} version{versions.length !== 1 ? 's' : ''}. Latest version is v{versions[0]?.version}.
      </p>
    </div>
  );
}
