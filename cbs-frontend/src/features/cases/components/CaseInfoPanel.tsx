import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus, ArrowUpCircle, XCircle, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CasePriorityBadge } from './CasePriorityBadge';
import { SlaBadge } from './SlaBadge';
import { caseApi, type CustomerCase } from '../api/caseApi';

interface Props {
  caseData: CustomerCase;
}

type ActiveDialog = 'resolve' | 'assign' | 'escalate' | 'close' | null;

const RESOLUTION_TYPES = [
  { value: 'FULLY_RESOLVED', label: 'Fully Resolved' },
  { value: 'PARTIALLY_RESOLVED', label: 'Partially Resolved' },
  { value: 'WORKAROUND_PROVIDED', label: 'Workaround Provided' },
  { value: 'ESCALATED_TO_VENDOR', label: 'Escalated to Vendor' },
  { value: 'COMPENSATED', label: 'Customer Compensated' },
  { value: 'NO_FAULT_FOUND', label: 'No Fault Found' },
];

export function CaseInfoPanel({ caseData }: Props) {
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  // Assign state
  const [assignTo, setAssignTo] = useState(caseData.assignedTo ?? '');
  const [assignTeam, setAssignTeam] = useState(caseData.assignedTeam ?? '');

  // Escalate state
  const [escalateTo, setEscalateTo] = useState(caseData.escalatedTo ?? '');
  const [escalateReason, setEscalateReason] = useState('');

  // Resolve state
  const [resolutionType, setResolutionType] = useState('FULLY_RESOLVED');
  const [resolutionSummary, setResolutionSummary] = useState('');

  // Close state
  const [closeReason, setCloseReason] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cases'] });
  const close = () => setActiveDialog(null);

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      caseApi.update(caseData.caseNumber, { status: status as CustomerCase['status'] }),
    onSuccess: () => { toast.success('Status updated'); invalidate(); },
  });

  const assignMutation = useMutation({
    mutationFn: () => caseApi.assign(caseData.caseNumber, assignTo, assignTeam || undefined),
    onSuccess: () => { toast.success('Case assigned'); invalidate(); close(); },
    onError: () => toast.error('Failed to assign case'),
  });

  const escalateMutation = useMutation({
    mutationFn: () => caseApi.escalate(caseData.caseNumber, escalateTo, escalateReason),
    onSuccess: () => { toast.success('Case escalated'); invalidate(); close(); },
    onError: () => toast.error('Failed to escalate case'),
  });

  const resolveMutation = useMutation({
    mutationFn: () => caseApi.resolve(caseData.caseNumber, resolutionType, resolutionSummary),
    onSuccess: () => { toast.success('Case resolved'); invalidate(); close(); },
    onError: () => toast.error('Failed to resolve case'),
  });

  const closeMutation = useMutation({
    mutationFn: () => caseApi.close(caseData.caseNumber, closeReason || undefined),
    onSuccess: () => { toast.success('Case closed'); invalidate(); close(); },
    onError: () => toast.error('Failed to close case'),
  });

  const isTerminal = caseData.status === 'RESOLVED' || caseData.status === 'CLOSED';

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
          <option value="PENDING_INTERNAL">Pending Internal</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
          <option value="REOPENED">Reopened</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
        <CasePriorityBadge priority={caseData.priority} />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">SLA</label>
        <SlaBadge deadline={caseData.slaDueAt} breached={caseData.slaBreached} />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Assigned To</label>
        <p className="text-sm">{caseData.assignedToName || 'Unassigned'}</p>
        {caseData.assignedTeam && <p className="text-xs text-muted-foreground">{caseData.assignedTeam}</p>}
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

      {!isTerminal && (
        <>
          <hr />

          {/* Action buttons */}
          {activeDialog === null && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveDialog('assign')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-md text-sm hover:bg-muted"
              >
                <UserPlus className="w-3.5 h-3.5" /> Assign
              </button>
              <button
                onClick={() => setActiveDialog('escalate')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-amber-300 text-amber-700 rounded-md text-sm hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" /> Escalate
              </button>
              <button
                onClick={() => setActiveDialog('resolve')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
              </button>
              <button
                onClick={() => setActiveDialog('close')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-300 text-red-700 rounded-md text-sm hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <XCircle className="w-3.5 h-3.5" /> Close
              </button>
            </div>
          )}

          {/* Assign dialog */}
          {activeDialog === 'assign' && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assign Case</p>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Agent / User ID</label>
                <input
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  placeholder="Agent name or ID"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Team (optional)</label>
                <input
                  value={assignTeam}
                  onChange={(e) => setAssignTeam(e.target.value)}
                  placeholder="e.g. Fraud Operations"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={close} className="flex-1 px-3 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
                <button
                  onClick={() => assignMutation.mutate()}
                  disabled={!assignTo.trim() || assignMutation.isPending}
                  className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {assignMutation.isPending ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </div>
          )}

          {/* Escalate dialog */}
          {activeDialog === 'escalate' && (
            <div className="space-y-3 rounded-lg border border-amber-200 p-3 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Escalate Case</p>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Escalate To</label>
                <input
                  value={escalateTo}
                  onChange={(e) => setEscalateTo(e.target.value)}
                  placeholder="Manager name or team"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Reason</label>
                <textarea
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for escalation..."
                  className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={close} className="flex-1 px-3 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
                <button
                  onClick={() => escalateMutation.mutate()}
                  disabled={!escalateTo.trim() || !escalateReason.trim() || escalateMutation.isPending}
                  className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  {escalateMutation.isPending ? 'Escalating…' : 'Escalate'}
                </button>
              </div>
            </div>
          )}

          {/* Resolve dialog */}
          {activeDialog === 'resolve' && (
            <div className="space-y-3 rounded-lg border border-green-200 p-3 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Resolve Case</p>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Resolution Type</label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  {RESOLUTION_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Resolution Summary</label>
                <textarea
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  rows={3}
                  placeholder="Describe how the case was resolved..."
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={close} className="flex-1 px-3 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
                <button
                  onClick={() => resolveMutation.mutate()}
                  disabled={!resolutionSummary.trim() || resolveMutation.isPending}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {resolveMutation.isPending ? 'Resolving…' : 'Resolve'}
                </button>
              </div>
            </div>
          )}

          {/* Close dialog */}
          {activeDialog === 'close' && (
            <div className="space-y-3 rounded-lg border border-red-200 p-3 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">Close Case</p>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Reason (optional)</label>
                <textarea
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for closing..."
                  className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={close} className="flex-1 px-3 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
                <button
                  onClick={() => closeMutation.mutate()}
                  disabled={closeMutation.isPending}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {closeMutation.isPending ? 'Closing…' : 'Close Case'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
