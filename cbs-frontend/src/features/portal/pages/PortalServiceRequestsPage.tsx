import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  User,
  X,
} from 'lucide-react';

import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';

import { PortalPageHero } from '../components/PortalPageHero';
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
    : requests.filter((request) => request.status === statusFilter);

  const statusCounts = {
    ALL: requests.length,
    PENDING: requests.filter((request) => request.status === 'PENDING').length,
    IN_PROGRESS: requests.filter((request) => request.status === 'IN_PROGRESS').length,
    COMPLETED: requests.filter((request) => request.status === 'COMPLETED').length,
  };

  return (
    <div className="portal-page-shell">
      <PortalPageHero
        icon={MessageSquare}
        eyebrow="Portal Support"
        title="Service Requests"
        description="Open new service cases, filter them by status, and review the operational trail without leaving the portal."
        chips={[
          statusFilter === 'ALL' ? 'All requests' : statusFilter.replace('_', ' '),
          selectedRequest ? `Viewing #${selectedRequest.id}` : 'Select a case for detail',
        ]}
        metrics={[
          { label: 'Total', value: String(statusCounts.ALL) },
          { label: 'Pending', value: String(statusCounts.PENDING), tone: statusCounts.PENDING > 0 ? 'warning' : 'default' },
          { label: 'Completed', value: String(statusCounts.COMPLETED), tone: statusCounts.COMPLETED > 0 ? 'positive' : 'default' },
        ]}
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        }
      />

      <section className="portal-panel p-5 space-y-5">
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="portal-filter-chip"
              data-active={statusFilter === status ? 'true' : 'false'}
            >
              {status === 'ALL' ? 'All' : status === 'IN_PROGRESS' ? 'In Progress' : status.charAt(0) + status.slice(1).toLowerCase()}
              {' '}({statusCounts[status]})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="portal-empty-state">
            <MessageSquare className="h-10 w-10 text-muted-foreground/35" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {statusFilter === 'ALL' ? 'No service requests yet' : `No ${statusFilter.toLowerCase().replace('_', ' ')} requests`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                New requests will appear here once they are submitted.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <button
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className="portal-panel p-4 text-left transition-colors hover:border-primary/25"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">{request.type}</h3>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={request.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(request.submittedAt)}
                  </span>
                  {request.assignedTo ? (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {request.assignedTo}
                    </span>
                  ) : null}
                  {request.resolvedAt ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Resolved {formatDate(request.resolvedAt)}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="portal-modal-shell max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Request Details</h3>
              <button onClick={() => setSelectedRequest(null)} className="portal-action-button px-3 py-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="portal-panel portal-panel-muted divide-y text-sm">
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Request ID</span>
                <span className="font-mono text-foreground">#{selectedRequest.id}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium text-foreground">{selectedRequest.type}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selectedRequest.status} />
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Submitted</span>
                <span className="text-foreground">{formatDateTime(selectedRequest.submittedAt)}</span>
              </div>
              {selectedRequest.assignedTo ? (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Assigned To</span>
                  <span className="text-foreground">{selectedRequest.assignedTo}</span>
                </div>
              ) : null}
              {selectedRequest.resolvedBy ? (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Resolved By</span>
                  <span className="text-foreground">{selectedRequest.resolvedBy}</span>
                </div>
              ) : null}
              {selectedRequest.resolvedAt ? (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Resolved At</span>
                  <span className="text-foreground">{formatDateTime(selectedRequest.resolvedAt)}</span>
                </div>
              ) : null}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
              <p className="rounded-[1rem] bg-muted/40 p-3 text-sm text-foreground">{selectedRequest.description}</p>
            </div>

            {selectedRequest.resolution ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Resolution</p>
                <p className="rounded-[1rem] bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-300">
                  {selectedRequest.resolution}
                </p>
              </div>
            ) : null}

            <button onClick={() => setSelectedRequest(null)} className="portal-action-button">
              Close
            </button>
          </div>
        </div>
      ) : null}

      {showNew ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="portal-modal-shell space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">New Service Request</h3>
              <button onClick={() => setShowNew(false)} className="portal-action-button px-3 py-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Request Type</label>
              <select
                value={newRequest.type}
                onChange={(event) => setNewRequest({ ...newRequest, type: event.target.value })}
                className="portal-inline-input"
              >
                <option value="">Select request type...</option>
                {requestTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={newRequest.description}
                onChange={(event) => setNewRequest({ ...newRequest, description: event.target.value })}
                rows={4}
                placeholder="Please describe your request in detail..."
                className="portal-inline-input"
              />
              <p className="text-xs text-muted-foreground">{newRequest.description.length}/1000 characters</p>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="portal-action-button">
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newRequest.type || !newRequest.description.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
