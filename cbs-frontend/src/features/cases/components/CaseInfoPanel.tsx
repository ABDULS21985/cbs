import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CasePriorityBadge } from './CasePriorityBadge';
import { SlaBadge } from './SlaBadge';
import { caseApi, type CustomerCase } from '../api/caseApi';

interface Props {
  caseData: CustomerCase;
}

export function CaseInfoPanel({ caseData }: Props) {
  const queryClient = useQueryClient();
  const [resolution, setResolution] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [showResolve, setShowResolve] = useState(false);

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: string }) => caseApi.update(caseData.caseNumber, { status: status as CustomerCase['status'] }),
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['cases'] }); },
  });

  const resolveMutation = useMutation({
    mutationFn: () => caseApi.resolve(caseData.caseNumber, resolution, rootCause),
    onSuccess: () => { toast.success('Case resolved'); queryClient.invalidateQueries({ queryKey: ['cases'] }); setShowResolve(false); },
  });

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
        <select
          value={caseData.status}
          onChange={(e) => statusMutation.mutate({ status: e.target.value })}
          className="w-full px-3 py-2 border rounded-md text-sm"
        >
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ESCALATED">Escalated</option>
          <option value="PENDING_CUSTOMER">Pending Customer</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
        <CasePriorityBadge priority={caseData.priority} />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">SLA</label>
        <SlaBadge deadline={caseData.slaDeadline} breached={caseData.slaBreached} />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Assigned To</label>
        <p className="text-sm">{caseData.assignedToName || 'Unassigned'}</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Type / Category</label>
        <p className="text-sm">{caseData.caseType.replace(/_/g, ' ')}</p>
        {caseData.subCategory && <p className="text-xs text-muted-foreground">{caseData.subCategory}</p>}
      </div>

      {caseData.compensationAmount != null && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Compensation</label>
          <p className="text-sm font-mono">₦{caseData.compensationAmount.toLocaleString()}</p>
          <StatusBadge status={caseData.compensationApproved ? 'APPROVED' : 'PENDING'} />
        </div>
      )}

      {caseData.relatedCaseIds && caseData.relatedCaseIds.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Related Cases</label>
          <div className="flex flex-wrap gap-1">
            {caseData.relatedCaseIds.map((id) => (
              <span key={id} className="px-2 py-0.5 bg-muted rounded text-xs font-mono">#{id}</span>
            ))}
          </div>
        </div>
      )}

      <hr />

      {!showResolve ? (
        <button onClick={() => setShowResolve(true)} className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">
          Resolve Case
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Root Cause</label>
            <select value={rootCause} onChange={(e) => setRootCause(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="">Select root cause...</option>
              <option value="PROCESS">Process</option>
              <option value="SYSTEM">System</option>
              <option value="PEOPLE">People</option>
              <option value="THIRD_PARTY">Third Party</option>
              <option value="POLICY">Policy</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Resolution</label>
            <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Describe the resolution..." />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowResolve(false)} className="flex-1 px-3 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
            <button onClick={() => resolveMutation.mutate()} disabled={!resolution.trim()} className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              Resolve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
