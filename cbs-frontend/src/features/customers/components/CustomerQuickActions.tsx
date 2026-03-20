import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, HandCoins, CreditCard, MessageSquare, FileText, Pencil, MoreHorizontal } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';

interface CustomerQuickActionsProps {
  customerId: number;
}

export function CustomerQuickActions({ customerId }: CustomerQuickActionsProps) {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const canCreateAccount = usePermission('accounts', 'create');
  const canCreateLoan = usePermission('lending', 'create');
  const canCreateCard = usePermission('cards', 'create');
  const canCreateCase = usePermission('cases', 'create');
  const canSendComms = usePermission('communications', 'create');
  const canEditCustomer = usePermission('customers', 'update');

  const actions = [
    { label: 'Open Account', icon: Landmark, show: canCreateAccount, onClick: () => navigate(`/accounts/open?customerId=${customerId}`) },
    { label: 'Apply for Loan', icon: HandCoins, show: canCreateLoan, onClick: () => navigate(`/lending/applications/new?customerId=${customerId}`) },
    { label: 'Request Card', icon: CreditCard, show: canCreateCard, onClick: () => navigate(`/cards?action=request&customerId=${customerId}`) },
    { label: 'Send Message', icon: MessageSquare, show: canSendComms, onClick: () => navigate(`/communications?customerId=${customerId}`) },
    { label: 'Create Case', icon: FileText, show: canCreateCase, onClick: () => navigate(`/cases/new?customerId=${customerId}`) },
    { label: 'Edit Customer', icon: Pencil, show: canEditCustomer, onClick: () => navigate(`/customers/${customerId}/edit`) },
  ].filter((a) => a.show);

  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ label, icon: Icon, onClick }) => (
        <button key={label} type="button" onClick={onClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg bg-card hover:bg-muted transition-colors">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </button>
      ))}
      <div className="relative">
        <button type="button" onClick={() => setShowMore(!showMore)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg bg-card hover:bg-muted transition-colors text-muted-foreground">
          <MoreHorizontal className="h-3.5 w-3.5" /> More
        </button>
        {showMore && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMore(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border bg-card shadow-lg py-1">
              <button onClick={() => { setShowMore(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">Export Profile</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
