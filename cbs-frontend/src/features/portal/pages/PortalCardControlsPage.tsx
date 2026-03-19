import { useState } from 'react';
import { CreditCard, Lock, Globe, ShoppingCart, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatters';
import { cardApi } from '@/features/cards/api/cardApi';
import { useQuery } from '@tanstack/react-query';

export function PortalCardControlsPage() {
  const { data: apiCards = [] } = useQuery({ queryKey: ['portal-cards'], queryFn: () => cardApi.getCards() });

  // Map API cards to the shape needed for controls display
  const cards = apiCards.map((c) => ({
    id: c.id,
    type: c.cardType as 'DEBIT' | 'CREDIT',
    maskedPan: c.cardNumberMasked,
    expiry: c.expiryDate,
    status: c.status as 'ACTIVE' | 'BLOCKED',
    onlineEnabled: c.controls?.onlineEnabled ?? false,
    internationalEnabled: c.controls?.internationalEnabled ?? false,
    dailyPosLimit: 500000,
    dailyAtmLimit: 200000,
    dailyOnlineLimit: 300000,
  }));

  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [localControls, setLocalControls] = useState<Record<number, { onlineEnabled: boolean; internationalEnabled: boolean; status: string }>>({});

  const selectedCard = cards.find((c) => c.id === (selectedCardId ?? cards[0]?.id)) ?? cards[0];

  const getCardState = (card: typeof cards[0]) => ({
    ...card,
    ...(localControls[card.id] ?? {}),
  });

  const toggleFeature = (feature: 'onlineEnabled' | 'internationalEnabled') => {
    if (!selectedCard) return;
    const current = getCardState(selectedCard);
    setLocalControls((prev) => ({
      ...prev,
      [selectedCard.id]: { ...getCardState(selectedCard), [feature]: !current[feature] },
    }));
    toast.success(`${feature === 'onlineEnabled' ? 'Online transactions' : 'International transactions'} ${current[feature] ? 'disabled' : 'enabled'}`);
  };

  const blockCard = () => {
    if (!selectedCard) return;
    setLocalControls((prev) => ({
      ...prev,
      [selectedCard.id]: { ...getCardState(selectedCard), status: 'BLOCKED' },
    }));
    toast.success('Card blocked successfully');
  };

  if (!selectedCard) {
    return <div className="max-w-2xl mx-auto py-12 text-center text-muted-foreground">No cards found.</div>;
  }

  const activeCard = getCardState(selectedCard);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Card Controls</h1>

      {/* Card selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card) => {
          const state = getCardState(card);
          return (
            <button
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={`text-left rounded-xl p-5 transition-colors ${activeCard.id === card.id ? 'bg-gradient-to-br from-gray-900 to-gray-700 text-white' : 'border bg-card hover:bg-muted/50'}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5" />
                <span className="text-xs font-medium">{card.type} Card</span>
                {state.status === 'BLOCKED' && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">BLOCKED</span>}
              </div>
              <p className="font-mono text-sm tracking-wider">{card.maskedPan}</p>
              <p className="text-xs mt-1 opacity-70">Expires {card.expiry}</p>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="rounded-lg border bg-card divide-y">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Online Transactions</p>
              <p className="text-xs text-muted-foreground">Enable/disable online purchases</p>
            </div>
          </div>
          <button onClick={() => toggleFeature('onlineEnabled')} className={`w-12 h-6 rounded-full transition-colors relative ${activeCard.onlineEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${activeCard.onlineEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">International Transactions</p>
              <p className="text-xs text-muted-foreground">Allow transactions outside Nigeria</p>
            </div>
          </div>
          <button onClick={() => toggleFeature('internationalEnabled')} className={`w-12 h-6 rounded-full transition-colors relative ${activeCard.internationalEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${activeCard.internationalEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Limits */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Transaction Limits</h3>
        <div className="space-y-3">
          {[
            { icon: ShoppingCart, label: 'Daily POS Limit', value: activeCard.dailyPosLimit },
            { icon: Banknote, label: 'Daily ATM Limit', value: activeCard.dailyAtmLimit },
            { icon: Globe, label: 'Daily Online Limit', value: activeCard.dailyOnlineLimit },
          ].map((limit) => (
            <div key={limit.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <limit.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{limit.label}</span>
              </div>
              <span className="font-mono text-sm">{formatMoney(limit.value, 'NGN')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Block card */}
      {activeCard.status !== 'BLOCKED' && (
        <button onClick={blockCard} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
          <Lock className="w-4 h-4" /> Block Card Immediately
        </button>
      )}
    </div>
  );
}
