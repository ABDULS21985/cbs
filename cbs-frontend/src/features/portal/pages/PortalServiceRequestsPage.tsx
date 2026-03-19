import { useState } from 'react';
import { Plus, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';

interface ServiceRequest {
  id: number;
  type: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  submittedAt: string;
  completedAt?: string;
}

const mockRequests: ServiceRequest[] = [
  { id: 1, type: 'Cheque Book Request', description: '50 leaves cheque book', status: 'IN_PROGRESS', submittedAt: '2026-03-15' },
  { id: 2, type: 'Statement Request', description: 'Jan-Mar 2026 statement', status: 'COMPLETED', submittedAt: '2026-03-10', completedAt: '2026-03-11' },
  { id: 3, type: 'Card Replacement', description: 'Damaged debit card', status: 'PENDING', submittedAt: '2026-03-18' },
];

const requestTypes = ['Cheque Book Request', 'Statement Request', 'Card Replacement', 'Account Update', 'General Inquiry'];

export function PortalServiceRequestsPage() {
  const [requests] = useState(mockRequests);
  const [showNew, setShowNew] = useState(false);
  const [newRequest, setNewRequest] = useState({ type: '', description: '' });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Service Requests</h1>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">{req.type}</h3>
              <StatusBadge status={req.status} />
            </div>
            <p className="text-sm text-muted-foreground">{req.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Submitted {formatDate(req.submittedAt)}</span>
              {req.completedAt && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed {formatDate(req.completedAt)}</span>}
            </div>
          </div>
        ))}
      </div>

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
              <button onClick={() => { toast.success('Request submitted'); setShowNew(false); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
