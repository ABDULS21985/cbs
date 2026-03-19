import { StatusBadge, EmptyState } from '@/components/shared';
import { useCustomerCards } from '../hooks/useCustomers';
import type { CustomerCard } from '../types/customer';
import { CreditCard } from 'lucide-react';

const SCHEME_GRADIENTS: Record<string, string> = {
  VISA: 'from-blue-700 to-blue-900',
  MASTERCARD: 'from-red-600 to-orange-600',
  VERVE: 'from-green-600 to-teal-700',
};

function CardVisual({ card }: { card: CustomerCard }) {
  const gradient = SCHEME_GRADIENTS[card.scheme] ?? 'from-gray-700 to-gray-900';
  return (
    <div
      className={`relative rounded-xl p-5 bg-gradient-to-br ${gradient} text-white shadow-lg`}
      style={{ width: 240, aspectRatio: '1.586' }}
    >
      <div className="absolute top-4 right-4 text-xs font-bold tracking-widest opacity-90">
        {card.scheme}
      </div>
      <div className="mt-8 font-mono text-base tracking-widest opacity-95">
        {card.maskedPan}
      </div>
      <div className="mt-3 flex justify-between items-end">
        <div>
          <div className="text-xs opacity-60">CARD TYPE</div>
          <div className="text-xs font-medium">{card.cardType}</div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-60">EXPIRES</div>
          <div className="text-xs font-medium">
            {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
          </div>
        </div>
      </div>
      <div className="absolute bottom-3 left-4">
        <StatusBadge status={card.status} size="sm" />
      </div>
    </div>
  );
}

export function CustomerCardsTab({ customerId }: { customerId: number }) {
  const { data: cards, isLoading } = useCustomerCards(customerId);

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ width: 240, height: 151 }} />
        ))}
      </div>
    );
  }

  if (!cards?.length) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No cards"
        description="No cards have been issued for this customer"
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {cards.map(card => (
        <CardVisual key={card.id} card={card} />
      ))}
    </div>
  );
}
