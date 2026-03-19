import { useState } from 'react';
import { CreditCard, Lock, Globe, ShoppingCart, Banknote, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatters';

interface CardData {
  id: number;
  type: 'DEBIT' | 'CREDIT';
  maskedPan: string;
  expiry: string;
  status: 'ACTIVE' | 'BLOCKED';
  onlineEnabled: boolean;
  internationalEnabled: boolean;
  dailyPosLimit: number;
  dailyAtmLimit: number;
  dailyOnlineLimit: number;
}

const mockCards: CardData[] = [
  { id: 1, type: 'DEBIT', maskedPan: '**** **** **** 4523', expiry: '12/28', status: 'ACTIVE', onlineEnabled: true, internationalEnabled: false, dailyPosLimit: 500000, dailyAtmLimit: 200000, dailyOnlineLimit: 300000 },
  { id: 2, type: 'CREDIT', maskedPan: '**** **** **** 8891', expiry: '06/27', status: 'ACTIVE', onlineEnabled: true, internationalEnabled: true, dailyPosLimit: 1000000, dailyAtmLimit: 500000, dailyOnlineLimit: 750000 },
];

export function PortalCardControlsPage() {
  const [cards, setCards] = useState(mockCards);
  const [selectedCard, setSelectedCard] = useState(cards[0]);

  const toggleFeature = (feature: 'onlineEnabled' | 'internationalEnabled') => {
    setCards((prev) => prev.map((c) => c.id === selectedCard.id ? { ...c, [feature]: !c[feature] } : c));
    setSelectedCard((prev) => ({ ...prev, [feature]: !prev[feature] }));
    toast.success(`${feature === 'onlineEnabled' ? 'Online transactions' : 'International transactions'} ${selectedCard[feature] ? 'disabled' : 'enabled'}`);
  };

  const blockCard = () => {
    setCards((prev) => prev.map((c) => c.id === selectedCard.id ? { ...c, status: 'BLOCKED' as const } : c));
    setSelectedCard((prev) => ({ ...prev, status: 'BLOCKED' as const }));
    toast.success('Card blocked successfully');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Card Controls</h1>

      {/* Card selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => setSelectedCard(card)}
            className={`text-left rounded-xl p-5 transition-colors ${selectedCard.id === card.id ? 'bg-gradient-to-br from-gray-900 to-gray-700 text-white' : 'border bg-card hover:bg-muted/50'}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5" />
              <span className="text-xs font-medium">{card.type} Card</span>
              {card.status === 'BLOCKED' && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">BLOCKED</span>}
            </div>
            <p className="font-mono text-sm tracking-wider">{card.maskedPan}</p>
            <p className="text-xs mt-1 opacity-70">Expires {card.expiry}</p>
          </button>
        ))}
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
          <button onClick={() => toggleFeature('onlineEnabled')} className={`w-12 h-6 rounded-full transition-colors relative ${selectedCard.onlineEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${selectedCard.onlineEnabled ? 'left-6' : 'left-0.5'}`} />
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
          <button onClick={() => toggleFeature('internationalEnabled')} className={`w-12 h-6 rounded-full transition-colors relative ${selectedCard.internationalEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${selectedCard.internationalEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Limits */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Transaction Limits</h3>
        <div className="space-y-3">
          {[
            { icon: ShoppingCart, label: 'Daily POS Limit', value: selectedCard.dailyPosLimit },
            { icon: Banknote, label: 'Daily ATM Limit', value: selectedCard.dailyAtmLimit },
            { icon: Globe, label: 'Daily Online Limit', value: selectedCard.dailyOnlineLimit },
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
      {selectedCard.status !== 'BLOCKED' && (
        <button onClick={blockCard} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
          <Lock className="w-4 h-4" /> Block Card Immediately
        </button>
      )}
    </div>
  );
}
