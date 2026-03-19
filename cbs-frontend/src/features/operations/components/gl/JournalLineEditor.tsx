import { useMemo } from 'react';
import { X } from 'lucide-react';
import { MoneyInput } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import type { GlAccount } from '../../api/glApi';

export interface LineItem {
  id: string;
  glCode: string;
  glName: string;
  description: string;
  debit: number;
  credit: number;
}

interface JournalLineEditorProps {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  accounts: GlAccount[];
}

function flattenAccounts(accounts: GlAccount[]): GlAccount[] {
  const result: GlAccount[] = [];
  function walk(items: GlAccount[]) {
    for (const item of items) {
      if (item.type === 'DETAIL') result.push(item);
      if (item.children) walk(item.children);
    }
  }
  walk(accounts);
  return result;
}

export function JournalLineEditor({ lines, onChange, accounts }: JournalLineEditorProps) {
  const detailAccounts = useMemo(() => flattenAccounts(accounts), [accounts]);

  const updateLine = (id: string, patch: Partial<LineItem>) => {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    onChange(lines.filter((l) => l.id !== id));
  };

  const handleGlCodeChange = (id: string, value: string) => {
    const found = detailAccounts.find(
      (a) => a.code === value || a.code.startsWith(value)
    );
    updateLine(id, {
      glCode: value,
      glName: found ? found.name : '',
    });
  };

  const handleGlCodeSelect = (id: string, account: GlAccount) => {
    updateLine(id, { glCode: account.code, glName: account.name });
  };

  const handleDebitChange = (id: string, value: number) => {
    updateLine(id, { debit: value, credit: value > 0 ? 0 : lines.find((l) => l.id === id)?.credit ?? 0 });
  };

  const handleCreditChange = (id: string, value: number) => {
    updateLine(id, { credit: value, debit: value > 0 ? 0 : lines.find((l) => l.id === id)?.debit ?? 0 });
  };

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
            <th className="text-left px-3 py-2.5 font-medium w-36">GL Code</th>
            <th className="text-left px-3 py-2.5 font-medium w-40">Account Name</th>
            <th className="text-left px-3 py-2.5 font-medium">Description</th>
            <th className="text-right px-3 py-2.5 font-medium w-40">Debit</th>
            <th className="text-right px-3 py-2.5 font-medium w-40">Credit</th>
            <th className="w-8 px-2" />
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const suggestions = line.glCode.length >= 2
              ? detailAccounts.filter(
                  (a) =>
                    a.code.startsWith(line.glCode) ||
                    a.name.toLowerCase().includes(line.glCode.toLowerCase())
                ).slice(0, 6)
              : [];

            return (
              <tr key={line.id} className="border-b border-border/40">
                <td className="px-3 py-2 relative">
                  <input
                    type="text"
                    value={line.glCode}
                    onChange={(e) => handleGlCodeChange(line.id, e.target.value)}
                    placeholder="e.g. 1101"
                    className="w-full px-2 py-1.5 rounded border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {suggestions.length > 0 && line.glCode.length >= 2 && (
                    <div className="absolute top-full left-0 z-20 mt-0.5 w-64 rounded-lg border bg-popover shadow-lg py-1 max-h-48 overflow-y-auto">
                      {suggestions.map((a) => (
                        <button
                          key={a.code}
                          type="button"
                          onClick={() => handleGlCodeSelect(line.id, a)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                        >
                          <span className="font-mono font-medium">{a.code}</span>
                          <span className="text-muted-foreground ml-2">{a.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={line.glName}
                    readOnly
                    className="w-full px-2 py-1.5 rounded border bg-muted text-xs text-muted-foreground cursor-not-allowed"
                    placeholder="Auto-filled"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(line.id, { description: e.target.value })}
                    placeholder="Line description"
                    className="w-full px-2 py-1.5 rounded border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </td>
                <td className="px-3 py-2">
                  <MoneyInput
                    value={line.debit}
                    onChange={(v) => handleDebitChange(line.id, v)}
                    disabled={line.credit > 0}
                  />
                </td>
                <td className="px-3 py-2">
                  <MoneyInput
                    value={line.credit}
                    onChange={(v) => handleCreditChange(line.id, v)}
                    disabled={line.debit > 0}
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="p-1 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors"
                    title="Remove line"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30 border-t-2 font-semibold text-sm">
            <td colSpan={3} className="px-3 py-2.5">TOTAL</td>
            <td className="px-3 py-2.5 text-right font-mono">{formatMoney(totalDebit)}</td>
            <td className="px-3 py-2.5 text-right font-mono">{formatMoney(totalCredit)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
