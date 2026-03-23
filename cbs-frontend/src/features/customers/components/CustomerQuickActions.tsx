import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, HandCoins, CreditCard, MessageSquare, FileText, Pencil, MoreHorizontal, StickyNote, ArrowRightLeft, MapPin, Phone, UserPlus } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { AddNoteDialog } from './AddNoteDialog';
import { AddAddressDialog } from './AddAddressDialog';
import { AddContactDialog } from './AddContactDialog';
import { AddRelationshipDialog } from './AddRelationshipDialog';
import { ChangeStatusDialog } from './ChangeStatusDialog';
import type { CustomerStatus } from '../types/customer';

interface CustomerQuickActionsProps {
  customerId: number;
  customerStatus?: CustomerStatus;
  customerName?: string;
}

export function CustomerQuickActions({ customerId, customerStatus, customerName }: CustomerQuickActionsProps) {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [activeDialog, setActiveDialog] = useState<'note' | 'address' | 'contact' | 'relationship' | 'status' | null>(null);
  const canCreateAccount = usePermission('accounts', 'create');
  const canCreateLoan = usePermission('lending', 'create');
  const canCreateCard = usePermission('cards', 'create');
  const canCreateCase = usePermission('cases', 'create');
  const canSendComms = usePermission('communications', 'create');
  const canEditCustomer = usePermission('customers', 'update');
  const canAdminCustomer = usePermission('customers', 'delete');
  const createCaseQuery = new URLSearchParams({
    customerId: String(customerId),
    ...(customerName ? { customerName } : {}),
  }).toString();

  const primaryActions = [
    { label: 'Open Account', icon: Landmark, show: canCreateAccount, onClick: () => navigate(`/accounts/open?customerId=${customerId}`) },
    { label: 'Apply for Loan', icon: HandCoins, show: canCreateLoan, onClick: () => navigate(`/lending/applications/new?customerId=${customerId}${customerName ? `&customerName=${encodeURIComponent(customerName)}` : ''}`) },
    { label: 'Request Card', icon: CreditCard, show: canCreateCard, onClick: () => navigate(`/cards?action=request&customerId=${customerId}`) },
    { label: 'Send Message', icon: MessageSquare, show: canSendComms, onClick: () => navigate(`/communications?customerId=${customerId}`) },
    { label: 'Create Case', icon: FileText, show: canCreateCase, onClick: () => navigate(`/cases/new?${createCaseQuery}`) },
    { label: 'Add Note', icon: StickyNote, show: canEditCustomer, onClick: () => setActiveDialog('note') },
  ].filter((a) => a.show);

  const moreActions = [
    { label: 'Add Address', icon: MapPin, show: canEditCustomer, onClick: () => { setShowMore(false); setActiveDialog('address'); } },
    { label: 'Add Contact', icon: Phone, show: canEditCustomer, onClick: () => { setShowMore(false); setActiveDialog('contact'); } },
    { label: 'Add Relationship', icon: UserPlus, show: canEditCustomer, onClick: () => { setShowMore(false); setActiveDialog('relationship'); } },
    { label: 'Change Status', icon: ArrowRightLeft, show: canAdminCustomer && !!customerStatus, onClick: () => { setShowMore(false); setActiveDialog('status'); } },
    { label: 'Edit Customer', icon: Pencil, show: canEditCustomer, onClick: () => { setShowMore(false); navigate(`/customers/${customerId}/edit`); } },
  ].filter((a) => a.show);

  if (!primaryActions.length && !moreActions.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {primaryActions.map(({ label, icon: Icon, onClick }) => (
          <button key={label} type="button" onClick={onClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg bg-card hover:bg-muted transition-colors">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            {label}
          </button>
        ))}
        {moreActions.length > 0 && (
          <div className="relative">
            <button type="button" onClick={() => setShowMore(!showMore)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg bg-card hover:bg-muted transition-colors text-muted-foreground">
              <MoreHorizontal className="h-3.5 w-3.5" /> More
            </button>
            {showMore && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMore(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-lg border bg-card shadow-lg py-1">
                  {moreActions.map(({ label, icon: Icon, onClick }) => (
                    <button key={label} onClick={onClick}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" /> {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {activeDialog === 'note' && (
        <AddNoteDialog customerId={customerId} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog === 'address' && (
        <AddAddressDialog customerId={customerId} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog === 'contact' && (
        <AddContactDialog customerId={customerId} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog === 'relationship' && (
        <AddRelationshipDialog customerId={customerId} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog === 'status' && customerStatus && (
        <ChangeStatusDialog
          customerId={customerId}
          currentStatus={customerStatus}
          customerName={customerName ?? ''}
          onClose={() => setActiveDialog(null)}
        />
      )}
    </>
  );
}
