import { useState, useEffect, useMemo } from 'react';
import {
  Phone, Plus, X, Loader2, ChevronDown, ChevronRight,
  Volume2, Hash, Mic, Settings, GitBranch,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, EmptyState } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { useIvrMenus, useCreateIvrMenu } from '../hooks/useContactCenter';
import type { IvrMenu } from '../types/ivr';

// ─── Menu Detail Panel ──────────────────────────────────────────────────────

function MenuDetailPanel({ menu, allMenus, onClose }: { menu: IvrMenu; allMenus: IvrMenu[]; onClose: () => void }) {
  const parentMenu = allMenus.find((m) => m.id === menu.parentMenuId);
  const options = Array.isArray(menu.options) ? menu.options : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-background shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{menu.menuName}</h2>
            <p className="text-xs text-muted-foreground font-mono">{menu.menuCode}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Menu info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Language</p><p className="font-medium">{menu.language}</p></div>
            <div><p className="text-xs text-muted-foreground">Level</p><p className="font-medium">{menu.menuLevel}</p></div>
            <div><p className="text-xs text-muted-foreground">Input Type</p><p className="font-medium">{menu.inputType}</p></div>
            <div><p className="text-xs text-muted-foreground">Timeout</p><p className="font-medium">{menu.timeoutSeconds}s</p></div>
            <div><p className="text-xs text-muted-foreground">Max Retries</p><p className="font-medium">{menu.maxRetries}</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={menu.isActive ? 'ACTIVE' : 'INACTIVE'} dot /></div>
          </div>

          {/* Parent */}
          {parentMenu && (
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">Parent Menu</p>
              <p className="text-sm font-medium">{parentMenu.menuName} <span className="font-mono text-xs text-muted-foreground">({parentMenu.menuCode})</span></p>
            </div>
          )}

          {/* Prompt text */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Prompt Text</p>
            <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted/20 rounded-r-lg text-sm italic">
              "{menu.promptText}"
            </blockquote>
            {menu.promptAudioRef && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Audio: {menu.promptAudioRef}
              </p>
            )}
          </div>

          {/* Options */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Menu Options ({options.length})</p>
            {options.length > 0 ? (
              <div className="space-y-2">
                {options.map((opt, i) => {
                  const key = typeof opt === 'object' && opt ? (opt as Record<string, unknown>).key : i + 1;
                  const action = typeof opt === 'object' && opt ? (opt as Record<string, unknown>).action : 'Unknown';
                  const target = typeof opt === 'object' && opt ? (opt as Record<string, unknown>).target : '';
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 surface-card">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        {String(key)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{String(action)}</p>
                        {target ? <p className="text-xs text-muted-foreground">{String(target)}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No options configured</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Menu Modal ──────────────────────────────────────────────────────

function CreateMenuModal({ menus, onClose }: { menus: IvrMenu[]; onClose: () => void }) {
  const createMenu = useCreateIvrMenu();
  const [form, setForm] = useState({
    menuName: '', menuCode: '', language: 'English', parentMenuId: 0,
    promptText: '', inputType: 'DTMF', timeoutSeconds: 10, maxRetries: 3,
  });
  const [options, setOptions] = useState<Array<{ key: string; action: string; target: string }>>([
    { key: '1', action: '', target: '' },
  ]);

  const addOption = () => setOptions((o) => [...o, { key: String(o.length + 1), action: '', target: '' }]);
  const removeOption = (i: number) => setOptions((o) => o.filter((_, idx) => idx !== i));
  const updateOption = (i: number, field: string, value: string) =>
    setOptions((o) => o.map((opt, idx) => idx === i ? { ...opt, [field]: value } : opt));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = form.menuCode || `IVR_${form.menuName.toUpperCase().replace(/\s+/g, '_').slice(0, 10)}_${Date.now().toString(36).slice(-4)}`;
    createMenu.mutate({
      menuName: form.menuName,
      menuCode: code,
      language: form.language,
      parentMenuId: form.parentMenuId || undefined,
      promptText: form.promptText,
      inputType: form.inputType,
      timeoutSeconds: form.timeoutSeconds,
      maxRetries: form.maxRetries,
      options: options.filter((o) => o.action) as unknown as Record<string, unknown>[],
    } as Partial<IvrMenu>, {
      onSuccess: () => { toast.success('IVR menu created'); onClose(); },
      onError: () => toast.error('Failed to create menu'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Create IVR Menu</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Menu Name</label>
              <input className="w-full mt-1 input" value={form.menuName} onChange={(e) => setForm((f) => ({ ...f, menuName: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Language</label>
              <select className="w-full mt-1 input" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}>
                <option>English</option>
                <option>Hausa</option>
                <option>Yoruba</option>
                <option>Igbo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Parent Menu (optional)</label>
            <select className="w-full mt-1 input" value={form.parentMenuId} onChange={(e) => setForm((f) => ({ ...f, parentMenuId: parseInt(e.target.value) || 0 }))}>
              <option value={0}>-- Root Menu --</option>
              {menus.map((m) => <option key={m.id} value={m.id}>{m.menuName} ({m.menuCode})</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Prompt Text</label>
            <textarea className="w-full mt-1 input h-20 resize-none" placeholder="Welcome to BellBank. For account services, press 1..." value={form.promptText} onChange={(e) => setForm((f) => ({ ...f, promptText: e.target.value }))} required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Input Type</label>
              <select className="w-full mt-1 input" value={form.inputType} onChange={(e) => setForm((f) => ({ ...f, inputType: e.target.value }))}>
                <option value="DTMF">DTMF</option>
                <option value="VOICE">Voice</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Timeout (sec)</label>
              <input type="number" className="w-full mt-1 input" value={form.timeoutSeconds} onChange={(e) => setForm((f) => ({ ...f, timeoutSeconds: parseInt(e.target.value) || 10 }))} min={1} max={60} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Max Retries</label>
              <input type="number" className="w-full mt-1 input" value={form.maxRetries} onChange={(e) => setForm((f) => ({ ...f, maxRetries: parseInt(e.target.value) || 3 }))} min={1} max={5} />
            </div>
          </div>

          {/* Options builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-muted-foreground">Menu Options</label>
              <button type="button" onClick={addOption} className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Option
              </button>
            </div>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="w-12 input text-center text-xs" placeholder="Key" value={opt.key} onChange={(e) => updateOption(i, 'key', e.target.value)} />
                  <select className="flex-1 input text-xs" value={opt.action} onChange={(e) => updateOption(i, 'action', e.target.value)}>
                    <option value="">Select Action</option>
                    <option value="SUB_MENU">Go to Sub-menu</option>
                    <option value="TRANSFER_AGENT">Transfer to Agent</option>
                    <option value="TRANSFER_QUEUE">Transfer to Queue</option>
                    <option value="PLAY_INFO">Play Information</option>
                    <option value="SELF_SERVICE">Self-Service</option>
                    <option value="REPEAT">Repeat Menu</option>
                    <option value="PREVIOUS">Previous Menu</option>
                  </select>
                  <input className="flex-1 input text-xs" placeholder="Target" value={opt.target} onChange={(e) => updateOption(i, 'target', e.target.value)} />
                  {options.length > 1 && (
                    <button type="button" onClick={() => removeOption(i)} className="p-1 rounded hover:bg-red-50 text-red-500"><X className="w-3 h-3" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={!form.menuName || !form.promptText || createMenu.isPending} className="btn-primary">
              {createMenu.isPending ? 'Creating...' : 'Create Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tree View ──────────────────────────────────────────────────────────────

function IvrTreeNode({ menu, allMenus, depth, onSelect }: { menu: IvrMenu; allMenus: IvrMenu[]; depth: number; onSelect: (m: IvrMenu) => void }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = allMenus.filter((m) => m.parentMenuId === menu.id);
  const options = Array.isArray(menu.options) ? menu.options : [];

  return (
    <div className={cn('ml-0', depth > 0 && 'ml-6 border-l border-dashed border-border pl-4')}>
      <button
        onClick={() => { setExpanded(!expanded); onSelect(menu); }}
        className="flex items-center gap-2 py-1.5 hover:bg-muted/30 rounded px-2 w-full text-left transition-colors"
      >
        {children.length > 0 ? (
          expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <div className="w-3.5" />
        )}
        <div className={cn('w-2 h-2 rounded-full', menu.isActive ? 'bg-green-500' : 'bg-gray-400')} />
        <span className="text-sm font-medium">{menu.menuName}</span>
        <span className="text-[10px] text-muted-foreground ml-1">({options.length} options)</span>
      </button>
      {expanded && children.map((child) => (
        <IvrTreeNode key={child.id} menu={child} allMenus={allMenus} depth={depth + 1} onSelect={onSelect} />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function IvrManagerPage() {
  useEffect(() => { document.title = 'IVR Manager | CBS'; }, []);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<IvrMenu | null>(null);
  const [view, setView] = useState<'table' | 'tree'>('table');

  const { data: menusRaw, isLoading, isError, refetch } = useIvrMenus();
  const menus: IvrMenu[] = useMemo(() => {
    if (!menusRaw) return [];
    return Array.isArray(menusRaw) ? menusRaw : [menusRaw];
  }, [menusRaw]);

  const rootMenus = menus.filter((m) => !m.parentMenuId || m.parentMenuId === 0);

  const menuCols: ColumnDef<IvrMenu, unknown>[] = [
    { accessorKey: 'menuCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.menuCode}</span> },
    { accessorKey: 'menuName', header: 'Name', cell: ({ row }) => <span className="font-medium text-sm">{row.original.menuName}</span> },
    { accessorKey: 'language', header: 'Language', cell: ({ row }) => <span className="text-xs">{row.original.language}</span> },
    { accessorKey: 'menuLevel', header: 'Level', cell: ({ row }) => <span className="text-xs font-mono">{row.original.menuLevel}</span> },
    { accessorKey: 'inputType', header: 'Input', cell: ({ row }) => <span className="text-xs">{row.original.inputType}</span> },
    { accessorKey: 'timeoutSeconds', header: 'Timeout', cell: ({ row }) => <span className="text-xs font-mono">{row.original.timeoutSeconds}s</span> },
    { accessorKey: 'maxRetries', header: 'Retries', cell: ({ row }) => <span className="text-xs font-mono">{row.original.maxRetries}</span> },
    {
      accessorKey: 'isActive', header: 'Status',
      cell: ({ row }) => row.original.isActive
        ? <span className="flex items-center gap-1.5 text-xs"><span className="w-2 h-2 rounded-full bg-green-500" />Active</span>
        : <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full bg-gray-400" />Inactive</span>,
    },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span> },
  ];

  if (isError) {
    return (
      <>
        <PageHeader title="IVR Manager" subtitle="Configure automated phone menu trees" />
        <div className="page-container">
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-8 text-center">
            <Phone className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 dark:text-red-400 font-medium">Failed to load IVR menus</p>
            <button onClick={() => refetch()} className="mt-3 text-sm text-primary hover:underline">Retry</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showCreate && <CreateMenuModal menus={menus} onClose={() => setShowCreate(false)} />}
      {selectedMenu && <MenuDetailPanel menu={selectedMenu} allMenus={menus} onClose={() => setSelectedMenu(null)} />}

      <PageHeader
        title="IVR Manager"
        subtitle="Configure automated phone menu trees"
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 btn-primary">
            <Plus className="w-4 h-4" /> Create Menu
          </button>
        }
      />

      <div className="page-container space-y-4">
        {/* View toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{menus.length} menu(s) configured</p>
          <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
            <button onClick={() => setView('table')} className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors', view === 'table' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
              <Settings className="w-3.5 h-3.5 inline mr-1" /> Table
            </button>
            <button onClick={() => setView('tree')} className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors', view === 'tree' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
              <GitBranch className="w-3.5 h-3.5 inline mr-1" /> Tree
            </button>
          </div>
        </div>

        {view === 'table' ? (
          <DataTable
            columns={menuCols}
            data={menus}
            isLoading={isLoading}
            enableGlobalFilter
            emptyMessage="No IVR menus configured"
            onRowClick={(row) => setSelectedMenu(row)}
          />
        ) : (
          <div className="surface-card p-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : rootMenus.length > 0 ? (
              <div className="space-y-1">
                {rootMenus.map((menu) => (
                  <IvrTreeNode key={menu.id} menu={menu} allMenus={menus} depth={0} onSelect={setSelectedMenu} />
                ))}
              </div>
            ) : (
              <EmptyState title="No IVR menus" description="Create your first root menu to get started." />
            )}
          </div>
        )}
      </div>
    </>
  );
}
