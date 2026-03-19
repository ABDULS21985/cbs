import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { portalApi } from '../api/portalApi';

export function PortalServiceRequestsPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newRequest, setNewRequest] = useState({ type: '', description: '' });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['portal', 'service-requests'],
    queryFn: () => portalApi.getServiceRequests(),
  });

  const { data: requestTypes = [] } = useQuery({
    queryKey: ['portal', 'request-types'],
    queryFn: () => portalApi.getRequestTypes(),
  });

  const createMutation = useMutation({
    mutationFn: () => portalApi.createServiceRequest(newRequest),
    onSuccess: () => { toast.success('Request submitted'); queryClient.invalidateQueries({ queryKey: ['portal', 'service-requests'] }); setShowNew(false); setNewRequest({ type: '', description: '' }); },
    onError: () => toast.error('Failed to submit request'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Service Requests</h1>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New Request</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No service requests</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-medium">{req.type}</h3><StatusBadge status={req.status} /></div>
              <p className="text-sm text-muted-foreground">{req.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Submitted {formatDate(req.submittedAt)}</span>
                {req.completedAt && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed {formatDate(req.completedAt)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            <h3 className="font-semibold">New Service Request</h3>
            <select value={newRequest.type} onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="">Select request type...</option>
              {requestTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <textarea value={newRequest.description} onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })} rows={3} placeholder="Describe your request..." className="w-full px-3 py-2 border rounded-md text-sm" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newRequest.type} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">{createMutation.isPending ? 'Submitting...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
