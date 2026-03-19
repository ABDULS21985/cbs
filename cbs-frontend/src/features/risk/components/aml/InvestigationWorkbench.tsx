import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, AlertCircle, FileText, MessageSquare, Paperclip, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatMoney } from '@/lib/formatters';
import { useAmlAlert, useAssignAlert, useEscalateAlert, useDismissAlert } from '../../hooks/useAmlAlerts';
import { TransactionTimeline } from './TransactionTimeline';
import type { AmlCustomerProfile, AmlTransaction } from '../../types/aml';

interface Props {
  alertId: number;
  customerProfile?: AmlCustomerProfile;
  transactions?: AmlTransaction[];
  onFileStr?: () => void;
}

type DispositionType = 'dismiss' | 'escalate' | 'file_str' | 'close' | null;

interface DispositionModalProps {
  type: DispositionType;
  alertId: number;
  onClose: () => void;
  onFileStr?: () => void;
}

function DispositionModal({ type, alertId, onClose, onFileStr }: DispositionModalProps) {
  const [reason, setReason] = useState('');
  const dismiss = useDismissAlert();
  const escalate = useEscalateAlert();
  const navigate = useNavigate();

  if (!type) return null;

  const title =
    type === 'dismiss' ? 'Dismiss Alert' :
    type === 'escalate' ? 'Escalate Alert' :
    type === 'file_str' ? 'File Suspicious Transaction Report' :
    'Close Investigation';

  const handleSubmit = () => {
    if (type === 'dismiss') {
      dismiss.mutate({ id: alertId, reason }, { onSuccess: () => { onClose(); navigate('/risk/aml'); } });
    } else if (type === 'escalate') {
      escalate.mutate({ id: alertId, reason }, { onSuccess: onClose });
    } else if (type === 'file_str') {
      onFileStr?.();
      onClose();
    } else {
      onClose();
    }
  };

  const isPending = dismiss.isPending || escalate.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl border shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Justification / Notes</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Provide detailed justification..."
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || isPending}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
              type === 'dismiss' ? 'bg-red-600 text-white hover:bg-red-700' :
              type === 'escalate' ? 'bg-amber-500 text-white hover:bg-amber-600' :
              'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {isPending ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InvestigationWorkbench({ alertId, customerProfile, transactions = [], onFileStr }: Props) {
  const { data: alert, isLoading } = useAmlAlert(alertId);
  const assign = useAssignAlert();
  const [disposition, setDisposition] = useState<DispositionType>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 bg-muted rounded-lg" />
          <div className="h-40 bg-muted rounded-lg" />
        </div>
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-16 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!alert) return null;

  const riskBreakdown = [
    { factor: 'Transaction Amount', score: 30 },
    { factor: 'Customer Risk Profile', score: 25 },
    { factor: 'Jurisdiction Risk', score: 20 },
    { factor: 'Frequency Pattern', score: 15 },
    { factor: 'Account Age', score: 10 },
  ];

  return (
    <div className="space-y-4">
      {/* Top panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Profile */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Customer Profile</h4>
          </div>
          {customerProfile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">{customerProfile.name}</span>
                {customerProfile.pepFlag && (
                  <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3" /> PEP
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{customerProfile.customerNumber}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                <div>
                  <span className="text-muted-foreground">Segment:</span>{' '}
                  <span className="font-medium">{customerProfile.segment}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Risk Rating:</span>{' '}
                  <span className={cn(
                    'font-medium',
                    customerProfile.riskRating === 'CRITICAL' || customerProfile.riskRating === 'HIGH'
                      ? 'text-red-600' : customerProfile.riskRating === 'MEDIUM'
                      ? 'text-amber-600' : 'text-green-600',
                  )}>
                    {customerProfile.riskRating}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">KYC Status:</span>{' '}
                  <span className="font-medium">{customerProfile.kycStatus}</span>
                </div>
              </div>
              {customerProfile.accounts.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Accounts</p>
                  {customerProfile.accounts.map((acc) => (
                    <div key={acc.accountNumber} className="flex justify-between text-xs py-0.5">
                      <span className="font-mono">{acc.accountNumber}</span>
                      <span className="text-muted-foreground">{acc.type}</span>
                      <span>{formatMoney(acc.balance, acc.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-base font-semibold">{alert.customerName}</p>
              <p className="text-xs text-muted-foreground">{alert.customerNumber}</p>
            </div>
          )}
        </div>

        {/* Alert Detail */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Alert Detail</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Alert #</span>
              <span className="font-mono font-medium">{alert.alertNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rule Triggered</span>
              <span className="font-medium max-w-[60%] text-right">{alert.rule}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Alert Type</span>
              <span>{alert.alertType.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(alert.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">{formatMoney(alert.amount, alert.currency)}</span>
            </div>
            <div className="mt-3 pt-2 border-t">
              <p className="font-medium mb-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Risk Score Breakdown
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pb-1">Factor</th>
                    <th className="text-right pb-1">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {riskBreakdown.map((row) => (
                    <tr key={row.factor}>
                      <td className="py-0.5">{row.factor}</td>
                      <td className="text-right">{row.score}</td>
                    </tr>
                  ))}
                  <tr className="border-t font-semibold">
                    <td className="pt-1">Total Score</td>
                    <td className="text-right pt-1 text-red-600">{alert.riskScore}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Timeline */}
      <TransactionTimeline transactions={transactions} />

      {/* Investigation Actions */}
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />
              Add Note
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors">
              <Info className="w-3.5 h-3.5" />
              Request Info
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors">
              <Paperclip className="w-3.5 h-3.5" />
              Attach Doc
            </button>
            <button
              onClick={() => assign.mutate(alert.id)}
              disabled={assign.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              <User className="w-3.5 h-3.5" />
              {assign.isPending ? 'Assigning…' : 'Assign to Me'}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setDisposition('dismiss')}
              className="px-3 py-1.5 rounded-lg border text-sm text-red-700 hover:bg-red-50 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => setDisposition('escalate')}
              className="px-3 py-1.5 rounded-lg border text-sm text-amber-700 hover:bg-amber-50 transition-colors"
            >
              Escalate
            </button>
            <button
              onClick={() => setDisposition('file_str')}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              File STR
            </button>
            <button
              onClick={() => setDisposition('close')}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {disposition && (
        <DispositionModal
          type={disposition}
          alertId={alertId}
          onClose={() => setDisposition(null)}
          onFileStr={onFileStr}
        />
      )}
    </div>
  );
}
