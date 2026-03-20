import { useNavigate } from 'react-router-dom';
import { Target, Umbrella, Plane, Car } from 'lucide-react';

const SUGGESTIONS = [
  { icon: '🛡️', name: 'Emergency Fund', amount: 500000, Icon: Umbrella },
  { icon: '✈️', name: 'Vacation', amount: 200000, Icon: Plane },
  { icon: '🚗', name: 'New Car', amount: 5000000, Icon: Car },
];

export function GoalEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border bg-card p-12 text-center">
      {/* Illustration */}
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Target className="w-12 h-12 text-primary" />
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">Start saving towards your dreams</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        Create your first savings goal and watch your money grow. Set a target, choose your funding method, and track your progress.
      </p>

      <button
        onClick={() => navigate('/accounts/goals/new')}
        className="inline-flex items-center gap-2 btn-primary mb-8"
      >
        Create My First Goal
      </button>

      {/* Suggestions */}
      <div className="border-t pt-6">
        <p className="text-xs text-muted-foreground mb-4">Or start with a popular goal:</p>
        <div className="flex justify-center gap-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.name}
              onClick={() => navigate(`/accounts/goals/new?name=${encodeURIComponent(s.name)}&target=${s.amount}&icon=${encodeURIComponent(s.icon)}`)}
              className="rounded-xl border p-4 text-center hover:border-primary/30 hover:shadow-sm transition-all w-40"
            >
              <span className="text-2xl block mb-2">{s.icon}</span>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums mt-1">
                ₦{(s.amount / 1000).toFixed(0)}K
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
