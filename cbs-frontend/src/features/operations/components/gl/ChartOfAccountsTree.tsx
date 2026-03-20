import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Plus, Upload, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { GlAccount } from '../../api/glApi';
import { GlAccountForm } from './GlAccountForm';
import { useQueryClient } from '@tanstack/react-query';

interface ChartOfAccountsTreeProps {
  accounts: GlAccount[];
}

const CATEGORY_COLORS: Record<string, string> = {
  ASSET: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  LIABILITY: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  EQUITY: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  INCOME: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  EXPENSE: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function flattenTree(accounts: GlAccount[]): GlAccount[] {
  const result: GlAccount[] = [];
  function walk(items: GlAccount[]) {
    for (const item of items) {
      result.push(item);
      if (item.children) walk(item.children);
    }
  }
  walk(accounts);
  return result;
}

function getMatchingCodes(accounts: GlAccount[], query: string): Set<string> {
  const matched = new Set<string>();
  const allAccounts = flattenTree(accounts);

  function nodeMatches(a: GlAccount): boolean {
    return (
      a.code.toLowerCase().includes(query) ||
      a.name.toLowerCase().includes(query)
    );
  }

  function collectAncestors(a: GlAccount) {
    if (a.parentCode) {
      const parent = allAccounts.find((x) => x.code === a.parentCode);
      if (parent) {
        matched.add(parent.code);
        collectAncestors(parent);
      }
    }
  }

  for (const a of allAccounts) {
    if (nodeMatches(a)) {
      matched.add(a.code);
      collectAncestors(a);
    }
  }
  return matched;
}

interface TreeNodeProps {
  account: GlAccount;
  expanded: Set<string>;
  onToggle: (code: string) => void;
  visible: Set<string> | null;
  onAddChild: (parent: GlAccount) => void;
}

function TreeNode({ account, expanded, onToggle, visible, onAddChild }: TreeNodeProps) {
  const isExpanded = expanded.has(account.code);
  const hasChildren = account.children && account.children.length > 0;
  const isVisible = visible === null || visible.has(account.code);

  if (!isVisible) return null;

  const indent = account.level * 20;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 hover:bg-muted/50 transition-colors group border-b border-border/40',
          account.type === 'HEADER' && 'bg-muted/20',
        )}
        style={{ paddingLeft: `${16 + indent}px` }}
      >
        <button
          onClick={() => hasChildren && onToggle(account.code)}
          className={cn('flex-shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground', !hasChildren && 'invisible')}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <span className={cn('font-mono text-xs w-16 flex-shrink-0', account.type === 'HEADER' ? 'font-bold text-foreground' : 'text-muted-foreground')}>
          {account.code}
        </span>

        <span className={cn('flex-1 text-sm min-w-0 truncate', account.type === 'HEADER' ? 'font-semibold' : 'font-normal')}>
          {account.name}
        </span>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', account.type === 'HEADER' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
            {account.type}
          </span>
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', CATEGORY_COLORS[account.category])}>
            {account.category}
          </span>
          <span className="text-xs text-muted-foreground w-12 text-center">{account.currency}</span>
          <Circle className={cn('w-2.5 h-2.5 flex-shrink-0', account.status === 'ACTIVE' ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400')} />
          {account.type === 'HEADER' && (
            <button
              onClick={() => onAddChild(account)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
              title="Add child account"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {account.children!.map((child) => (
            <TreeNode
              key={child.code}
              account={child}
              expanded={expanded}
              onToggle={onToggle}
              visible={visible}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ChartOfAccountsTree({ accounts }: ChartOfAccountsTreeProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(accounts.map((a) => a.code)));
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<GlAccount | undefined>();

  const visible = useMemo<Set<string> | null>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return getMatchingCodes(accounts, q);
  }, [search, accounts]);

  const handleToggle = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleExpandAll = () => {
    const all = new Set<string>();
    flattenTree(accounts).forEach((a) => { if (a.children?.length) all.add(a.code); });
    setExpanded(all);
  };

  const handleCollapseAll = () => setExpanded(new Set());

  const handleAddChild = (parent: GlAccount) => {
    setSelectedParent(parent);
    setFormOpen(true);
  };

  const handleAddRoot = () => {
    setSelectedParent(undefined);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by GL code or name..."
          className="flex-1 min-w-64 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleExpandAll}
            className="px-3 py-2 text-xs rounded-lg border hover:bg-muted transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-3 py-2 text-xs rounded-lg border hover:bg-muted transition-colors"
          >
            Collapse All
          </button>
          <button
            type="button"
            onClick={() => { toast.error('COA import is not wired to a backend endpoint in this build.'); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import COA
          </button>
          <button
            onClick={handleAddRoot}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add GL Account
          </button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b text-xs font-medium text-muted-foreground">
          <span className="w-4" />
          <span className="w-16">Code</span>
          <span className="flex-1">Account Name</span>
          <span className="w-16 text-center">Type</span>
          <span className="w-20 text-center">Category</span>
          <span className="w-12 text-center">Currency</span>
          <span className="w-8 text-center">Status</span>
          <span className="w-8" />
        </div>
        {accounts.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No accounts found. Start by adding your first GL account.
          </div>
        ) : (
          accounts.map((account) => (
            <TreeNode
              key={account.code}
              account={account}
              expanded={expanded}
              onToggle={handleToggle}
              visible={visible}
              onAddChild={handleAddChild}
            />
          ))
        )}
      </div>

      <GlAccountForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ['gl-accounts'] });
        }}
        parentAccount={selectedParent}
      />
    </div>
  );
}
