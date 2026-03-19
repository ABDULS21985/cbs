import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { communicationApi, type CommTemplate } from '../api/communicationApi';

const columns: ColumnDef<CommTemplate, any>[] = [
  { accessorKey: 'name', header: 'Template Name' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'channel', header: 'Channel', cell: ({ row }) => <span className="text-xs font-medium">{row.original.channel}</span> },
  { accessorKey: 'usageCount', header: 'Used', cell: ({ row }) => <span className="font-mono text-xs">{row.original.usageCount}</span> },
  { accessorKey: 'version', header: 'Ver.', cell: ({ row }) => <span className="font-mono text-xs">v{row.original.version}</span> },
  { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
];

export function TemplateManagementPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: '', channel: 'EMAIL' as const, subject: '', content: '' });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['communication-templates'],
    queryFn: () => communicationApi.getTemplates(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CommTemplate>) => communicationApi.createTemplate(data),
    onSuccess: () => { toast.success('Template created'); queryClient.invalidateQueries({ queryKey: ['communication-templates'] }); setShowForm(false); },
  });

  return (
    <>
      <PageHeader
        title="Communication Templates"
        subtitle="Manage message templates for all channels"
        actions={
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Template
          </button>
        }
      />
      <div className="page-container space-y-6">
        <DataTable columns={columns} data={templates} isLoading={isLoading} enableGlobalFilter emptyMessage="No templates found" />

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg border shadow-xl max-w-lg w-full mx-4 p-6">
              <h3 className="font-semibold mb-4">New Template</h3>
              <div className="space-y-3">
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Template name" className="w-full px-3 py-2 border rounded-md text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Category" className="w-full px-3 py-2 border rounded-md text-sm" />
                  <select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value as any })} className="w-full px-3 py-2 border rounded-md text-sm">
                    <option value="EMAIL">Email</option><option value="SMS">SMS</option><option value="PUSH">Push</option><option value="LETTER">Letter</option>
                  </select>
                </div>
                {formData.channel === 'EMAIL' && (
                  <input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Subject template" className="w-full px-3 py-2 border rounded-md text-sm" />
                )}
                <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={6} placeholder="Template content with {{mergeFields}}" className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
                <button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
