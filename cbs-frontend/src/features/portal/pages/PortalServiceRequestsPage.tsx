import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, CheckCircle, Loader2, User, ChevronRight, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { portalApi, type PortalServiceRequest } from '../api/portalApi';

export function PortalServiceRequestsPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PortalServiceRequest | null>(null);
  const [newRequest, setNewRequest] = useState({ type: '', description: '' });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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
    onSuccess: () => {
      toast.success('Request submitted');
      queryClient.invalidateQueries({ queryKey: ['portal', 'service-requests'] });
      setShowNew(false);
      setNewRequest({ type: '', description: '' });
    },
    onError: () => toast.error('Failed to submit request'),
  });

  const filteredRequests = statusFilter === 'ALL'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const statusCounts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === 'PENDING').length,
    IN_PROGRESS: requests.filter(r => r.status === 'IN_PROGRESS').length,
    COMPLETED: requests.filter(r => r.status === 'COMPLETED').length,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Service Requests</h1>
        <button onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map(status => (
          <button key={status} onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}>
            {status === 'ALL' ? 'All' : status === 'IN_PROGRESS' ? 'In Progress' : status.charAt(0) + status.slice(1).toLowerCase()}
            {' '}({statusCounts[status]})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {statusFilter === 'ALL' ? 'No service requests yet' : `No ${statusFilter.toLowerCase().replace('_', ' ')} requests`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <button key={req.id} onClick={() => setSelectedRequest(req)}
              className="w-full text-left rounded-lg border bg-card p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">{req.type}</h3>
                <div className="flex items-center gap-2">
                  <StatusBadge status={req.status} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{req.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(req.submittedAt)}</span>
                {req.assignedTo && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {req.assignedTo}</span>}
                {req.resolvedAt && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Resolved {formatDate(req.resolvedAt)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Request Detail Drawer */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border shadow-xl max-w-md w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Request Details</h3>
              <button onClick={() => setSelectedRequest(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            <div className="rounded-lg border divide-y text-sm">
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">Request ID</span>
                <span className="font-mono">#{selectedRequest.id}</span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{selectedRequest.type}</span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selectedRequest.status} />
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">Submitted</span>
                <span>{formatDateTime(selectedRequest.submittedAt)}</span>
              </div>
              {selectedRequest.assignedTo && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">Assigned To</span>
                  <span>{selectedRequest.assignedTo}</span>
                </div>
              )}
              {selectedRequest.resolvedBy && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">Resolved By</span>
                  <span>{selectedRequest.resolvedBy}</span>
                </div>
              )}
              {selectedRequest.resolvedAt && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">Resolved At</span>
                  <span>{formatDateTime(selectedRequest.resolvedAt)}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-sm bg-muted/30 rounded-lg p-3">{selectedRequest.description}</p>
            </div>

            {selectedRequest.resolution && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Resolution</p>
                <p className="text-sm bg-green-50 dark:bg-green-900/10 rounded-lg p-3 text-green-800 dark:text-green-200">
                  {selectedRequest.resolution}
                </p>
              </div>
            )}

            <button onClick={() => setSelectedRequest(null)}
              className="w-full px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
              Close
            </button>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">New Service Request</h3>
              <button onClick={() => setShowNew(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Request Type</label>
              <select value={newRequest.type} onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select request type...</option>
                {requestTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea value={newRequest.description} onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                rows={4} placeholder="Please describe your request in detail..."
                className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <p className="text-xs text-muted-foreground">{newRequest.description.length}/1000 characters</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newRequest.type || !newRequest.description.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
