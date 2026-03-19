import { useState } from 'react';
import { FolderOpen, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { PolicyDocument } from '../../api/complianceApi';

interface Props { policies: PolicyDocument[] }

export function PolicyLibraryTree({ policies }: Props) {
  const categories = [...new Set(policies.map((p) => p.category))];
  const [expanded, setExpanded] = useState<Set<string>>(new Set(categories));

  const toggle = (cat: string) => {
    const next = new Set(expanded);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    setExpanded(next);
  };

  return (
    <div className="space-y-1">
      {categories.map((cat) => {
        const isOpen = expanded.has(cat);
        const catPolicies = policies.filter((p) => p.category === cat);
        return (
          <div key={cat}>
            <button onClick={() => toggle(cat)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 rounded-md">
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <FolderOpen className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">{cat}</span>
              <span className="text-xs text-muted-foreground ml-auto">{catPolicies.length}</span>
            </button>
            {isOpen && (
              <div className="ml-6 space-y-0.5">
                {catPolicies.map((pol) => (
                  <div key={pol.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 rounded-md">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{pol.title}</p>
                      <p className="text-xs text-muted-foreground">v{pol.version} · Approved: {formatDate(pol.approvalDate)} · Review: {formatDate(pol.nextReviewDate)}</p>
                    </div>
                    <StatusBadge status={pol.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
