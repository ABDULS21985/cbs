import { useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentFolder } from '../../api/documentApi';

interface FolderTreeProps {
  selectedFolder: DocumentFolder | null;
  onSelect: (folder: DocumentFolder) => void;
  documentCounts: Record<string, number>;
}

interface TreeLeaf {
  label: string;
  folder: DocumentFolder;
}

interface TreeNode {
  label: string;
  icon?: React.ReactNode;
  children: TreeLeaf[];
}

const TREE: TreeNode[] = [
  {
    label: 'Customer Documents',
    children: [
      { label: 'KYC', folder: 'customer/kyc' },
      { label: 'Agreements', folder: 'customer/agreements' },
      { label: 'Correspondence', folder: 'customer/correspondence' },
    ],
  },
  {
    label: 'Loan Documents',
    children: [
      { label: 'Applications', folder: 'loan/applications' },
      { label: 'Collateral', folder: 'loan/collateral' },
      { label: 'Legal', folder: 'loan/legal' },
    ],
  },
  {
    label: 'Regulatory',
    children: [
      { label: 'CBN Returns', folder: 'regulatory/cbn' },
      { label: 'NDIC Returns', folder: 'regulatory/ndic' },
    ],
  },
  {
    label: 'Internal',
    children: [
      { label: 'Policies', folder: 'internal/policies' },
      { label: 'Procedures', folder: 'internal/procedures' },
      { label: 'Training', folder: 'internal/training' },
    ],
  },
  {
    label: 'Templates',
    children: [{ label: 'All Templates', folder: 'templates' }],
  },
];

export function FolderTree({ selectedFolder, onSelect, documentCounts }: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'Customer Documents': true,
    'Loan Documents': true,
    Regulatory: true,
    Internal: true,
    Templates: true,
  });

  function toggleNode(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function getCount(folder: string): number {
    return documentCounts[folder] ?? 0;
  }

  function getNodeCount(node: TreeNode): number {
    return node.children.reduce((sum, leaf) => sum + getCount(leaf.folder), 0);
  }

  return (
    <div className="py-2 select-none">
      <div className="px-3 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Folders
        </span>
      </div>

      <ul className="space-y-0.5">
        {TREE.map((node) => {
          const isOpen = expanded[node.label] ?? true;
          const nodeCount = getNodeCount(node);

          return (
            <li key={node.label}>
              {/* Parent node */}
              <button
                onClick={() => toggleNode(node.label)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-left group"
              >
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground/80 truncate">
                  {node.label}
                </span>
                {nodeCount > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {nodeCount}
                  </span>
                )}
              </button>

              {/* Children */}
              {isOpen && (
                <ul className="ml-6 mt-0.5 space-y-0.5">
                  {node.children.map((leaf) => {
                    const isSelected = selectedFolder === leaf.folder;
                    const leafCount = getCount(leaf.folder);

                    return (
                      <li key={leaf.folder}>
                        <button
                          onClick={() => onSelect(leaf.folder)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left transition-colors',
                            isSelected
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted/60 text-foreground/70',
                          )}
                        >
                          <FolderOpen
                            className={cn(
                              'w-3.5 h-3.5 shrink-0',
                              isSelected ? 'text-primary' : 'text-muted-foreground',
                            )}
                          />
                          <span className="flex-1 text-sm truncate">{leaf.label}</span>
                          {leafCount > 0 && (
                            <span
                              className={cn(
                                'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                                isSelected
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {leafCount}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
