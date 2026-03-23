import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormSection } from '@/components/shared/FormSection';
import { caseApi, type CustomerCase } from '../api/caseApi';

export function NewCasePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    customerId: searchParams.get('customerId') ?? '',
    customerName: searchParams.get('customerName') ?? '',
    caseType: '' as CustomerCase['caseType'] | '',
    subCategory: '',
    priority: '' as CustomerCase['priority'] | '',
    subject: '',
    description: '',
    assignedTo: '',
  });
  const metadataQuery = useQuery({
    queryKey: ['cases', 'metadata'],
    queryFn: () => caseApi.getMetadata(),
    staleTime: 5 * 60_000,
  });

  const selectedCaseType = useMemo(
    () => metadataQuery.data?.caseTypes.find((item) => item.value === form.caseType),
    [form.caseType, metadataQuery.data?.caseTypes],
  );

  useEffect(() => {
    if (!form.priority && metadataQuery.data?.priorities?.length) {
      update('priority', metadataQuery.data.priorities[0]);
    }
  }, [form.priority, metadataQuery.data?.priorities]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<CustomerCase>) => caseApi.create(data),
    onSuccess: (created) => {
      toast.success(`Case ${created.caseNumber} created`);
      navigate(`/cases/${created.caseNumber}`);
    },
    onError: () => toast.error('Failed to create case'),
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <PageHeader title="New Case" subtitle="Create a new customer case or complaint" />
      <div className="page-container max-w-3xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              customerId: Number(form.customerId),
              customerName: form.customerName,
              caseType: form.caseType as CustomerCase['caseType'],
              subCategory: form.subCategory,
              priority: form.priority,
              subject: form.subject,
              description: form.description,
              assignedTo: form.assignedTo || undefined,
            });
          }}
          className="space-y-6"
        >
          <FormSection title="Customer">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Customer ID</label>
                <input value={form.customerId} onChange={(e) => update('customerId', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Search customer..." required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Customer Name</label>
                <input value={form.customerName} onChange={(e) => update('customerName', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required />
              </div>
            </div>
          </FormSection>

          <FormSection title="Case Details">
            {metadataQuery.isError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Case metadata could not be loaded from the backend.
              </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Case Type</label>
                <select value={form.caseType} onChange={(e) => { update('caseType', e.target.value); update('subCategory', ''); }} className="w-full px-3 py-2 border rounded-md text-sm" required disabled={metadataQuery.isLoading || metadataQuery.isError}>
                  <option value="">Select type...</option>
                  {metadataQuery.data?.caseTypes.map((caseType) => (
                    <option key={caseType.value} value={caseType.value}>{caseType.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Sub-Category</label>
                <select value={form.subCategory} onChange={(e) => update('subCategory', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" disabled={!selectedCaseType}>
                  <option value="">Select...</option>
                  {selectedCaseType?.subCategories.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => update('priority', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" disabled={metadataQuery.isLoading || metadataQuery.isError}>
                  <option value="">Select priority...</option>
                  {(metadataQuery.data?.priorities ?? []).map((priority) => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0) + priority.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Assign To (optional)</label>
                <input value={form.assignedTo} onChange={(e) => update('assignedTo', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Agent name or ID" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Subject</label>
              <input value={form.subject} onChange={(e) => update('subject', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={5} className="w-full px-3 py-2 border rounded-md text-sm" required />
            </div>
          </FormSection>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/cases')} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
